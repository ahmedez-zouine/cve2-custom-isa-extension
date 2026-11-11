---
hide:
  - toc
description: A custom integer square-root instruction for the CVE2 RISC-V processor, with its design, verification and Artix-7 results.
---

# An integer square root, built into CVE2

The custom `isqrt rd, rs1` instruction computes the floor of the square root of a 32-bit unsigned integer. For example, `isqrt(20) = 4`: 4² ≤ 20 < 5². The processor writes the result to `rd` through its existing register writeback path.
{ .project-lead }

[Explore the instruction design](design.md){ .md-button .md-button--primary }
[See the experimental results](results.md){ .md-button }

## Project at a glance

|  | Software reference | Custom instruction |
| --- | ---: | ---: |
| Average cycles per result | 247 | **23** |
| Routed lookup tables | 2,987 | **4,205** |
| Integration checks passed | — | **200,705** |

The cycle comparison uses the same 256 inputs and produces checksum 10,996,072 for both implementations. Its printed averages are rounded. The custom instruction used about 10.7 times fewer cycles on that simulation workload, with a 40.8% increase in routed lookup tables.

## What happens when the instruction runs

The decoder recognizes the custom instruction and selects the existing arithmetic logic unit. That unit applies a restoring square-root recurrence to the operand, consuming two input bits per step. Sixteen steps produce the 16-bit integer root. The result uses CVE2’s ordinary writeback path, so dependent instructions can read it as soon as it is written.

[![Instruction flow through fetch, decode, the ALU and register writeback](assets/pipeline.svg)](assets/pipeline.svg)

[The arithmetic guide](arithmetic.md) derives the recurrence and works through the input 20. [Verification](verification.md) covers the test programs, boundary values, illegal encodings and writeback.

## What the FPGA results show

The original and extended cores use the same Artix-7 device, Vivado version and 20 ns clock target. Routed lookup-table use rose from 2,987 to 4,205. The extended design’s worst register setup slack was −29.556 ns, so this run did not meet its target. The routed out-of-context results provide an area and timing comparison, while board-level clock and interface context remain incomplete.

[![Routed lookup-table counts and overall setup slack for both cores, at synthesis and after routing](assets/fpga-stages.svg)](assets/fpga-stages.svg)

The FPGA measurements describe a physical implementation estimate. The cycle counts describe a simulation workload. They are separate results, and the cycle ratio does not predict a clock-frequency improvement. [Review timing, resources and power](results.md), or follow the [installation and reproduction steps](reproduce.md).

## Follow the implementation

<nav class="project-card-grid" aria-label="Project guides">
  <a class="project-card" href="design/">
    <strong>Instruction design</strong><span class="project-card-number">01</span>
    <span>Encoding, decoding, ALU selection and writeback</span>
  </a>
  <a class="project-card" href="arithmetic/">
    <strong>Arithmetic</strong><span class="project-card-number">02</span>
    <span>The recurrence, worked example and input explorer</span>
  </a>
  <a class="project-card" href="verification/">
    <strong>Verification</strong><span class="project-card-number">03</span>
    <span>Test coverage, instruction dependencies and waveform</span>
  </a>
  <a class="project-card" href="results/">
    <strong>FPGA results</strong><span class="project-card-number">04</span>
    <span>Routed resources, timing and power estimates</span>
  </a>
  <a class="project-card" href="reproduce/">
    <strong>Installation</strong><span class="project-card-number">05</span>
    <span>Set up the tools and run the experiments</span>
  </a>
</nav>
