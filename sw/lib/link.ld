/* Linker script for the CVE2 take-home testbench: 1 MiB of RAM at 0x0. */
OUTPUT_ARCH(riscv)
ENTRY(_start)

MEMORY
{
  ram (rwx) : ORIGIN = 0x00000000, LENGTH = 1M
}

TRAP_STACK_SIZE = 4K;
STACK_SIZE      = 64K;

SECTIONS
{
  /* Vector table: mtvec is initialised to 0x0 (vectored mode) by the core. */
  .vectors 0x00000000 : {
    KEEP(*(.vectors))
  } > ram

  /* Reset vector: boot_addr = 0x80 */
  .text.init 0x00000080 : {
    KEEP(*(.text.init))
  } > ram

  .text : {
    *(.text .text.*)
  } > ram

  .rodata : ALIGN(4) {
    *(.rodata .rodata.* .srodata .srodata.*)
  } > ram

  .data : ALIGN(4) {
    *(.data .data.* .sdata .sdata.*)
    . = ALIGN(4);
  } > ram

  .bss (NOLOAD) : ALIGN(4) {
    __bss_start = .;
    *(.bss .bss.* .sbss .sbss.* COMMON)
    . = ALIGN(4);
    __bss_end = .;
  } > ram

  .stack (NOLOAD) : ALIGN(16) {
    . += TRAP_STACK_SIZE;
    __trap_stack_top = .;
    . += STACK_SIZE;
    __stack_top = .;
  } > ram

  _end = .;
}
