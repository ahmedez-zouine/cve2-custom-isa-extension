# Architecture trade-offs

The implemented ISQRT unit unrolls sixteen restoring steps inside the ALU. An alternative would reuse one step over sixteen clock cycles. Only the unrolled unit has been implemented and measured; the iterative design below is a proposal based on the same recurrence.
{ .project-lead }

## What the implemented design costs

Each step consumes two operand bits and produces one root bit. The combinational loop connects sixteen dependent steps without intermediate registers. The decoder selects `ALU_ISQRT`, and the existing result mux and register write port deliver the result at the closing edge. The recorded RTL trace shows input 20 becoming 4 without an execution stall.

The FPGA results show the cost of this choice. Whole-design routed LUT use increases from 2,987 to 4,205 (+40.8%), while flip-flops increase from 1,961 to 1,965. Both variants use one DSP and no block RAM. The extended core's worst reported register path passes through the square-root logic and has 49.387 ns data-path delay, including selection logic and routing. Its setup slack is −29.556 ns against a 20 ns clock target. That delay belongs to the complete path, not just the square-root unit.

The software and custom-instruction workloads average 247 and 23 cycles per root, respectively, giving about 10.7× fewer cycles for this benchmark. These rounded averages include loop and input-generation work. The one-cycle RTL execution interval does not establish operation at 50 MHz on the FPGA: the routed design fails timing. The [results page](results.md) reports the physical timing and vectorless power estimates separately.

## Reuse one restoring step

An iterative implementation would keep the remaining input, partial root and remainder in registers, with a counter recording the sixteen input pairs. It would apply the same [restoring recurrence](arithmetic.md) once per cycle:

1. Capture the operand and destination register when a legal ISQRT instruction starts. Clear the partial root and remainder.
2. Bring the next two input bits into the remainder. Form the trial value `4 × root + 1`, compare, and conditionally subtract it.
3. Append the selected root bit and store the new state. Repeat until all sixteen pairs have been processed.
4. Present the zero-extended root and complete the instruction through the normal writeback path.

This proposal takes sixteen arithmetic iterations. Its complete instruction latency also depends on whether operand capture, the first iteration and final writeback share clock cycles. A design with separate capture and completion states would require additional cycles. No exact total latency has been measured for this proposal.

| Property | Implemented combinational unit | Proposed iterative unit |
| --- | --- | --- |
| Arithmetic hardware | Sixteen connected restoring steps | One reused restoring step |
| State | No iteration registers | Input, root, remainder, counter and control state |
| Execution | One observed RTL execution interval | Sixteen arithmetic iterations, plus any capture/completion overhead |
| Area | +1,218 routed LUTs for the whole extended core | Fewer arithmetic stages expected; additional registers and control required |
| Critical path | Measured long internal path through ISQRT | One step between state registers; shorter arithmetic path expected |
| Integration | Existing ALU selection and writeback | Busy/completion control, stalled execution and deferred writeback |

The iterative unit should reduce duplicated arithmetic logic, but the size of the reduction needs synthesis. It would add state and instruction-control logic. Removing fifteen dependent steps from a single cycle should shorten the square-root arithmetic path, although another core path could then limit the clock. Meeting 20 ns would still need placement, routing and timing review under consistent constraints.

## Integration of a multicycle operation

The current ordinary ALU path reports a result without waiting for a square-root completion signal. An iterative unit therefore needs coordinated changes in the execution block and ID/EX control. The existing multiply/divide completion handling is a useful integration reference, but its signals cannot simply be reused without checking resource ownership and result selection.

The controller must accept the instruction once, retain its operand and destination, hold the instruction while the unit is busy, and prevent register writeback until the final result is ready. Holding younger instructions in this two-stage core also prevents a dependent load/store or arithmetic instruction from consuming an unfinished result. After completion, the destination must be written exactly once before normal execution resumes.

For `rd = rs1`, the captured operand must survive until the last iteration. For `rd = x0`, the instruction completes while the architectural write is discarded. Invalid custom-0 encodings must trap before the unit starts. Reset and any supported flush, debug or interrupt transition must follow the core's instruction-completion policy, so an aborted operation cannot later write a stale result. This would remain an internal execution unit; the assignment excludes CV-X-IF.

Verification would need to cover start/busy/completion sequencing, exact write count, back-to-back operations, dependencies, reset and cancellation, in addition to the existing arithmetic and illegal-encoding checks. Those multicycle behaviors are proposed requirements, not features tested by the present implementation.

## Design choice and limits

The unrolled design keeps the modification small and demonstrates the instruction through the normal ALU path. Its measured area increase and negative slack expose the trade-off. For a follow-up implementation focused on clock period or area, the iterative design is a reasonable candidate, with higher instruction latency and more control work.

Power and energy cannot be predicted from area alone. A reused stage may switch less logic per cycle, but it runs for more cycles and clocks additional state. A fair energy comparison would need representative activity, supported clock frequencies and workload completion times for both implementations. No iterative area, frequency, power or energy measurements are claimed here.

The archived [routed comparison](https://github.com/ahmedez-zouine/cve2-custom-isa-extension/blob/95090a4/output/fpga/implementation/comparison.md) provides the measured path and resource values. Both routed designs fail overall setup and hold, and the OOC external clock and interface context is incomplete. The unresolved `Constraints 18-8777` warning and missing successful extended implementation launch log remain evidence limitations; the available reports and checkpoint audits do not resolve those gaps.
