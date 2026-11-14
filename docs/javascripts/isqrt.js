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
    const prevRoot = Number(root);
    const prevRemainder = Number(remainder);
    const shiftedRemainder = (remainder << 2n) | bigPair;
    const trial = (root << 2n) | 1n;
    const bit = shiftedRemainder >= trial ? 1n : 0n;

    prefix = (prefix << 2n) | bigPair;
    root = (root << 1n) | bit;
    remainder = shiftedRemainder - bit * trial;
    steps.push({
      step: 16 - pairIndex,
      pairIndex,
      pair,
      pairBin: pair.toString(2).padStart(2, "0"),
      prevRoot,
      prevRemainder,
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
  const pairsContainer = document.querySelector("#isqrt-pairs");
  const stageCardsContainer = document.querySelector("#isqrt-stage-cards");
  const stageBadge = document.querySelector("#isqrt-stage-badge");
  const prevBtn = document.querySelector("#isqrt-prev");
  const nextBtn = document.querySelector("#isqrt-next");
  const playBtn = document.querySelector("#isqrt-play");
  const format = new Intl.NumberFormat("en-US");

  let currentSteps = [];
  let currentNumber = 144;
  let selectedIdx = 15;
  let playTimer = null;

  function stopPlayback() {
    if (playTimer !== null) {
      clearInterval(playTimer);
      playTimer = null;
    }
    if (playBtn) {
      playBtn.textContent = "▶ Play 16 Stages";
    }
  }

  function renderStage(idx) {
    if (!currentSteps.length) return;
    selectedIdx = Math.max(0, Math.min(15, idx));
    const s = currentSteps[selectedIdx];
    const taken = s.shiftedRemainder >= s.trial;

    if (stageBadge) {
      stageBadge.textContent = `Stage ${String(s.step).padStart(2, "0")} / 16 · Pair p${s.pairIndex} = ${s.pairBin}₂`;
    }

    // Update 16 bit-pair pills
    if (pairsContainer) {
      pairsContainer.querySelectorAll(".isqrt-pair-cell").forEach((cell, i) => {
        cell.classList.toggle("is-selected", i === selectedIdx);
        cell.classList.toggle("is-past", i < selectedIdx);
      });
    }

    // Update 4 clean hardware stage cards
    if (stageCardsContainer) {
      stageCardsContainer.innerHTML = `
        <div class="isqrt-stage-card">
          <div class="isqrt-card-head">
            <span>Stage 1 : Candidate</span>
            <code>T = 4R + b</code>
          </div>
          <div class="isqrt-card-eq">T = (${format.format(s.prevRemainder)} &lt;&lt; 2) | ${s.pair}</div>
          <div class="isqrt-card-foot">
            <span>Candidate T</span>
            <strong>${format.format(s.shiftedRemainder)}</strong>
          </div>
        </div>
        <div class="isqrt-stage-card">
          <div class="isqrt-card-head">
            <span>Stage 2 : Trial Value</span>
            <code>D = 4Q + 1</code>
          </div>
          <div class="isqrt-card-eq">D = (${format.format(s.prevRoot)} &lt;&lt; 2) | 1</div>
          <div class="isqrt-card-foot">
            <span>Trial D</span>
            <strong>${format.format(s.trial)}</strong>
          </div>
        </div>
        <div class="isqrt-stage-card">
          <div class="isqrt-card-head">
            <span>Stage 3 : Compare</span>
            <code class="${taken ? "code-taken" : ""}">${taken ? "T ≥ D (Subtract)" : "T < D (Keep T)"}</code>
          </div>
          <div class="isqrt-card-eq">${format.format(s.shiftedRemainder)} ${taken ? "≥" : "&lt;"} ${format.format(s.trial)} → R = ${format.format(s.remainder)}</div>
          <div class="isqrt-card-foot">
            <span>Root Bit q</span>
            <strong>q = ${s.bit}</strong>
          </div>
        </div>
        <div class="isqrt-stage-card">
          <div class="isqrt-card-head">
            <span>${selectedIdx === 15 ? "Final Result (rd)" : "Partial Root Q"}</span>
            <code>0x${s.root.toString(16).toUpperCase().padStart(4, "0")}</code>
          </div>
          <div class="isqrt-card-eq">Q = (${format.format(s.prevRoot)} &lt;&lt; 1) | ${s.bit}</div>
          <div class="isqrt-card-foot">
            <span>Accumulated Q</span>
            <strong>${format.format(s.root)}</strong>
          </div>
        </div>
      `;
    }

    // Highlight selected row in table
    if (table) {
      table.querySelectorAll("tr").forEach((tr, i) => {
        tr.classList.toggle("step-selected", i === selectedIdx);
      });
    }
  }

  function calculate() {
    stopPlayback();
    const rawVal = input.value.replace(/,/g, "").trim();
    const number = Number(rawVal);
    if (isNaN(number) || number < 0 || number > 0xffffffff || !Number.isInteger(number)) {
      input.setCustomValidity("Enter an integer from 0 to 4,294,967,295.");
      input.reportValidity();
      return;
    }
    input.setCustomValidity("");
    currentNumber = number;
    currentSteps = squareRootSteps(number);

    // Render 16 clickable bit-pair boxes
    if (pairsContainer) {
      const pairEls = currentSteps.map((s, idx) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "isqrt-pair-cell" + (s.bit === 1 ? " has-one" : "");
        btn.setAttribute("role", "listitem");
        btn.innerHTML = `<span class="pair-idx">p${s.pairIndex}</span><span class="pair-bits">${s.pairBin}</span>`;
        btn.addEventListener("click", () => {
          stopPlayback();
          renderStage(idx);
        });
        return btn;
      });
      pairsContainer.replaceChildren(...pairEls);
    }

    // Render 16-row table
    const rows = currentSteps.map((s, idx) => {
      const row = document.createElement("tr");
      if (s.bit === 1) {
        row.classList.add("step-active");
      }
      row.addEventListener("click", () => {
        stopPlayback();
        renderStage(idx);
      });

      const rowHeading = document.createElement("th");
      rowHeading.scope = "row";
      rowHeading.textContent = s.step;
      row.append(rowHeading);

      const values = [
        s.pairBin,
        format.format(s.prefix),
        format.format(s.shiftedRemainder),
        format.format(s.trial),
        s.bit,
        format.format(s.root),
        format.format(s.remainder),
      ];
      for (const value of values) {
        const cell = row.insertCell();
        cell.textContent = value;
      }
      return row;
    });

    table.replaceChildren(...rows);

    const lastStep = currentSteps[currentSteps.length - 1];
    const rootVal = lastStep.root;
    const remVal = lastStep.remainder;
    const rootSq = BigInt(rootVal) * BigInt(rootVal);
    const nextRootSq = BigInt(rootVal + 1) * BigInt(rootVal + 1);
    const hexInput = "0x" + number.toString(16).toUpperCase().padStart(8, "0");

    result.innerHTML =
      `<span class="res-pill"><strong>Hex:</strong> ${hexInput}</span>` +
      `<span class="res-pill"><strong>Root (rd):</strong> ${format.format(rootVal)}</span>` +
      `<span class="res-pill"><strong>Remainder:</strong> ${format.format(remVal)}</span>` +
      `<span class="res-formula">${format.format(rootSq)} ≤ ${format.format(number)} &lt; ${format.format(nextRootSq)}</span>`;

    // Highlight active chip
    document.querySelectorAll(".preset-chip").forEach((chip) => {
      chip.classList.toggle("is-active", Number(chip.getAttribute("data-value")) === number);
    });

    renderStage(15);
  }

  if (prevBtn) {
    prevBtn.addEventListener("click", () => {
      stopPlayback();
      renderStage(selectedIdx > 0 ? selectedIdx - 1 : 15);
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener("click", () => {
      stopPlayback();
      renderStage(selectedIdx < 15 ? selectedIdx + 1 : 0);
    });
  }

  if (playBtn) {
    playBtn.addEventListener("click", () => {
      if (playTimer !== null) {
        stopPlayback();
        return;
      }
      // Start from first non-zero pair (or 0 if input is 0) so the user immediately sees action
      const firstActive = Math.max(0, currentSteps.findIndex((s) => s.prefix > 0) - 1);
      renderStage(firstActive >= 0 ? firstActive : 0);
      playBtn.textContent = "⏸ Pause";
      playTimer = setInterval(() => {
        if (selectedIdx < 15) {
          renderStage(selectedIdx + 1);
        } else {
          stopPlayback();
        }
      }, 420);
    });
  }

  input.addEventListener("input", () => input.setCustomValidity(""));
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    calculate();
  });

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
