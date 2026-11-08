# 50 MHz comparison target.
create_clock -name core_clk -period 20.0 [get_ports clk_i]

# OOC interface assumption: external synchronous logic uses 20% of the period.
set bus_inputs [remove_from_collection [all_inputs] [get_ports {clk_i rst_ni}]]
set_input_delay -clock core_clk -max 4.0 $bus_inputs
set_input_delay -clock core_clk -min 0.0 $bus_inputs
set_output_delay -clock core_clk -max 4.0 [all_outputs]
set_output_delay -clock core_clk -min 0.0 [all_outputs]

# The external reset asserts asynchronously at the reset synchronizer.
set_false_path -from [get_ports rst_ni]
