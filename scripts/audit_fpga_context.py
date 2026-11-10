#!/usr/bin/env python3
"""Audit the recorded FPGA timing context, local checkpoints and Vivado logs."""

import argparse
from collections import Counter
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import platform
import re
import shutil

from summarize_fpga_implementation import ROOT, VARIANTS, constraint_commands, load_reports


def digest(path):
    value = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            value.update(block)
    return value.hexdigest()


def reviewed_data(directory):
    manifest = json.loads((directory / "review_manifest.json").read_text())
    if digest(ROOT / manifest["generator"]) != manifest["generator_sha256"]:
        raise ValueError("Review parser changed; regenerate the implementation review first")
    for key, base in (("source_file_sha256", directory), ("artifact_sha256", directory),
                      ("synthesis_reference_sha256", ROOT)):
        for name, expected in manifest[key].items():
            if digest(base / name) != expected:
                raise ValueError("Reviewed evidence changed: " + name)
    saved = json.loads((directory / "implementation_results.json").read_text())
    if saved != load_reports(directory):
        raise ValueError("Parsed reports differ from the saved review data")
    return saved


def checkpoint_info(path, expected=None):
    result = {"path": str(path), "expected_sha256": expected, "exists": path.is_file()}
    if not result["exists"]:
        result["status"] = "unavailable"
        return result
    result.update(sha256=digest(path), size_bytes=path.stat().st_size)
    result["status"] = ("matched" if result["sha256"] == expected else "mismatch") if expected else "fingerprinted_only"
    return result


def log_time(value):
    # These archived Ubuntu runs use UTC; a different timezone needs review.
    return datetime.strptime(value.strip(), "%a %b %d %H:%M:%S %Y").replace(tzinfo=timezone.utc)


def inspect_log(path, identity):
    text = path.read_text(errors="replace")
    expected_out = Path(identity["checkpoint"]).parent.parent / "implementation" / identity["variant"]
    reasons = []
    if not re.search(r"^Implementation reports written to " + re.escape(str(expected_out)) + r"\s*$", text, re.MULTILINE):
        reasons.append("no standalone completion line for the recorded output directory")
    if not re.search(r"^# Vivado v" + re.escape(identity["tool"]) + r" \(64-bit\)", text, re.MULTILINE):
        reasons.append("tool header mismatch")
    command = re.search(r"^# Command line\s*:\s*(.+)$", text, re.MULTILINE)
    if not command or not re.search(r"-source\s+fpga/implement\.tcl(?:\s|$)", command.group(1)) or not re.search(
            r"-tclargs\s+" + re.escape(identity["variant"]) + r"(?:\s|$)", command.group(1)):
        reasons.append("implementation command or variant mismatch")
    start = re.search(r"^# Start of session at:\s*(.+)$", text, re.MULTILINE)
    finishes = re.findall(r"^INFO: \[Common 17-206\] Exiting Vivado at (.+?)\.\.\.", text, re.MULTILINE)
    try:
        recorded_start = datetime.fromisoformat(identity["started_utc"].replace("Z", "+00:00"))
        recorded_finish = datetime.fromisoformat(identity["finished_utc"].replace("Z", "+00:00"))
        if not start or abs((log_time(start.group(1)) - recorded_start).total_seconds()) > 30:
            reasons.append("session start does not match the recorded run")
        if not finishes or abs((log_time(finishes[-1]) - recorded_finish).total_seconds()) > 10:
            reasons.append("session finish does not match the recorded run")
    except ValueError:
        reasons.append("unrecognized log or metadata timestamp")
    if re.search(r"^ERROR:", text, re.MULTILINE):
        reasons.append("log contains an error-level message")
    warnings = Counter(re.findall(r"^WARNING: \[([^\]]+)\]", text, re.MULTILINE))
    return {"path": str(path), "sha256": digest(path), "matches_recorded_run": not reasons,
            "rejection_reasons": reasons, "warning_counts": dict(sorted(warnings.items())),
            "timestamp_assumption": "UTC, matching the recorded Ubuntu runs"}


def log_candidates(root, directory, variant):
    folders = (root, root / "build/fpga/implementation" / variant, directory / variant)
    return sorted({path.resolve() for folder in folders for path in folder.glob("vivado*.log") if path.is_file()})


def audit(root, directory, out):
    data = reviewed_data(directory)
    out.mkdir(parents=True, exist_ok=True)
    result = {"schema_version": 1, "created_utc": datetime.now(timezone.utc).isoformat(),
              "execution_host": platform.node(), "execution_system": platform.system(),
              "generator_sha256": digest(Path(__file__)),
              "review_manifest_sha256": digest(directory / "review_manifest.json"),
              "evaluation_scope": "Retain the recorded exploratory OOC comparison and report worst slack",
              "physical_timing_context_complete": False, "runs": {},
              "limitations": ["External clock-source and physical interface context remain incomplete",
                              "Constraints 18-8777 root cause and effect are unresolved",
                              "No complete timing closure, implemented Fmax or board operation is established"]}
    for variant in VARIANTS:
        run = data["runs"][variant]
        identity = run["identity"]
        xdc = directory / variant / "implemented_constraints.xdc"
        commands = constraint_commands(xdc.read_text())
        logs = [inspect_log(path, identity) for path in log_candidates(root, directory, variant)]
        recovered = []
        seen = set()
        for record in logs:
            if not record["matches_recorded_run"] or record["sha256"] in seen:
                continue
            seen.add(record["sha256"])
            target = out / "recovered_logs" / f"{variant}_{record['sha256'][:12]}.log"
            target.parent.mkdir(parents=True, exist_ok=True)
            if target.exists() and digest(target) != record["sha256"]:
                raise ValueError("Existing recovered log changed: " + str(target))
            shutil.copyfile(record["path"], target)
            if digest(target) != record["sha256"]:
                raise ValueError("Recovered log copy hash mismatch")
            recovered.append({"source_path": record["path"], "copy": str(target.relative_to(out)), "sha256": record["sha256"]})
        result["runs"][variant] = {
            "part": identity["part"], "clock_period_ns": float(identity["clock_period_ns"]),
            "constraint_commands": commands, "constraint_file_sha256": digest(xdc),
            "hd_clk_src": identity.get("hd_clk_src", ""),
            "partition_pin_constraints_present": any("HD.PARTPIN_" in line for line in commands),
            "synthesis_checkpoint": checkpoint_info(root / "build/fpga" / variant / "post_synth.dcp", identity["checkpoint_sha256"]),
            "routed_checkpoint": checkpoint_info(root / "build/fpga/implementation" / variant / "post_route.dcp"),
            "overall_setup_slack_ns": run["timing"]["wns_ns"],
            "register_setup_slack_ns": run["register_setup_paths"][0]["slack_ns"],
            "hold_slack_ns": run["timing"]["whs_ns"],
            "examined_logs": logs, "matched_completed_logs": recovered}
    mismatch = any(run["synthesis_checkpoint"]["status"] == "mismatch" for run in result["runs"].values())
    available = all(run["synthesis_checkpoint"]["status"] == "matched" and run["routed_checkpoint"]["exists"]
                    for run in result["runs"].values())
    result["checkpoint_audit_status"] = "mismatch" if mismatch else "inputs_matched_routes_fingerprinted" if available else "incomplete_files_unavailable"
    result["routed_checkpoint_identity_note"] = "Routed hashes fingerprint current files; archived routed hashes are unavailable for comparison. Verify design identity in Vivado before power analysis."
    (out / "audit.json").write_text(json.dumps(result, indent=2) + "\n")
    lines = ["FPGA timing-context and provenance audit", "", "Checkpoint audit: " + result["checkpoint_audit_status"],
             "Scope: exploratory OOC analysis; physical timing context remains incomplete.", ""]
    for variant, run in result["runs"].items():
        lines.extend([variant + ":", "  Synthesis checkpoint: " + run["synthesis_checkpoint"]["status"],
                      "  Routed checkpoint: " + run["routed_checkpoint"]["status"],
                      "  Matching completed log copies: " + str(len(run["matched_completed_logs"])),
                      f"  Overall/register setup: {run['overall_setup_slack_ns']:+.3f} / {run['register_setup_slack_ns']:+.3f} ns",
                      ""])
    lines.extend(["No RTL, constraints, checkpoints or existing report archive files were changed.",
                  "Review audit.json and recovered_logs before adopting recovered evidence.",
                  "A matched checkpoint hash does not imply passing timing."])
    (out / "summary.txt").write_text("\n".join(lines) + "\n")
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out-dir", type=Path, default=ROOT / "build/fpga/context_audit")
    args = parser.parse_args()
    result = audit(ROOT, ROOT / "output/fpga/implementation", args.out_dir)
    print((args.out_dir / "summary.txt").read_text(), end="")
    print("Audit written to " + str(args.out_dir))
    if result["checkpoint_audit_status"] == "mismatch":
        parser.exit(1, "Checkpoint mismatch: stop and review the current VM inputs before further analysis.\n")


if __name__ == "__main__":
    main()
