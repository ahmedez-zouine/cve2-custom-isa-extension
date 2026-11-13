---
description: "High-definition technical video presentation of the CVE2 ISQRT instruction: microarchitecture, 16-step recurrence, RTL, and Artix-7 FPGA results."
---

# Technical Video Presentation

A high-definition (1080p, 30 fps) technical presentation of the custom integer square-root (`isqrt`) instruction integrated into the CVE2 RISC-V core.
{ .project-lead }

<div class="project-actions">
  <a class="md-button md-button--primary" href="assets/CVE2-ISQRT-60s.mp4" download="CVE2-ISQRT-Presentation.mp4">Download 1080p MP4 (12 MB)</a>
  <a class="md-button" href="https://github.com/ahmedez-zouine/cve2-custom-isa-extension/tree/Master/showcase" target="_blank" rel="noopener">Remotion Source Code ↗</a>
  <a class="md-button" href="design/">Core Architecture ↗</a>
</div>

---

## Watch the Full Presentation (83 seconds) { .project-section }

<div class="video-container" style="position: relative; width: 100%; aspect-ratio: 16 / 9; border-radius: 10px; overflow: hidden; border: 1px solid #cbd5e1; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08); background: #0f172a; margin: 1.5rem 0 2rem;">
  <video
    controls
    playsinline
    preload="metadata"
    poster="assets/pipeline.png"
    style="width: 100%; height: 100%; display: block; object-fit: contain;"
  >
    <source src="assets/CVE2-ISQRT-60s.mp4" type="video/mp4" />
    Your browser does not support HTML5 video. You can <a href="assets/CVE2-ISQRT-60s.mp4" download>download the video</a> directly.
  </video>
</div>

<p style="text-align: center; color: #64748b; font-size: 0.9rem; margin-top: -1rem; margin-bottom: 2rem;">
  <em>Video: Programmatic Remotion render (1920x1080, 30 fps, H.264 high profile, AAC stereo audio).</em>
</p>

---

## Chapter Index & Technical Content { .project-section }

| Timestamp | Chapter | Core Technical Content |
| :---: | :--- | :--- |
| **00:00 - 00:09** | **01: Processor Architecture** | Silicon packaging reveal: 32-bit RV32IMC processor core context, Harvard bus topology, and custom ISA extension goals. |
| **00:09 - 00:24** | **02: Architecture & Datapath** | Logical schematic: instruction decode (`custom-0`), source read (`rs1`), single-cycle combinational ALU, and register writeback (`rd`) without extra pipeline stages. |
| **00:24 - 00:42** | **03: Hardware Recurrence** | Step-by-step arithmetic engine: unrolls ⌊√144⌋ = 12 across 16 bit-pair stages (p15 through p0) with candidate formation, trial divisor, and subtractor compare. |
| **00:42 - 00:56** | **04: RTL Implementation** | SystemVerilog source excerpts: instruction decoding with illegal trap handling in `cve2_decoder.sv`, and the unrolled restoring loop in `cve2_alu.sv`. |
| **00:56 - 01:11** | **05: Verification & FPGA** | Zero-defect Verilator simulation (200,705 checks, 20 ps trace) alongside AMD Xilinx Artix-7 post-routing LUT utilization (4,205 LUTs) and timing slack analysis. |
| **01:11 - 01:23** | **06: Summary & Results** | Key engineering trade-offs: 10.7× benchmark speedup, single-cycle combinational datapath, and multi-cycle iterative alternative. |

---

## Reproduce and Render Locally { .project-section }

The video is programmatically built with [Remotion](https://www.remotion.dev) using React, TypeScript, and SVG graphics.

### 1. Launch Interactive Studio

Navigate to the `showcase/` directory and start the local development preview:

```bash
cd showcase
npm install
npm start
```

This launches the Remotion Studio in your browser (`http://localhost:3000`) where you can scrub through every frame, inspect component props, and preview animations.

### 2. Export High-Bitrate Video

To re-render the master video files directly from terminal:

```bash
cd showcase

# Render the full 83-second 1080p master presentation
npm run render:full

# Render the 18-second short cut
npm run render:short

# Export the high-resolution cover poster
npm run render:poster
```

All rendered video outputs are saved into `showcase/out/`.

