# Usage: vivado -mode batch -source fpga/synth.tcl -tclargs PART
if {$argc != 1} {
    error "Usage: -tclargs PART (clock target: 20 ns / 50 MHz)"
}
set target_part [lindex $argv 0]
set clock_period_ns 20.0

set root [file normalize [file join [file dirname [info script]] ..]]
cd $root
set out [file join $root build fpga extended]
file mkdir $out
create_project -in_memory -part $target_part
set_property target_language Verilog [current_project]
set_property verilog_define {SYNTHESIS} [current_fileset]

set source_list [open fpga/files.f r]
set includes {}
set sources {}
foreach line [split [read $source_list] "\n"] {
    set line [string trim $line]
    if {$line eq "" || [string match {//*} $line]} { continue }
    if {[string match {+incdir+*} $line]} {
        lappend includes [file normalize [string range $line 8 end]]
    } else {
        if {![file isfile $line]} { error "Missing RTL source: $line" }
        lappend sources [file normalize $line]
    }
}
close $source_list
set_property include_dirs $includes [current_fileset]
read_verilog -sv $sources
read_xdc fpga/core.xdc
synth_design -top cve2_fpga_top -part $target_part -mode out_of_context

write_checkpoint -force [file join $out post_synth.dcp]
report_utilization -hierarchical -file [file join $out utilization.rpt]
report_timing_summary -report_unconstrained -file [file join $out timing_summary.rpt]
check_timing -verbose -file [file join $out check_timing.rpt]
report_clocks -file [file join $out clocks.rpt]
set metadata [open [file join $out run_info.txt] w]
puts $metadata "tool: [version -short]"
puts $metadata "part: $target_part"
puts $metadata "clock_period_ns: $clock_period_ns"
puts $metadata "scope: extended core, out-of-context, post-synthesis estimates"
if {![catch {exec git rev-parse HEAD} revision]} { puts $metadata "revision: $revision" }
if {![catch {exec git status --porcelain} changes]} { puts $metadata "working_tree_changes:\n$changes" }
close $metadata
puts "Post-synthesis reports written to $out"
