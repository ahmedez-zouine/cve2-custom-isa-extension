"""Snapshot only the repository evidence used on screen; never change source files."""
from pathlib import Path
import csv, hashlib, json, subprocess

HERE = Path(__file__).resolve().parents[1]
ROOT = HERE.parent
paths = [
    "README.md", "cve2/rtl/cve2_alu.sv", "cve2/rtl/cve2_decoder.sv",
    "cve2/rtl/cve2_ex_block.sv", "cve2/rtl/cve2_core.sv", "tb/tb_top.sv",
    "output/verification/submission_review/writeback.csv",
    "output/verification/submission_review/integration.log",
    "output/verification/submission_review/corners.log",
    "output/verification/submission_review/supplied.log",
    "output/verification/submission_review/manifest.json",
    "output/fpga/implementation/baseline/utilization.rpt",
    "output/fpga/implementation/extended/utilization.rpt",
    "output/fpga/implementation/baseline/timing_summary.rpt",
    "output/fpga/implementation/extended/timing_summary.rpt",
    "output/fpga/implementation/extended/register_setup_paths.rpt",
    "output/fpga/implementation/baseline/route_status.rpt",
    "output/fpga/implementation/extended/route_status.rpt",
]
texts = {p: (ROOT / p).read_text() for p in paths}
alu = texts[paths[1]].splitlines()
decoder = texts[paths[2]].splitlines()
def excerpt(lines, start, end):
    i = next(i for i, l in enumerate(lines) if start in l)
    j = next(j for j in range(i, len(lines)) if end in lines[j])
    return {"firstLine": i + 1, "code": "\n".join(lines[i:j+1])}
loop = excerpt(alu, "for (int i = 0; i < 16; i++)", "sq_root = sq_root |")
decode = excerpt(decoder, "OPCODE_CUSTOM_0: begin // Unsigned", "illegal_insn = 1'b1;")
select = excerpt(alu, "ALU_ISQRT: result_o", "ALU_ISQRT: result_o")
trace = list(csv.DictReader(texts[paths[6]].splitlines()))
assert any(int(r["operand_a"]) == 20 and int(r["result"]) == 4 and int(r["operator"]) == 65 for r in trace)
assert "PASS (200705 checks)" in texts[paths[7]]
assert "43" in texts[paths[8]] and "PASS" in texts[paths[8]]
for variant, lut, wns in [("baseline", "2987", "-0.884"), ("extended", "4205", "-29.556")]:
    assert lut in texts[f"output/fpga/implementation/{variant}/utilization.rpt"]
    assert wns in texts[f"output/fpga/implementation/{variant}/timing_summary.rpt"]
def recurrence(n):
    q, r, rows = 0, 0, []
    for k in range(16):
        pair = (n >> (30 - 2*k)) & 3
        t, d = 4*r + pair, 4*q + 1
        q, r = (2*q+1, t-d) if t >= d else (2*q, t)
        rows.append(dict(step=k+1, pair=pair, trial=d, candidate=t, root=q, remainder=r))
    assert q*q <= n < (q+1)*(q+1)
    return rows
for n in [0, 1, 2, 3, 4, 20, 144, 65535, 65536, 0xffffffff]:
    recurrence(n)
data = {
    "revision": subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=ROOT, text=True).strip(),
    "sources": [{"path": p, "sha256": hashlib.sha256((ROOT/p).read_bytes()).hexdigest()} for p in paths],
    "snippets": {"decoder": decode, "loop": loop, "selection": select},
    "workedExample": {"input": 144, "result": 12, "steps": recurrence(144), "kind": "Calculated from RTL recurrence; not a measured waveform"},
    "trace": [{k: int(v) for k, v in r.items()} for r in trace],
    "verification": {"corners": 43, "integration": 200705},
    "fpga": {"part": "xc7a35tcsg324-1", "periodNs": 20, "baselineLuts": 2987, "extendedLuts": 4205, "baselineWns": -0.884, "extendedWns": -29.556},
    "limitations": ["Exploratory out-of-context FPGA analysis", "External clock context and interface routing incomplete", "Neither implementation meets overall timing at the 20 ns target", "RTL simulation latency is not achieved FPGA frequency", "Worked example animation is not a physical propagation measurement"]
}
(HERE / "src/data/evidence.json").write_text(json.dumps(data, indent=2) + "\n")
print(f"Validated and snapshotted {len(paths)} sources; recurrence checks passed.")
