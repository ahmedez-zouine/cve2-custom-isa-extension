# make test                 run sw_isqrt and hw_isqrt
# make run TEST=hw_isqrt    run one program from sw/
#
# Every run also writes, for debugging:
#   build/<test>_00000000.log   trace: every instruction the core executed
#   build/<test>.vcd            waveforms of the first 20000 cycles (open in GTKWave)

TEST  ?= hw_isqrt
RISCV ?= riscv64-unknown-elf-
# (on macOS with Homebrew: make ... RISCV=riscv64-elf-)

MAKEFLAGS += --no-print-directory


# Step 1: build the simulator.
# Verilator turns the core (files listed in files.f) and the testbench (tb/)
# into one program, build/sim/Vtb_top. Rebuilt when any RTL or testbench file changes.
build/sim/Vtb_top: files.f cve2/rtl/*.sv tb/*
	mkdir -p build/sim
	# Verilator 5 supports --build; retain this command as a note for newer installs.
	# verilator --cc --exe --build -j 0 --trace --top-module tb_top -Mdir build/sim
	verilator --cc --exe --trace --top-module tb_top -Mdir build/sim \
	  -Wno-fatal -Wno-lint -Wno-style +define+RVFI \
	  -f files.f tb/tb.vlt tb/tb_mem.sv tb/tb_top.sv $(CURDIR)/tb/tb_main.cpp \
	  > build/sim.log 2>&1 || (tail -30 build/sim.log; false)
	$(MAKE) -C build/sim -f Vtb_top.mk >> build/sim.log 2>&1 || (tail -30 build/sim.log; false)


# Step 2: build a program.
# Compiles sw/NAME.c for RISC-V, then turns it into build/NAME.hex, the memory
# image the testbench loads. ($* stands for NAME, $< for sw/NAME.c, $@ for the .hex)
build/%.hex: sw/%.c sw/lib/*
	mkdir -p build
	$(RISCV)gcc -march=rv32imc_zicsr -mabi=ilp32 -O2 -ffreestanding -mno-relax -nostdlib \
	  -T sw/lib/link.ld -Wl,--no-warn-rwx-segments -Isw/lib \
	  -o build/$*.elf sw/lib/crt0.S sw/lib/lib.c $<
	$(RISCV)objdump -d build/$*.elf > build/$*.dis
	$(RISCV)objcopy -O binary build/$*.elf build/$*.bin
	od -An -v -tx4 build/$*.bin > $@


# Step 3: run a program on the simulator.
# It also writes the trace (build/NAME_00000000.log) and the waveforms (build/NAME.vcd).
run: build/sim/Vtb_top build/$(TEST).hex
	build/sim/Vtb_top +hex=build/$(TEST).hex \
	  +cve2_tracer_file_base=build/$(TEST) +waves=build/$(TEST).vcd


test:
	$(MAKE) run TEST=sw_isqrt
	$(MAKE) run TEST=hw_isqrt

clean:
	rm -rf build

.PHONY: run test clean
