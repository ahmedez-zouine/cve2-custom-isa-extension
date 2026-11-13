# CVE2-ISQRT animated showcase

A local React/TypeScript/Remotion project for the actual CVE2 integer square-root extension. The design uses SVG diagrams, deterministic frame animation, locally bundled Inter and IBM Plex Mono fonts, and an original synthesized ambient score. There is no voice-over and no external stock footage.

## Outputs

| Deliverable | File | Format |
| --- | --- | --- |
| Full film | `out/CVE2-ISQRT-60s.mp4` | 60 s, 1920 × 1080, 30 fps, H.264 / AAC |
| Short showcase | `out/CVE2-ISQRT-15s.mp4` | 15 s, 1920 × 1080, 30 fps, H.264 / AAC |
| Poster | `out/CVE2-ISQRT-poster.png` | 1920 × 1080 PNG |
| Scene previews | `out/frames/` | Full-resolution PNGs |
| Encoded-output checks | `out/quality-report.json` | Duration, frame count, codecs, decode checks and hashes |

Generated media and dependencies are ignored by Git. All authoring code is in this directory. The processor RTL, testbench, reports, website and paper are not modified by this project.

## Install and preview

Requirements: Node.js 22 or newer, npm, Python 3, and Chrome/Chrome Headless Shell. The tested renderer uses the installed Google Chrome on this Mac. On other systems Remotion can obtain its supported browser; alternatively set `CHROME_PATH` to your Chrome executable.

```sh
cd showcase
npm ci
npm run typecheck
npm start
```

The preview opens Remotion Studio, with `CVE2-ISQRT`, `CVE2-ISQRT-Short`, and `CVE2-ISQRT-Poster` compositions. Audio is generated on first use from `scripts/soundtrack.py`; there are no network font or image requests during rendering.

## Render

```sh
# Representative frames from all six scenes
npm run frames

# Full video, short cut, poster and scene frames
npm run render

# Individual exports
npm run render:full
npm run render:short
npm run render:poster

# Inspect every transition boundary
node scripts/render.mjs transitions

# Check encoded files and extract review sheets from the actual MP4s
npm run verify
```

The renderer uses four parallel workers, PNG intermediate frames, Rec.709 color and CRF 17, with YUV 4:2:0 for playback compatibility. Set `RENDER_CONCURRENCY=2` if memory is limited. For a different browser:

```sh
CHROME_PATH=/path/to/chrome npm run render
```

For direct CLI rendering, first run `npm run audio`, then:

```sh
npx remotion render src/index.ts CVE2-ISQRT out/CVE2-ISQRT-60s.mp4 --codec=h264 --crf=17 --image-format=png --color-space=bt709
```

## Story and timing

| Full film | Scene | Evidence and presentation |
| --- | --- | --- |
| 0-7 s | Introduction | Stylized processor package; circuit reveal and slow camera push |
| 7-17 s | Architecture | Fetch, decoder, register file, `cve2_ex_block`, `cve2_alu`, `isqrt_comb`, result selection and writeback |
| 17-30 s | Arithmetic | 144 -> 12, calculated from the RTL's restoring recurrence; 32 input bits grouped into 16 pairs |
| 30-40 s | RTL | Exact excerpts from `cve2_decoder.sv` and `cve2_alu.sv`, with source line numbers |
| 40-52 s | Verification / FPGA | Archived passing checks, selected 20 -> 4 waveform, routed LUT counts and negative setup slack |
| 52-60 s | Closing | Architecture and processor hero, project name, author and source link |

The 15-second cut uses the same six scenes with faster reveals. It is a visual teaser; the full film gives the technical content time to read. Scene boundaries use eased fades through the persistent navy field, and the full film begins and ends in black.

## Technical basis

`src/data/evidence.json` contains exact code excerpts, the selected waveform rows, the computed 144 example, the displayed FPGA values and SHA-256 hashes of the files inspected. Refresh it from the parent repository with:

```sh
npm run evidence
```

The collector checks source values and runs recurrence boundary checks before writing the snapshot. The archived test results have their own recorded source revision, which may differ from today's checkout; see `output/verification/submission_review/manifest.json` in the parent repository. The animation reports those archived results, rather than claiming a new Verilator or Vivado run.

### Implementation

- `cve2/rtl/cve2_decoder.sv`: CUSTOM-0 instruction decoding; `rs2=x0`, `funct3=0`, `funct7=0`; enable operand A read and destination write.
- `cve2/rtl/cve2_alu.sv`: `always_comb : isqrt_comb`, sixteen restoring steps and the `ALU_ISQRT` result-mux arm. There is **no standalone ISQRT module** and no new sixteen-cycle operation.
- `cve2/rtl/cve2_ex_block.sv`: ALU instance and execution-valid selection.
- `cve2/rtl/cve2_core.sv`: register-file operands, writeback and module connections.
- `tb/tb_top.sv`: existing simulation top. The video does not claim a new testbench.

The architecture drawing is a focused logical datapath, not a complete schematic. Memory, branch and multiply/divide paths are omitted and labelled as such. The microprocessor package is an illustration, not a die photograph, measured floorplan or board photograph.

### Arithmetic animation

For each input pair `b`, calculate `T = 4*Rprev + b` and `D = 4*Qprev + 1`. If `T >= D`, set `Qnext = 2*Qprev + 1` and `Rnext = T-D`; otherwise set `Qnext = 2*Qprev` and `Rnext = T`. The sixteen steps are combinational. The twelve leading zero pairs are animated quickly, with longer holds on the four informative pairs `10 01 00 00`. Their roots are 1, 3, 6 and 12.

144 → 12 is a worked example calculated from the RTL, **not a measured waveform**. The animation's timing is explanatory and does not model gate delays.

### Verification and FPGA claims

| On-screen claim | Repository evidence |
| --- | --- |
| 200,705 integration checks pass | `output/verification/submission_review/integration.log` |
| 43 corner / encoding checks pass | `output/verification/submission_review/corners.log` |
| Verilator 5.054 | `output/verification/submission_review/manifest.json` |
| `isqrt x11,x11`, operand 20, result 4, next-edge writeback | `output/verification/submission_review/writeback.csv`, 20565-20575 ps |
| Original / extended LUTs: 2,987 / 4,205 | `output/fpga/implementation/{baseline,extended}/utilization.rpt` |
| Extended setup WNS: -29.556 ns | `output/fpga/implementation/extended/timing_summary.rpt` |
| Vivado 2024.2, Artix-7 XC7A35T, 20 ns target | Archived implementation report headers and timing constraints |

The waveform labels `operand_a_i` and `result_o` refer to the ALU ports; the CSV collector observes the connected core signals `alu_operand_a_ex` and `result_ex`. `rf_we_wb` is the actual core write-enable signal. Unshown operand/result values outside the selected instruction interval are deliberately left blank. `Stored x11` changes at the next rising edge.

The FPGA results are exploratory **out-of-context** routed results. The external clock context and interface routing are incomplete. Neither design meets overall timing at the recorded 20 ns target. The film does not claim implemented Fmax, 50 MHz operation, board-level correctness, measured board power, or wall-clock acceleration. No missing result has been filled in with an estimate.

## Source layout

```text
src/
  components/      Processor, datapath, binary, code, waveform and motion primitives
  scenes/          Six authored scenes
  data/            Checked evidence snapshot
  styles/          Palette and local font imports
  Root.tsx         Full, short and poster registrations
  Video.tsx        Timeline, audio and fades
scripts/
  collect_evidence.py
  soundtrack.py
  ensure-assets.mjs
  render.mjs
  verify_outputs.py
```

Inter and IBM Plex Mono are bundled through Fontsource under the SIL Open Font License; see their package LICENSE files. The ambient score is generated locally without samples. Remotion itself retains its own license terms. Rendering reference: [Remotion render CLI](https://www.remotion.dev/docs/cli/render).
