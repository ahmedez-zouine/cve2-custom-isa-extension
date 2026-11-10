#!/usr/bin/env python3
"""Prepare isolated baseline sources matching the saved extended FPGA run."""

import hashlib
import io
import json
from pathlib import Path
import subprocess
import tarfile
import tempfile

ROOT = Path(__file__).resolve().parents[1]
BASELINE_REVISION = "af1e7b4fcab772e1976f41f36b38ced25cb9f377"
REPLACEMENTS = (
    "cve2/rtl/cve2_pkg.sv",
    "cve2/rtl/cve2_decoder.sv",
    "cve2/rtl/cve2_alu.sv",
)
SOURCE_DIRS = (
    "cve2/rtl",
    "cve2/vendor/lowrisc_ip/ip/prim/rtl",
    "cve2/vendor/lowrisc_ip/dv/sv/dv_utils",
    "fpga",
)


def git(*args):
    return subprocess.check_output(["git", *args], cwd=ROOT)


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def verify_snapshot(directory, manifest, source_info):
    saved = json.loads((directory / "source_manifest.json").read_text())
    if saved != manifest or (directory / "source_info.txt").read_text() != source_info:
        raise ValueError("Existing baseline has different provenance; preserve and rename it first")
    for name, expected in manifest["file_sha256"].items():
        path = directory / name
        if not path.is_file() or digest(path) != expected:
            raise ValueError(f"Prepared baseline changed or is incomplete: {name}")


def main():
    evidence = ROOT / "output/fpga/extended/run_info.txt"
    fields = dict(line.split(": ", 1) for line in evidence.read_text().splitlines()
                  if ": " in line)
    reference = git("rev-parse", "--verify", fields["revision"] + "^{commit}").decode().strip()
    baseline = git("rev-parse", "--verify", BASELINE_REVISION + "^{commit}").decode().strip()
    changed = git("diff", "--name-only", baseline, reference, "--", "cve2").decode().splitlines()
    if set(changed) != set(REPLACEMENTS):
        raise ValueError("The two core revisions differ outside the expected three isqrt files")

    parent = ROOT / "build/fpga"
    parent.mkdir(parents=True, exist_ok=True)
    destination = parent / "baseline_src"
    with tempfile.TemporaryDirectory(prefix=".baseline-", dir=parent) as temporary:
        snapshot = Path(temporary) / "sources"
        snapshot.mkdir()
        archive = git("archive", "--format=tar", reference, *SOURCE_DIRS)
        with tarfile.open(fileobj=io.BytesIO(archive)) as stream:
            stream.extractall(snapshot, filter="data")
        for name in REPLACEMENTS:
            original = git("show", f"{baseline}:{name}")
            if b"ALU_ISQRT" in original or b"OPCODE_CUSTOM_0" in original:
                raise ValueError(f"Selected baseline still contains the extension: {name}")
            (snapshot / name).write_bytes(original)

        manifest = {
            "schema_version": 1,
            "variant": "baseline",
            "rtl_revision": baseline,
            "flow_reference_revision": reference,
            "replaced_files": list(REPLACEMENTS),
            "file_sha256": {
                str(path.relative_to(snapshot)): digest(path)
                for path in sorted(snapshot.rglob("*")) if path.is_file()
            },
        }
        source_info = (f"rtl_revision: {baseline}\n"
                       f"flow_reference_revision: {reference}\n"
                       "source_recipe: reference FPGA sources with three original RTL files\n")
        (snapshot / "source_manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
        (snapshot / "source_info.txt").write_text(source_info)
        if destination.exists():
            verify_snapshot(destination, manifest, source_info)
            print("Existing baseline verified; sources retained.")
        else:
            snapshot.rename(destination)
            print("Baseline source snapshot prepared.")

    print(f"Original RTL: {baseline}")
    print(f"Matching FPGA flow: {reference}")
    print(f"Sources: {destination}")
    print("Next: vivado -mode batch -source fpga/synth.tcl "
          "-tclargs xc7a35tcsg324-1 baseline")


if __name__ == "__main__":
    try:
        main()
    except (OSError, ValueError, KeyError, subprocess.CalledProcessError, tarfile.TarError) as error:
        raise SystemExit(f"Baseline preparation failed: {error}")
