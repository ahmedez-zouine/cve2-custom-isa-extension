# Assignment and integration review

Reviewed against the two-page technical assignment on 11 November 2026.
The tested source revision is `95090a4`; see [manifest.json](manifest.json)
for the full revision, tools, commands, source hashes and artifact hashes.

## Fresh simulation results

The build used a new directory populated by `git archive` of the committed
Makefile, file list, core, testbench and software. It did not reuse the working
checkout's simulator or program binaries. Commands were run from that export:

```sh
make test RISCV=riscv64-elf-
make run TEST=isqrt_corners RISCV=riscv64-elf-
make run TEST=isqrt_integration RISCV=riscv64-elf-
```

| Program | Result | Evidence |
| --- | --- | --- |
| Supplied software reference | PASS, 5 checks | [supplied.log](supplied.log) |
| Supplied hardware program | PASS, 2,007 checks | [supplied.log](supplied.log) |
| Corner and exception cases | PASS, 43 checks | [corners.log](corners.log) |
| Square boundaries and instruction dependencies | PASS, 200,705 checks | [integration.log](integration.log) |

Both benchmark programs reproduced checksum 10,996,072. Their printed cycle
averages were 247 and 23, a ratio of approximately 10.7. These are workload
averages, not isolated instruction latency or elapsed FPGA time.

The timing extractor also read the freshly generated corner-test VCD. It
confirmed `isqrt x11, x11` at PC `0x00000d20`, input 20, result 4, valid
writeback controls, no execution stall or illegal indication during the
selected interval, and a stored destination value of 4 at the next rising
edge. Entry and writeback were 20565 and 20575 ps, matching the published
figure. The extracted [CSV](writeback.csv) is archived here. The raw VCD
remains local; its location and hash are in the manifest.

## Source integration review

Comparison with the original import `af1e7b4` shows exactly three changed RTL
files: `cve2_pkg.sv`, `cve2_decoder.sv`, and `cve2_alu.sv`. The `tb/` diff is
empty, as are the core and top-module configuration diffs. The FPGA wrapper
matches the supplied counter and RV32 settings and explicitly disables
`XInterface`. ISQRT uses the normal decoder/ALU path.

The decoder enables the source read and destination write only for zero
`funct7`, `rs2` and `funct3` under custom-0. Other encodings set the ordinary
illegal indication; write enable defaults to zero. Source and destination
addresses use the existing instruction fields. Register zero retains the
core's constant-zero implementation. The corner test covers selected invalid
encodings, in-place execution, x0 behavior and trap recovery; it is not an
exhaustive encoding or register-pair enumeration.

The ALU initializes every temporary and performs sixteen unsigned restoring
steps. Before the final step, the partial root is at most 32767 and the
remainder is at most 65534. Bringing in another pair produces a remainder
candidate at most 262139; the trial is at most 131069. These values fit in
the 32-bit temporaries, and the final root is at most 65535. The integration
program checks expected roots at all positive square boundaries and uses
independent 64-bit inequalities for 4,096 full-width inputs. No RTL correction was indicated
by this review or the fresh tests. Full ISA regression and formal proof of
the integrated core remain outside the evidence.

## Assignment coverage and remaining submission work

| Requirement | Evidence or remaining action |
| --- | --- |
| Implement unsigned ISQRT | Package, decoder and ALU reviewed; fresh simulation passed |
| Preserve the core and supplied tests | Supplied tests and directed RV32IMC dependencies pass; broader compatibility is not proven |
| Add own tests | Corner and integration programs with archived passing logs |
| FPGA before/after area, timing and power | Existing [technical handoff](../../fpga/verified_results.md); Vivado was not rerun in this review |
| Discuss another architecture | [Iterative-unit discussion](../../../docs/alternatives.md), with expectations distinguished from measured data |
| Required report | Root-level `report.pdf` still needs to be written: at most six A4 single-column pages, with waveform, reproduction steps and AI-use acknowledgment |

Both FPGA designs fail overall setup and hold at the selected 20 ns target.
The internal ISQRT path also fails setup; interface limitations cannot explain
that failure away. The unresolved `Constraints 18-8777` message and missing
successful extended implementation launch log are recorded in the
[routed review](../../fpga/implementation/comparison.md). This review does not
resolve them or establish an implemented maximum clock frequency.

At the time of this review, the figure collector dataset predated a change
to the integration test. A subsequent collection refreshed those figures
through the normal freshness checks, reproducing the same values. The
[report evidence packet](../report_evidence.md) records that follow-up and
the selected figures. Finish the report, review its rendered pages, and
audit the final deliverable file list.
