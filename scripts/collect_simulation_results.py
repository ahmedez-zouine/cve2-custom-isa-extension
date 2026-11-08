#!/usr/bin/env python3
"""Build and run the CVE2 tests, then export checked evidence for paper figures."""
import argparse
import csv
from datetime import datetime, timezone
import hashlib
import json
import math
import os
from pathlib import Path
import re
import shutil
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[1]
BASE = "TOP.tb_top.u_core.u_cve2_top.u_cve2_core."
SIGNALS = {
    "clk": "clk_i", "valid": "instr_valid_id", "pc": "pc_id",
    "instruction": "instr_rdata_id", "operator": "alu_operator_ex",
    "operand_a": "alu_operand_a_ex", "result": "result_ex",
    "write_enable": "rf_we_wb", "write_register": "rf_waddr_wb",
    "write_data": "rf_wdata_wb", "ex_valid": "ex_valid",
    "illegal": "illegal_insn_id", "stall": "id_stage_i.stall_id",
    "registers": "register_file_i.rf_reg",
}


def require(condition, message):
    if not condition:
        raise ValueError(message)


def digest(path):
    with Path(path).open("rb") as stream:
        return hashlib.file_digest(stream, "sha256").hexdigest()


def source_hashes():
    paths = {ROOT / "Makefile", ROOT / "files.f"}
    for folder in ["cve2/rtl", "tb", "sw"]:
        paths.update(p for p in (ROOT / folder).rglob("*") if p.is_file())
    for line in (ROOT / "files.f").read_text().splitlines():
        line = line.strip()
        if line.startswith("+incdir+"):
            paths.update(p for p in (ROOT / line[8:]).rglob("*") if p.is_file())
        elif line and not line.startswith("//"):
            paths.add(ROOT / line)
    return {str(p.relative_to(ROOT)): digest(p) for p in sorted(paths)}


def read_vcd(path):
    scopes, codes, values, rows = [], {}, {}, []
    time, scale_ps = None, None
    units = {"s": 10**12, "ms": 10**9, "us": 10**6, "ns": 1000, "ps": 1}

    def snapshot():
        if time is None:
            return
        require(all(c in values for c in codes.values()), "Incomplete VCD initialization")
        rows.append({"time_ps": time * scale_ps,
                     **{name: values[c] for name, c in codes.items()}})

    with path.open() as stream:
        for line in stream:
            parts = line.split()
            if not parts:
                continue
            if parts[0] == "$timescale":
                declaration = line
                while "$end" not in declaration:
                    declaration += next(stream)
                match = re.search(r"(\d+)\s*(ms|us|ns|ps|s)\b", declaration)
                require(match is not None, "Unsupported VCD timescale")
                scale_ps = int(match[1]) * units[match[2]]
            elif parts[0] == "$scope":
                scopes.append(parts[2])
            elif parts[0] == "$upscope":
                scopes.pop()
            elif parts[0] == "$var":
                path_name = ".".join(scopes + [parts[4]])
                for name, suffix in SIGNALS.items():
                    if path_name == BASE + suffix:
                        codes[name] = parts[3]
            elif parts[0] == "$enddefinitions":
                break
        require(scale_ps is not None, "VCD timescale missing")
        require(codes.keys() == SIGNALS.keys(), "VCD signals missing: " + str(SIGNALS.keys() - codes.keys()))
        selected = set(codes.values())
        for line in stream:
            line = line.strip()
            if not line:
                continue
            if line.startswith("#"):
                snapshot()
                time = int(line[1:])
            elif line.startswith("b"):
                bits, code = line[1:].split()
                if code in selected:
                    require(not set(bits.lower()) - {"0", "1"}, "Unknown value in selected VCD signal")
                    values[code] = int(bits, 2)
            elif line[0] in "01xzXZ" and line[1:] in selected:
                require(line[0] in "01", "Unknown value in selected VCD signal")
                values[line[1:]] = int(line[0])
        snapshot()
    return rows


def extract_timing(vcd, csv_path, operand):
    rows = read_vcd(vcd)
    matches = [i for i, r in enumerate(rows) if r["valid"]
               and r["instruction"] & 0xfff0707f == 0x0b
               and (r["instruction"] >> 7) & 31
               and r["operand_a"] == operand]
    require(matches, f"No legal isqrt with input {operand} and nonzero rd in captured VCD")
    start = matches[0]
    first = rows[start]
    require(start > 0 and first["clk"] == 1 and rows[start - 1]["clk"] == 0,
            "Selected instruction did not enter ID/EX on a captured rising edge")
    rising = [i for i in range(start + 1, len(rows))
              if rows[i]["clk"] == 1 and rows[i - 1]["clk"] == 0]
    require(rising, "Writeback edge missing from VCD")
    end = rising[0]
    rd, rs1 = (first["instruction"] >> 7) & 31, (first["instruction"] >> 15) & 31
    expected = math.isqrt(operand)
    package = (ROOT / "cve2/rtl/cve2_pkg.sv").read_text()
    enum = re.search(r"typedef enum logic \[6:0\] \{([^}]+)\} alu_op_e;", package)
    require(enum is not None, "ALU enum not found")
    members = re.sub(r"//[^\n]*", "", enum[1]).split(",")
    require(all("=" not in m for m in members), "Explicit enum values require updated extraction")
    operator = [m.strip() for m in members].index("ALU_ISQRT")
    for row in rows[start:end]:
        for key, value in {"valid": 1, "instruction": first["instruction"], "pc": first["pc"],
                           "operator": operator, "operand_a": operand, "result": expected,
                           "write_enable": 1, "write_register": rd, "write_data": expected,
                           "ex_valid": 1, "illegal": 0, "stall": 0}.items():
            require(row[key] == value, f"Waveform check failed: {key} at {row['time_ps']} ps")
        source_value = (row["registers"] >> (32 * rs1)) & 0xffffffff
        require(source_value == operand, "Stored source does not match the operand")
    final_value = (rows[end]["registers"] >> (32 * rd)) & 0xffffffff
    require(final_value == expected, "Stored destination did not update at the next edge")
    window = []
    for row in rows[max(0, start - 2):end + 2]:
        r = dict(row)
        r["destination_value"] = (r.pop("registers") >> (32 * rd)) & 0xffffffff
        window.append(r)
    with csv_path.open("w", newline="") as stream:
        writer = csv.DictWriter(stream, fieldnames=list(window[0]))
        writer.writeheader()
        writer.writerows(window)
    return {"input": operand, "result": first["result"], "rs1": rs1, "rd": rd,
            "pc": first["pc"], "instruction": first["instruction"], "operator": operator,
            "entry_ps": first["time_ps"], "writeback_ps": rows[end]["time_ps"],
            "clock_period_ps": rows[end]["time_ps"] - first["time_ps"],
            "execution_clock_intervals": 1, "timescale": "ps",
            "scope": "One selected instruction in zero-delay RTL simulation, not FPGA timing"}


def parse_test_log(path, name):
    text = path.read_text()
    summary = re.search(re.escape(name) + r": PASS \((\d+) checks\)", text)
    cycles = re.search(r"\[tb\] (\d+) cycles", text)
    require(summary and cycles and "[tb] PASS (exit code 0)" in text,
            f"Missing successful test summary in {path}")
    require("MISMATCH" not in text and "[tb] FAIL" not in text, f"Failed test in {path}")
    result = {"checks": int(summary[1]), "total_simulation_cycles": int(cycles[1])}
    benchmark = re.search(r"(software|hardware): (\d+) cycles per square root \(checksum (\d+)\)", text)
    if benchmark:
        result.update(average_cycles_per_root=int(benchmark[2]), checksum=int(benchmark[3]),
                      average_scope="Integer-rounded workload average including loop and PRNG overhead")
    return result


def write_json(path, value):
    temporary = path.with_suffix(".pending.json")
    temporary.write_text(json.dumps(value, indent=2) + "\n")
    temporary.replace(path)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--riscv", default=os.environ.get("RISCV"))
    parser.add_argument("--out-dir", type=Path, default=ROOT / "build/figure_data")
    parser.add_argument("--operand", type=int, default=20)
    args = parser.parse_args()
    require(0 <= args.operand <= 0xffffffff, "Operand must be an unsigned 32-bit integer")
    prefix = args.riscv or next((p for p in ["riscv64-elf-", "riscv64-unknown-elf-"]
                                 if shutil.which(p + "gcc")), None)
    require(prefix is not None, "No RISC-V compiler found; pass --riscv TOOLCHAIN-PREFIX")
    output = args.out_dir.resolve()
    output.mkdir(parents=True, exist_ok=True)
    run = Path(tempfile.mkdtemp(prefix="run_", dir=output))
    manifest = {"schema": 1, "status": "running", "started_utc": datetime.now(timezone.utc).isoformat(),
                "run_directory": run.name, "commands": [], "tests": {}, "artifacts": {}}
    manifest["collector_sha256"] = digest(Path(__file__))
    result_path = output / "results.json"
    write_json(result_path, manifest)

    def execute(command, logfile):
        print("Running:", " ".join(command), flush=True)
        manifest["commands"].append(command)
        with logfile.open("w") as stream:
            subprocess.run(command, cwd=ROOT, stdout=stream, stderr=subprocess.STDOUT,
                           check=True, timeout=300)

    def artifact(name, path):
        manifest["artifacts"][name] = {"path": str(path.relative_to(output)), "sha256": digest(path)}

    try:
        manifest["source_sha256"] = source_hashes()
        manifest["git_revision"] = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=ROOT, text=True).strip()
        manifest["versions"] = {
            "verilator": subprocess.check_output(["verilator", "--version"], text=True).strip(),
            "gcc": subprocess.check_output([prefix + "gcc", "--version"], text=True).splitlines()[0],
        }
        names = ["sw_isqrt", "hw_isqrt", "isqrt_corners"]
        execute(["make", "-B", f"RISCV={prefix}", "build/sim/Vtb_top",
                 *[f"build/{name}.hex" for name in names]], run / "build.log")
        artifact("build_log", run / "build.log")
        for name in names:
            log = run / f"{name}.log"
            command = [str(ROOT / "build/sim/Vtb_top"), f"+hex=build/{name}.hex",
                       f"+cve2_tracer_file_base={run / name}"]
            if name == "isqrt_corners":
                command.append(f"+waves={run / 'isqrt_corners.vcd'}")
            execute(command, log)
            manifest["tests"][name] = parse_test_log(log, name)
            artifact(name + "_log", log)
        sw, hw = manifest["tests"]["sw_isqrt"], manifest["tests"]["hw_isqrt"]
        require("checksum" in sw and "checksum" in hw and sw["checksum"] == hw["checksum"],
                "Missing or mismatched benchmark checksums")
        vcd, csv_path = run / "isqrt_corners.vcd", run / "writeback.csv"
        manifest["timing"] = extract_timing(vcd, csv_path, args.operand)
        artifact("vcd", vcd)
        artifact("timing_csv", csv_path)
        with (run / "benchmarks.csv").open("w", newline="") as stream:
            writer = csv.writer(stream)
            writer.writerow(["test", "average_cycles_per_root", "checksum", "checks", "total_simulation_cycles"])
            for name in names[:2]:
                r = manifest["tests"][name]
                writer.writerow([name, r["average_cycles_per_root"], r["checksum"], r["checks"], r["total_simulation_cycles"]])
        artifact("benchmark_csv", run / "benchmarks.csv")
        require(manifest["source_sha256"] == source_hashes(), "Sources changed during the run; rerun collection")
        manifest["status"] = "passed"
    except Exception as error:
        manifest.update(status="failed", error=str(error))
        raise
    finally:
        manifest["finished_utc"] = datetime.now(timezone.utc).isoformat()
        write_json(run / "results.json", manifest)
        write_json(result_path, manifest)
    print(f"PASS: measured results saved to {result_path}")


if __name__ == "__main__":
    main()
