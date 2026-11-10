# Invoked by scripts/run_fpga_power.py on the Vivado host.
if {$argc != 2} { error "Usage: -tclargs CHECKPOINT OUTPUT_DIRECTORY" }
set checkpoint [file normalize [lindex $argv 0]]
set out [file normalize [lindex $argv 1]]
if {[version -short] ne "2024.2"} { error "This comparison requires Vivado 2024.2" }
if {![file isfile $checkpoint] || ![file isdirectory $out]} {
    error "Use scripts/run_fpga_power.py to prepare and verify the inputs"
}
if {[file exists [file join $out power.rpt]]} { error "Refusing to overwrite an existing power report" }
open_checkpoint $checkpoint
set checkpoint_part [get_property PART [current_project]]
set session_design [current_design]
puts "Opened checkpoint: part=$checkpoint_part; session_design=$session_design"
if {$checkpoint_part ne "xc7a35tcsg324-1"} {
    error "Unexpected checkpoint part: expected xc7a35tcsg324-1, got $checkpoint_part"
}
# A reopened checkpoint's session name need not be its RTL top-module name.
foreach {cell_name ref_name} {u_core cve2_top u_core/u_cve2_core cve2_core} {
    set cell [get_cells -quiet $cell_name]
    if {[llength $cell] != 1} { error "Expected one preserved core instance: $cell_name" }
    set actual_ref [get_property REF_NAME $cell]
    if {$actual_ref ne $ref_name} {
        error "Unexpected module at $cell_name: expected $ref_name, got $actual_ref"
    }
}
set core_clock [get_clocks -quiet core_clk]
if {[llength $core_clock] != 1 || [get_property PERIOD $core_clock] != 20.0} {
    error "Expected the recorded core_clk period of 20 ns"
}
set_param general.maxThreads 4
set identity [open [file join $out checkpoint_identity.txt] w]
puts $identity "session_design: $session_design"
puts $identity "part: $checkpoint_part"
puts $identity "u_core_ref_name: [get_property REF_NAME [get_cells u_core]]"
puts $identity "u_cve2_core_ref_name: [get_property REF_NAME [get_cells u_core/u_cve2_core]]"
puts $identity "clock_period_ns: [get_property PERIOD $core_clock]"
close $identity

# Save the reopened design's metrics before applying power-only assumptions.
report_utilization -hierarchical -file [file join $out reopened_utilization.rpt]
report_route_status -file [file join $out reopened_route_status.rpt]
report_timing_summary -report_unconstrained -file [file join $out reopened_timing_summary.rpt]
report_clocks -file [file join $out clocks.rpt]

reset_operating_conditions
set_operating_conditions -process typical -grade commercial \
    -junction_temp 25 -ambient_temp 25
reset_switching_activity [get_nets -hierarchical]
set_switching_activity -default_toggle_rate 12.5
set_switching_activity -default_static_probability 0.5

set inputs [get_ports -filter {DIRECTION == IN && NAME != clk_i}]
set_switching_activity -signal_rate 6.25 -static_probability 0.5 $inputs
foreach name {rst_ni fetch_enable_i} {
    set port [get_ports -quiet $name]
    if {[llength $port] != 1} { error "Missing power-model input $name" }
    set_switching_activity -signal_rate 0 -static_probability 1 $port
}
set inactive [get_ports -filter {DIRECTION == IN && (NAME =~ irq_* || NAME == debug_req_i || NAME == instr_err_i || NAME == data_err_i)}]
if {[llength $inactive] != 23} { error "Unexpected interrupt/error/debug input set" }
set_switching_activity -signal_rate 0 -static_probability 0 $inactive

report_operating_conditions -all -file [file join $out operating_conditions.rpt]
report_switching_activity -signal_rate -static_probability \
    -file [file join $out input_activity.rpt] [all_inputs]
report_power -advisory -hier all -hierarchical_depth 4 -l 100 \
    -file [file join $out power.rpt]
report_switching_activity -signal_rate -static_probability -type register -all \
    -file [file join $out register_activity.rpt]
report_switching_activity -signal_rate -static_probability -type lut -all \
    -file [file join $out lut_activity.rpt]
write_xdc [file join $out power_constraints.xdc]
puts "Power reports generated for review in $out"
