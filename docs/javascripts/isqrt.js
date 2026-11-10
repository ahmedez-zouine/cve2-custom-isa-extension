function squareRootSteps(input) {
  const steps = [];
  let prefix = 0;
  let root = 0;
  let remainder = 0;

  for (let pairIndex = 15; pairIndex >= 0; pairIndex--) {
    const pair = Math.floor(input / 4 ** pairIndex) % 4;
    const shiftedRemainder = 4 * remainder + pair;
    const trial = 4 * root + 1;
    const bit = shiftedRemainder >= trial ? 1 : 0;

    prefix = 4 * prefix + pair;
    root = 2 * root + bit;
    remainder = shiftedRemainder - bit * trial;
    steps.push({
      step: 16 - pairIndex,
      pair,
      prefix,
      shiftedRemainder,
      trial,
      bit,
      root,
      remainder,
    });
  }

  return steps;
}

const form = document.querySelector("#isqrt-form");
if (form) {
  const input = document.querySelector("#isqrt-input");
  const result = document.querySelector("#isqrt-result");
  const table = document.querySelector("#isqrt-steps");
  const format = new Intl.NumberFormat("en-US");

  function calculate() {
    const number = Number(input.value);
    if (number > 0xffffffff) {
      input.setCustomValidity("Enter a whole number from 0 to 4,294,967,295.");
      input.reportValidity();
      return;
    }

    const steps = squareRootSteps(number);
    const rows = steps.map(({ step, pair, prefix, shiftedRemainder, trial, bit, root, remainder }) => {
      const row = document.createElement("tr");
      const values = [
        step,
        pair.toString(2).padStart(2, "0"),
        format.format(prefix),
        format.format(shiftedRemainder),
        format.format(trial),
        bit,
        format.format(root),
        format.format(remainder),
      ];
      for (const value of values) {
        const cell = row.insertCell();
        cell.textContent = value;
      }
      return row;
    });

    table.replaceChildren(...rows);
    const { root, remainder } = steps.at(-1);
    result.value = `Root ${format.format(root)} · Remainder ${format.format(remainder)} · ${format.format(root ** 2)} ≤ ${format.format(number)} < ${format.format((root + 1) ** 2)}`;
  }

  input.addEventListener("input", () => input.setCustomValidity(""));
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    calculate();
  });
  calculate();
  form.closest(".isqrt-explorer").hidden = false;
}
