# Usage: vivado -mode batch -source fpga/synth.tcl -tclargs PART ?extended|baseline?
if {$argc < 1 || $argc > 2} {
    error "Usage: -tclargs PART ?extended|baseline? (clock target: 20 ns / 50 MHz)"
}
set target_part [lindex $argv 0]
set variant extended
if {$argc == 2} { set variant [lindex $argv 1] }
if {$variant ni {extended baseline}} { error "Variant must be extended or baseline" }
set clock_period_ns 20.0

set driver [file normalize [info script]]
set root [file dirname [file dirname $driver]]
cd $root
set source_root $root
if {$variant eq "baseline"} {
    set source_root [file join $root build fpga baseline_src]
    foreach name {source_manifest.json source_info.txt} {
        if {![file isfile [file join $source_root $name]]} {
            error "Baseline sources missing. Run: python3 scripts/prepare_fpga_baseline.py"
        }
    }
    exec python3 [file join $root scripts prepare_fpga_baseline.py]
}
set out [file join $root build fpga $variant]
file mkdir $out
file copy -force $driver [file join $out synth_driver.tcl]
if {$variant eq "baseline"} {
    foreach name {source_manifest.json source_info.txt} {
        file copy -force [file join $source_root $name] [file join $out $name]
    }
}
create_project -in_memory -part $target_part
# Package constants are implicitly local; keep this notice visible as INFO.
set_msg_config -id {Synth 8-11067} -new_severity INFO
set_property target_language Verilog [current_project]
set_property verilog_define {SYNTHESIS} [current_fileset]

set source_list [open [file join $source_root fpga files.f] r]
set includes {}
set sources {}
foreach line [split [read $source_list] "\n"] {
    set line [string trim $line]
    if {$line eq "" || [string match {//*} $line]} { continue }
    if {[string match {+incdir+*} $line]} {
        lappend includes [file normalize [file join $source_root [string range $line 8 end]]]
    } else {
        set source [file join $source_root $line]
        if {![file isfile $source]} { error "Missing RTL source: $source" }
        lappend sources [file normalize $source]
    }
}
close $source_list
set_property include_dirs $includes [current_fileset]
read_verilog -sv $sources
read_xdc [file join $source_root fpga core.xdc]
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
puts $metadata "scope: $variant core, out-of-context, post-synthesis estimates"
puts $metadata "source_root: $source_root"
puts $metadata "driver_copy: synth_driver.tcl"
if {![catch {exec git rev-parse HEAD} revision]} { puts $metadata "revision: $revision" }
if {![catch {exec git status --porcelain} changes]} { puts $metadata "working_tree_changes:\n$changes" }
if {$variant eq "baseline"} {
    set source_info [open [file join $source_root source_info.txt] r]
    puts $metadata "prepared_sources:\n[read $source_info]"
    close $source_info
    puts $metadata "source_hashes: source_manifest.json"
}
close $metadata
puts "Post-synthesis reports written to $out"
