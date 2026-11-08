#!/usr/bin/env bash
set -euo pipefail

sudo apt-get update
sudo apt-get install -y --no-install-recommends \
  make \
  verilator \
  gcc-riscv64-unknown-elf \
  binutils-riscv64-unknown-elf \
  python3-venv \
  python3-pip

python3 -m venv tmp/figures_venv
tmp/figures_venv/bin/python -m pip install -r scripts/requirements-figures.txt

printf '\nCVE2 Codespace tools ready. Run: make test RISCV=riscv64-unknown-elf-\n'
