---
hide:
  - toc
description: A custom integer square-root instruction for the CVE2 RISC-V core.
---

# Integer square root for CVE2

The `isqrt` instruction returns the largest integer whose square fits within a 32-bit unsigned input. For example, `isqrt(20) = 4` because 4² ≤ 20 < 5². The extension uses CVE2’s existing ALU and register writeback path.
{ .project-lead }

[Work through the arithmetic](arithmetic.md){ .md-button .md-button--primary }
[Compare FPGA results](results.md){ .md-button }

<dl class="project-metrics">
  <div><dt>Simulated cycles per root</dt><dd>247 → 23</dd></div>
  <div><dt>Integration checks passed</dt><dd>200,705</dd></div>
  <div><dt>Routed LUTs</dt><dd>2,987 → 4,205</dd></div>
</dl>

## From instruction to FPGA

The benchmark used about 10.7× fewer cycles with the custom instruction. On the FPGA, unrolling the 16 square-root steps increased routed LUT use by 40.8% and lengthened the critical path. The extended core’s worst register setup slack was **−29.556 ns** at the 20 ns target.

[![LUT counts and setup slack at synthesis and after routing for both core variants](assets/fpga-stages.svg)](assets/fpga-stages.svg)

Read the [instruction encoding and datapath](design.md), see the [writeback trace and test coverage](verification.md), or [reproduce the experiments](reproduce.md).
