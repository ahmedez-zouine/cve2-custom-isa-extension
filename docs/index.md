---
hide:
  - toc
description: "Hardware integer square-root extension for the CVE2 RISC-V core: RTL design, verification, and Artix-7 FPGA results."
---

<div class="project-badge">RISC-V Custom-0 ISA Extension • CVE2 Core</div>

# Hardware Integer Square Root for CVE2

The custom `isqrt rd, rs1` instruction calculates the floor of the square root of an unsigned 32-bit integer in hardware ($\lfloor\sqrt{n}\rfloor$). By unrolling a 16-step restoring square-root recurrence directly inside the CVE2 ALU, root operations complete in a single execution cycle—slashing execution time from an average of 247 software cycles to **23 cycles** (a **10.7× speedup**).
{ .project-lead }

<div class="project-cta-group">
  <a class="md-button md-button--primary" href="#technical-report">
    <svg class="btn-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
    Read Technical Report
  </a>
  <a class="md-button" href="design/">
    <svg class="btn-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>
    Core Architecture
  </a>
  <a class="md-button" href="results/">
    <svg class="btn-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
    FPGA Results
  </a>
  <a class="md-button" href="https://github.com/ahmedez-zouine/cve2-custom-isa-extension" target="_blank" rel="noopener">
    <svg class="btn-icon" viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/></svg>
    GitHub
  </a>
</div>

<div class="project-metrics">
  <div>
    <dt>Benchmark Latency</dt>
    <dd>23 cycles</dd>
    <span>10.7× faster than the 247-cycle software reference</span>
  </div>
  <div>
    <dt>RTL ALU Execution</dt>
    <dd>1 cycle</dd>
    <span>Unrolled 16-step restoring square-root datapath</span>
  </div>
  <div>
    <dt>Integration Checks</dt>
    <dd>200,705 checks</dd>
    <span>100% passing across corners and square boundaries</span>
  </div>
  <div>
    <dt>Artix-7 Area</dt>
    <dd>4,205 LUTs</dd>
    <span>Routed logic overhead (+40.8% over baseline core)</span>
  </div>
</div>

[![CVE2 datapath showing ISQRT integrated into the existing decoder, ALU and register writeback path](assets/pipeline.png)](assets/pipeline.svg)

## Measured comparison { .project-section }

| Evaluation Metric | Software Reference | Custom Instruction (`isqrt`) | Relative Delta |
| --- | ---: | ---: | ---: |
| **Average cycles per root** | 247 | **23** | **−90.7% (10.7× speedup)** |
| **RTL execution latency** | Multi-instruction loop | **1 cycle** | Single-cycle ALU path |
| **Synthesized LUTs** | 3,034 | **4,178** | +1,144 LUTs (+37.7%) |
| **Routed LUTs (Artix-7)** | 2,987 | **4,205** | +1,218 LUTs (+40.8%) |
| **Routed flip-flops** | 1,961 | **1,965** | +4 FFs (+0.2%) |
| **DSP blocks** | 1 | **1** | Identical (0 DSP overhead) |
| **Block RAM (RAMB36 / 18)** | 0 / 0 | **0 / 0** | Zero BRAM utilization |
| **Integration verification** | — | **200,705 passed** | Full coverage (checksum: 10,996,072) |

Both software and hardware implementations processed the identical 256-input benchmark array and produced the matching checksum of 10,996,072. The custom instruction eliminates register spilling, branching, and iterative shifts from the software routine, reducing root calculation to a single instruction retirement.

## Core pipeline integration { .project-section }

The decoder identifies the custom-0 opcode (`0x0b`) when its reserved fields (`funct7`, `rs2`, `funct3`) are zero. The existing register file reads `rs1`, and the decode stage activates `ALU_ISQRT`. Within the execution stage, the ALU feeds the 32-bit operand through sixteen restoring stages in a single combinational pass. The resulting 16-bit root is zero-extended to 32 bits and returned through the standard writeback multiplexer into `rd`.

<figure class="project-figure">
  <a href="assets/cve2-core-blockdiagram.svg" aria-label="Open the full-size CVE2 core block diagram">
    <img src="assets/cve2-core-blockdiagram.svg" alt="Block diagram of the CVE2 core, including fetch, decode, register file, ALU, load-store unit, and memory interfaces">
  </a>
  <figcaption><strong>Figure 1:</strong> Full CVE2 core context. ISQRT is embedded directly inside the ALU datapath, utilizing existing operand buses, register file read ports, and writeback multiplexing without requiring extra ports.</figcaption>
</figure>

## FPGA area and timing analysis { .project-section }

Both the baseline and extended cores were synthesized and routed out of context for the AMD Xilinx Artix-7 `xc7a35tcsg324-1` FPGA using Vivado 2024.2 with a 20 ns (50 MHz) clock constraint.

[![Routed lookup-table counts and overall setup slack for both cores, at synthesis and after routing](assets/fpga-stages.svg)](assets/fpga-stages.svg)

Unrolling sixteen restoring subtraction stages without pipeline registers produces a combinational path of 49.387 ns. Consequently, the routed extended design reports a worst register setup slack of **−29.556 ns** at 50 MHz. See the [physical implementation review](results.md) for full timing reports and the [architectural trade-offs](alternatives.md) for an iterative multicycle alternative.

## Technical report { .project-section #technical-report }

<div class="paper-card">
  <div class="paper-header">
    <div class="paper-meta">
      <h3 class="paper-title">An integer square-root instruction for CVE2</h3>
      <p class="paper-subtitle">RISC-V Extension Technical Report: Architecture, Verification and FPGA Evaluation</p>
      <div class="paper-author-row">
        <span class="paper-tag paper-tag--author">Ahmed Ez-Zouine</span>
        <span class="paper-tag">6 Pages (A4)</span>
        <span class="paper-tag">Single Column</span>
        <span class="paper-tag">PDF 505 KB</span>
        <span class="paper-tag">Author Edition</span>
      </div>
    </div>
    <div class="paper-actions">
      <a class="md-button md-button--primary" href="assets/Ez-Zouine_CVE2_ISQRT_Technical_Report.pdf" download="Ez-Zouine_CVE2_ISQRT_Technical_Report.pdf">
        <svg class="btn-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        Download PDF (505 KB)
      </a>
      <a class="md-button" href="assets/Ez-Zouine_CVE2_ISQRT_Technical_Report.pdf" target="_blank" rel="noopener">
        <svg class="btn-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
        Open in New Tab
      </a>
    </div>
  </div>

  <div class="paper-viewer-wrapper">
    <div class="paper-viewer-bar">
      <div class="paper-window-controls" aria-hidden="true">
        <span class="dot dot--red"></span>
        <span class="dot dot--yellow"></span>
        <span class="dot dot--green"></span>
      </div>
      <span class="paper-file-label">Ez-Zouine_CVE2_ISQRT_Technical_Report.pdf</span>
      <a class="paper-direct-link" href="assets/Ez-Zouine_CVE2_ISQRT_Technical_Report.pdf" target="_blank" rel="noopener" aria-label="Open PDF in new window">Fullscreen ↗</a>
    </div>
    <div class="paper-viewer">
      <iframe class="paper-frame" src="assets/Ez-Zouine_CVE2_ISQRT_Technical_Report.pdf#view=FitH" title="CVE2 integer square-root technical report by Ahmed Ez-Zouine" loading="lazy"></iframe>
    </div>
  </div>

  <p class="paper-fallback">
    Embedded viewer not loading on your device? <a href="assets/Ez-Zouine_CVE2_ISQRT_Technical_Report.pdf" target="_blank" rel="noopener">Open the PDF directly</a> or <a href="assets/Ez-Zouine_CVE2_ISQRT_Technical_Report.pdf" download>download it for offline reading</a>.
  </p>
</div>

## Explore the documentation { .project-section }

<div class="project-link-grid">
  <a class="project-card-link" href="design/">
    <strong>Core Architecture</strong>
    <span>R-type custom-0 encoding, decode validation, ALU unrolling, and zero-overhead writeback</span>
  </a>
  <a class="project-card-link" href="arithmetic/">
    <strong>Arithmetic Algorithm</strong>
    <span>Mathematical recurrence derivation, step-by-step worked trace, and live interactive calculator</span>
  </a>
  <a class="project-card-link" href="verification/">
    <strong>Simulation & Verification</strong>
    <span>200,705 automated checks, boundary cases, corner tests, and signal writeback waveforms</span>
  </a>
  <a class="project-card-link" href="results/">
    <strong>FPGA Implementation</strong>
    <span>Artix-7 synthesis and routing data, setup/hold slack breakdown, and vectorless power analysis</span>
  </a>
  <a class="project-card-link" href="alternatives/">
    <strong>Design Trade-offs</strong>
    <span>Combinational single-cycle datapath versus 16-cycle iterative multicycle architecture comparison</span>
  </a>
  <a class="project-card-link" href="reproduce/">
    <strong>Reproduction Guide</strong>
    <span>Step-by-step toolchain setup, Verilator commands, and Vivado 2024.2 synthesis automation</span>
  </a>
</div>
