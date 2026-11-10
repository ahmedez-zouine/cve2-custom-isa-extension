# Usage: vivado -mode batch -source fpga/implement.tcl -tclargs extended|baseline
if {$argc != 1 || [lindex $argv 0] ni {extended baseline}} {
    error "Usage: -tclargs extended|baseline"
}
set variant [lindex $argv 0]
set driver [file normalize [info script]]
set root [file dirname [file dirname $driver]]
cd $root
set input_dir [file join $root build fpga $variant]
set checkpoint [file join $input_dir post_synth.dcp]
set out [file join $root build fpga implementation $variant]

foreach name {post_synth.dcp run_info.txt vivado.log} {
    if {![file isfile [file join $input_dir $name]]} {
        error "Missing synthesis input: [file join $input_dir $name]. Use the successful synthesis run on the Vivado host."
    }
}
if {[file exists [file join $out implementation_info.txt]]} {
    error "Implementation already attempted in $out. Preserve and rename that directory before another run."
}

set stream [open [file join $input_dir run_info.txt] r]
set source_info [read $stream]
close $stream
set identity [dict create]
foreach key {tool part clock_period_ns scope} {
    if {![regexp -line "^${key}: (.+)$" $source_info -> value]} {
        error "Missing $key in synthesis run_info.txt"
    }
    dict set identity $key [string trim $value]
}
if {![string match "$variant core, out-of-context, post-synthesis*" [dict get $identity scope]]} {
    error "Synthesis metadata does not identify the requested $variant OOC run"
}
if {[dict get $identity part] ne "xc7a35tcsg324-1" ||
    ![string is double -strict [dict get $identity clock_period_ns]] ||
    [dict get $identity clock_period_ns] != 20.0} {
    error "This comparison requires xc7a35tcsg324-1 and the saved 20 ns clock target"
}
set synthesis_log_path [file join $input_dir vivado.log]
set recovered_log 0
set stream [open $synthesis_log_path r]
set synthesis_log [read $stream]
close $stream
if {![regexp -line {^synth_design completed successfully[ \t]*$} $synthesis_log]} {
    set archive_dir [file join $root output fpga $variant]
    foreach name {run_info.txt vivado.log} {
        if {![file isfile [file join $archive_dir $name]]} {
            error "The build log does not record a successful synth_design, and matching archived evidence is missing: $name"
        }
    }
    set stream [open [file join $archive_dir run_info.txt] r]
    set archived_info [read $stream]
    close $stream
    if {[string trim $archived_info] ne [string trim $source_info]} {
        error "Archived synthesis metadata differs from the checkpoint's run_info.txt; refusing to substitute its log"
    }
    set synthesis_log_path [file join $archive_dir vivado.log]
    set stream [open $synthesis_log_path r]
    set synthesis_log [read $stream]
    close $stream
    if {![regexp -line {^synth_design completed successfully[ \t]*$} $synthesis_log]} {
        error "Neither build nor matching archived log records a successful synth_design"
    }
    set recovered_log 1
    puts "Using archived successful synthesis log with matching run metadata: $synthesis_log_path"
}
set tool_version [version -short]
if {$tool_version ne "2024.2" || $tool_version ne [dict get $identity tool]} {
    error "Use Vivado 2024.2, matching the synthesis checkpoint"
}
set checkpoint_hash [exec python3 -c {
import hashlib, pathlib, sys
print(hashlib.sha256(pathlib.Path(sys.argv[1]).read_bytes()).hexdigest())
} $checkpoint]

file mkdir $out
file copy $driver [file join $out implementation_driver.tcl]
file copy [file join $input_dir run_info.txt] [file join $out synthesis_run_info.txt]
file copy $synthesis_log_path [file join $out synthesis_vivado.log]
if {$recovered_log} {
    file copy [file join $input_dir vivado.log] [file join $out synthesis_rejected_build.log]
}
foreach name {source_manifest.json source_info.txt synth_driver.tcl} {
    if {[file isfile [file join $input_dir $name]]} {
        file copy [file join $input_dir $name] [file join $out synthesis_$name]
    }
}
set metadata [open [file join $out implementation_info.txt] w]
puts $metadata "status: started"
puts $metadata "started_utc: [clock format [clock seconds] -gmt 1 -format {%Y-%m-%dT%H:%M:%SZ}]"
puts $metadata "tool: $tool_version"
puts $metadata "variant: $variant"
puts $metadata "part: [dict get $identity part]"
puts $metadata "clock_period_ns: 20.0"
puts $metadata "scope: OOC module analysis with routed internal nets"
puts $metadata "checkpoint: $checkpoint"
puts $metadata "checkpoint_sha256: $checkpoint_hash"
puts $metadata "synthesis_log_source: $synthesis_log_path"
puts $metadata "synthesis_log_recovered_from_archive: $recovered_log"
puts $metadata "constraints: inherited from synthesis checkpoint"
puts $metadata "flow: opt_design; place_design; phys_opt_design; route_design (Default directives)"
puts $metadata "max_threads: 4"
puts $metadata "limitation: external clock context and board interfaces are not defined; review HD.CLK_SRC and all timing/DRC reports"
if {![catch {exec git rev-parse HEAD} revision]} { puts $metadata "driver_revision: $revision" }
if {![catch {exec git status --porcelain} changes]} { puts $metadata "working_tree_changes:\n$changes" }
close $metadata

set result [catch {
    # The checkpoint retains the OOC mode and its timing constraints.
    open_checkpoint $checkpoint
    if {[get_property PART [current_project]] ne [dict get $identity part]} {
        error "Checkpoint part differs from the synthesis metadata"
    }
    set core_clock [get_clocks -quiet core_clk]
    if {[llength $core_clock] != 1 || [get_property PERIOD $core_clock] != 20.0} {
        error "Checkpoint must contain one core_clk with a 20 ns period"
    }
    set clock_source [get_property HD.CLK_SRC [get_ports clk_i]]
    set metadata [open [file join $out implementation_info.txt] a]
    puts $metadata "hd_clk_src: $clock_source"
    close $metadata
    if {$clock_source eq ""} {
        puts "WARNING: HD.CLK_SRC is unset. Routed module results do not establish complete clock timing or board timing closure."
    }
    set_param general.maxThreads 4
    check_timing -verbose -file [file join $out input_check_timing.rpt]
    opt_design -directive Default
    place_design -directive Default
    phys_opt_design -directive Default
    write_checkpoint [file join $out post_place.dcp]
    report_timing_summary -report_unconstrained -file [file join $out post_place_timing.rpt]
    route_design -directive Default
    write_checkpoint [file join $out post_route.dcp]
    report_route_status -file [file join $out route_status.rpt]
    report_utilization -hierarchical -file [file join $out utilization.rpt]
    report_timing_summary -report_unconstrained -file [file join $out timing_summary.rpt]
    report_timing -delay_type max -max_paths 10 -path_type full_clock_expanded \
        -file [file join $out setup_paths.rpt]
    report_timing -delay_type min -max_paths 10 -path_type full_clock_expanded \
        -file [file join $out hold_paths.rpt]
    report_timing -from [all_registers] -to [all_registers] -delay_type max \
        -max_paths 10 -path_type full_clock_expanded -file [file join $out register_setup_paths.rpt]
    check_timing -verbose -file [file join $out check_timing.rpt]
    report_clocks -file [file join $out clocks.rpt]
    report_clock_utilization -file [file join $out clock_utilization.rpt]
    report_methodology -file [file join $out methodology.rpt]
    report_drc -file [file join $out drc.rpt]
    write_xdc [file join $out implemented_constraints.xdc]
} message options]

set metadata [open [file join $out implementation_info.txt] a]
puts $metadata "finished_utc: [clock format [clock seconds] -gmt 1 -format {%Y-%m-%dT%H:%M:%SZ}]"
if {$result} {
    puts $metadata "status: failed"
    puts $metadata "error: $message"
    close $metadata
    return -options $options $message
}
puts $metadata "status: reports_generated"
puts $metadata "review: inspect route_status.rpt, timing_summary.rpt, check_timing.rpt, methodology.rpt and drc.rpt before accepting results"
close $metadata
puts "Implementation reports written to $out"
puts "Reports generated; routing completeness and timing closure require review."
