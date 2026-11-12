function squareRootSteps(input) {
  const steps = [];
  let prefix = 0n;
  let root = 0n;
  let remainder = 0n;
  const bigInput = BigInt(input);

  for (let pairIndex = 15; pairIndex >= 0; pairIndex--) {
    const shift = BigInt(2 * pairIndex);
    const pair = Number((bigInput >> shift) & 3n);
    const bigPair = BigInt(pair);
    const shiftedRemainder = (remainder << 2n) | bigPair;
    const trial = (root << 2n) | 1n;
    const bit = shiftedRemainder >= trial ? 1n : 0n;

    prefix = (prefix << 2n) | bigPair;
    root = (root << 1n) | bit;
    remainder = shiftedRemainder - bit * trial;
    steps.push({
      step: 16 - pairIndex,
      pair,
      prefix: Number(prefix),
      shiftedRemainder: Number(shiftedRemainder),
      trial: Number(trial),
      bit: Number(bit),
      root: Number(root),
      remainder: Number(remainder),
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
    const rawVal = input.value.replace(/,/g, "").trim();
    const number = Number(rawVal);
    if (isNaN(number) || number < 0 || number > 0xffffffff || !Number.isInteger(number)) {
      input.setCustomValidity("Enter an integer from 0 to 4,294,967,295.");
      input.reportValidity();
      return;
    }
    input.setCustomValidity("");

    const steps = squareRootSteps(number);
    const rows = steps.map(({ step, pair, prefix, shiftedRemainder, trial, bit, root, remainder }) => {
      const row = document.createElement("tr");
      if (bit === 1) {
        row.classList.add("step-active");
      }
      const rowHeading = document.createElement("th");
      rowHeading.scope = "row";
      rowHeading.textContent = step;
      row.append(rowHeading);

      const values = [
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
    const lastStep = steps[steps.length - 1];
    const rootVal = lastStep.root;
    const remVal = lastStep.remainder;
    const rootSq = BigInt(rootVal) * BigInt(rootVal);
    const nextRootSq = BigInt(rootVal + 1) * BigInt(rootVal + 1);

    result.innerHTML = `<span class="res-pill"><strong>Root (rd):</strong> ${format.format(rootVal)}</span> ` +
                       `<span class="res-pill"><strong>Remainder:</strong> ${format.format(remVal)}</span> ` +
                       `<span class="res-formula">${format.format(rootSq)} ≤ ${format.format(number)} &lt; ${format.format(nextRootSq)}</span>`;
  }

  input.addEventListener("input", () => input.setCustomValidity(""));
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    calculate();
  });

  // Preset chips handler
  document.querySelectorAll(".preset-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      input.value = chip.getAttribute("data-value");
      calculate();
    });
  });

  calculate();
  const explorer = form.closest(".isqrt-explorer");
  if (explorer) {
    explorer.hidden = false;
  }
}
