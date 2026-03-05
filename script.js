function ruler() {
  document.addEventListener("DOMContentLoaded", () => {
    const viewport = document.getElementById("rulerViewport");
    const content = document.getElementById("rulerContent");
    const elFeet = document.getElementById("valueFeet");
    const elInches = document.getElementById("valueInches");
    const elUnitFt = document.getElementById("unitFt");
    const elUnitIn = document.getElementById("unitIn");
    const radioCm = document.getElementById("height-cm");
    const radioFt = document.getElementById("height-ft");

    if (!viewport) return;

    const PX_PER_INCH = 12;
    const PX_PER_CM = PX_PER_INCH / 2.54;
    const CFG = {
      ft: { min: 48, max: 84, px: PX_PER_INCH },
      cm: { min: 120, max: 220, px: PX_PER_CM },
    };
    let unit = "ft";
    let snapTimer = null;
    let lastTick = null;

    let audioCtx = null;
    function ensureAudio() {
      if (!audioCtx)
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === "suspended") audioCtx.resume();
    }
    function playTick() {
      try {
        ensureAudio();
        const ctx = audioCtx;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = 1200;
        osc.connect(gain);
        gain.connect(ctx.destination);
        const t = ctx.currentTime;
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.exponentialRampToValueAtTime(0.18, t + 0.002);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.055);
        osc.start(t);
        osc.stop(t + 0.06);
      } catch (_) {}
    }

    function buildRuler(u) {
      const c = CFG[u];
      const pad = viewport.clientHeight / 2;
      content.innerHTML = "";
      const range = c.max - c.min;
      content.style.height = Math.ceil(range * c.px + pad * 2) + "px";
      content.style.paddingTop = pad + "px";

      const frag = document.createDocumentFragment();
      if (u === "ft") {
        for (let i = c.min; i <= c.max; i++) {
          const y = pad + Math.round((i - c.min) * c.px);
          const tick = document.createElement("div");
          tick.className = "ruler-tick";
          tick.style.top = y + "px";
          if (i % 12 === 0) tick.classList.add("long");
          else if (i % 6 === 0) tick.classList.add("medium");
          else tick.classList.add("small");
          if (i % 12 === 0) {
            const lbl = document.createElement("div");
            lbl.className = "ruler-label";
            lbl.textContent = (i / 12).toString();
            lbl.style.top = y + "px";
            frag.appendChild(lbl);
          }
          frag.appendChild(tick);
        }
      } else {
        for (let cm = c.min; cm <= c.max; cm++) {
          const y = pad + Math.round((cm - c.min) * c.px);
          const tick = document.createElement("div");
          tick.className = "ruler-tick";
          tick.style.top = y + "px";
          if (cm % 10 === 0) tick.classList.add("long");
          else if (cm % 5 === 0) tick.classList.add("medium");
          else tick.classList.add("small");
          if (cm % 10 === 0) {
            const lbl = document.createElement("div");
            lbl.className = "ruler-label";
            lbl.textContent = cm.toString();
            lbl.style.top = y + "px";
            frag.appendChild(lbl);
          }
          frag.appendChild(tick);
        }
      }
      content.appendChild(frag);
    }

    function updateDisplay() {
      const c = CFG[unit];
      const raw = c.min + viewport.scrollTop / c.px;
      const value = Math.max(c.min, Math.min(c.max, raw));
      if (unit === "ft") {
        const totalIn = Math.round(value);
        const feet = Math.floor(totalIn / 12);
        const inches = totalIn % 12;
        elFeet.textContent = feet;
        elInches.textContent = inches;
        if (elUnitFt) elUnitFt.textContent = "ft";
        if (elUnitIn) elUnitIn.textContent = "in";
        if (lastTick !== totalIn) {
          if (lastTick !== null) playTick();
          lastTick = totalIn;
        }
      } else {
        const cm = Math.round(value);
        elFeet.textContent = cm;
        elInches.textContent = "";
        if (elUnitFt) elUnitFt.textContent = "cm";
        if (elUnitIn) elUnitIn.textContent = "";
        if (lastTick !== cm) {
          if (lastTick !== null) playTick();
          lastTick = cm;
        }
      }
    }

    function snap() {
      const c = CFG[unit];
      const raw = c.min + viewport.scrollTop / c.px;
      const snapped = Math.round(Math.max(c.min, Math.min(c.max, raw)));
      const target = (snapped - c.min) * c.px;
      viewport.scrollTo({ top: target, behavior: "smooth" });
    }

    let rafId = null;
    viewport.addEventListener(
      "scroll",
      () => {
        if (!rafId)
          rafId = requestAnimationFrame(() => {
            updateDisplay();
            rafId = null;
          });
        if (snapTimer) clearTimeout(snapTimer);
        snapTimer = setTimeout(snap, 140);
      },
      { passive: true },
    );

    let dragging = false;
    let dragStartY = 0;
    let dragStartS = 0;

    viewport.addEventListener("pointerdown", (e) => {
      if (e.button !== 0 && e.pointerType === "mouse") return;
      dragging = true;
      dragStartY = e.clientY;
      dragStartS = viewport.scrollTop;
      viewport.setPointerCapture(e.pointerId);
      ensureAudio();
      if (snapTimer) {
        clearTimeout(snapTimer);
        snapTimer = null;
      }
    });

    viewport.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      const delta = dragStartY - e.clientY;
      viewport.scrollTop = dragStartS + delta;
    });

    const stopDrag = (e) => {
      if (!dragging) return;
      dragging = false;
      try {
        viewport.releasePointerCapture(e.pointerId);
      } catch (_) {}
      snap();
    };
    viewport.addEventListener("pointerup", stopDrag);
    viewport.addEventListener("pointercancel", stopDrag);

    function switchUnit(u, defaultVal) {
      unit = u;
      lastTick = null;
      buildRuler(u);
      viewport.scrollTop = (defaultVal - CFG[u].min) * CFG[u].px;
      updateDisplay();
    }

    radioCm.addEventListener("change", () => {
      if (radioCm.checked) switchUnit("cm", 170);
    });
    radioFt.addEventListener("change", () => {
      if (radioFt.checked) switchUnit("ft", 67);
    });

    radioFt.checked = true;
    switchUnit("ft", 67);

    document.addEventListener("pointerdown", function unlock() {
      ensureAudio();
      document.removeEventListener("pointerdown", unlock);
    });
  });
}

function weightRuler() {
  document.addEventListener("DOMContentLoaded", () => {
    const viewport = document.getElementById("weightViewport");
    const content = document.getElementById("weightContent");
    const elValue = document.getElementById("weightValue");
    const elUnit = document.getElementById("weightUnit");
    const radioKg = document.getElementById("weight-kg");
    const radioLb = document.getElementById("weight-lb");

    if (!viewport) return;

    const PX_PER_KG = 14;
    const PX_PER_LB = PX_PER_KG * 0.453592;
    const CFG = {
      kg: { min: 30, max: 200, px: PX_PER_KG },
      lb: { min: 66, max: 440, px: PX_PER_LB },
    };
    let unit = "kg";
    let snapTimer = null;
    let lastTick = null;

    let audioCtx = null;
    function ensureAudio() {
      if (!audioCtx)
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === "suspended") audioCtx.resume();
    }
    function playTick() {
      try {
        ensureAudio();
        const ctx = audioCtx;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = 1100;
        osc.connect(gain);
        gain.connect(ctx.destination);
        const t = ctx.currentTime;
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.exponentialRampToValueAtTime(0.18, t + 0.002);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.055);
        osc.start(t);
        osc.stop(t + 0.06);
      } catch (_) {}
    }

    function buildRuler(u) {
      const c = CFG[u];
      const pad = viewport.clientWidth / 2;
      content.innerHTML = "";
      const range = c.max - c.min;
      content.style.width = Math.ceil(range * c.px + pad * 2) + "px";
      content.style.height = "100%";

      const frag = document.createDocumentFragment();
      for (let i = c.min; i <= c.max; i++) {
        const x = pad + Math.round((i - c.min) * c.px);
        const tick = document.createElement("div");
        tick.className = "w-tick";
        tick.style.left = x + "px";
        if (i % 10 === 0) tick.classList.add("long");
        else if (i % 5 === 0) tick.classList.add("medium");
        else tick.classList.add("small");
        if (i % 10 === 0) {
          const lbl = document.createElement("div");
          lbl.className = "w-label";
          lbl.textContent = i.toString();
          lbl.style.left = x + "px";
          frag.appendChild(lbl);
        }
        frag.appendChild(tick);
      }
      content.appendChild(frag);
    }

    function updateDisplay() {
      const c = CFG[unit];
      const raw = c.min + viewport.scrollLeft / c.px;
      const value = Math.max(c.min, Math.min(c.max, raw));
      const rounded = Math.round(value);
      elValue.textContent = rounded;
      elUnit.textContent = unit.toUpperCase();
      if (lastTick !== rounded) {
        if (lastTick !== null) playTick();
        lastTick = rounded;
      }
    }

    function snap() {
      const c = CFG[unit];
      const raw = c.min + viewport.scrollLeft / c.px;
      const snapped = Math.round(Math.max(c.min, Math.min(c.max, raw)));
      const target = (snapped - c.min) * c.px;
      viewport.scrollTo({ left: target, behavior: "smooth" });
    }

    let rafId = null;
    viewport.addEventListener(
      "scroll",
      () => {
        if (!rafId)
          rafId = requestAnimationFrame(() => {
            updateDisplay();
            rafId = null;
          });
        if (snapTimer) clearTimeout(snapTimer);
        snapTimer = setTimeout(snap, 140);
      },
      { passive: true },
    );

    let dragging = false;
    let dragStartX = 0;
    let dragStartS = 0;

    viewport.addEventListener("pointerdown", (e) => {
      if (e.button !== 0 && e.pointerType === "mouse") return;
      dragging = true;
      dragStartX = e.clientX;
      dragStartS = viewport.scrollLeft;
      viewport.setPointerCapture(e.pointerId);
      ensureAudio();
      if (snapTimer) {
        clearTimeout(snapTimer);
        snapTimer = null;
      }
    });

    viewport.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      const delta = dragStartX - e.clientX;
      viewport.scrollLeft = dragStartS + delta;
    });

    const stopDrag = (e) => {
      if (!dragging) return;
      dragging = false;
      try {
        viewport.releasePointerCapture(e.pointerId);
      } catch (_) {}
      snap();
    };
    viewport.addEventListener("pointerup", stopDrag);
    viewport.addEventListener("pointercancel", stopDrag);

    // ── unit switch ───────────────────────────────────────────
    function switchUnit(u, defaultVal) {
      unit = u;
      lastTick = null;
      buildRuler(u);
      viewport.scrollLeft = (defaultVal - CFG[u].min) * CFG[u].px;
      updateDisplay();
    }

    radioKg.addEventListener("change", () => {
      if (radioKg.checked) switchUnit("kg", 70);
    });
    radioLb.addEventListener("change", () => {
      if (radioLb.checked) switchUnit("lb", 154);
    });

    // ── init ─────────────────────────────────────────────────
    radioKg.checked = true;
    switchUnit("kg", 70);

    document.addEventListener("pointerdown", function unlock() {
      ensureAudio();
      document.removeEventListener("pointerdown", unlock);
    });
  });
}

function loadFeatures() {
  const Features = [
    {
      title: "Smart Unit Conversion",
      description:
        "Effortlessly switch between metric and imperial units for weight and height, making it easy to use no matter where you are in the world.",
    },
    {
      title: "Accurate BMI Calculation",
      description:
        "Our calculator uses the standard BMI formula to provide accurate results based on your weight and height inputs, ensuring you get reliable insights into your health.",
    },
    {
      title: "Instant Calculations",
      description:
        "Get your BMI calculated in real-time as you input your weight and height, providing immediate feedback on your health status.",
    },
    {
      title: "Health Insights",
      description:
        "Receive personalized insights based on your BMI, including health recommendations and tips for maintaining a healthy lifestyle.",
    },
    {
      title: "History Tracking",
      description:
        "Keep track of your BMI history with our built-in tracking feature, allowing you to monitor your progress over time.",
    },
    {
      title: "User-Friendly Interface",
      description:
        "Enjoy a clean and intuitive design that makes it easy for anyone to use the BMI calculator without any hassle.",
    },
  ];

  const featureCards = document.getElementById("feature-cards");

  let card = "";

  Features.forEach((feature) => {
    card += `
<div class="feature-card">
            <h3>${feature.title}</h3>
            <p>
              ${feature.description}
            </p>
            <div class="blob-card"></div>
          </div>
    `;
  });

  featureCards.innerHTML = card;
}

function loadBMICategories() {
  const BMICategories = [
    {
      category: "Underweight",
      range: "BMI < 18.5",
      color: "#f39c12",
    },
    {
      category: "Normal weight",
      range: "18.5 ≤ BMI < 24.9",
      color: "#27ae60",
    },
    {
      category: "Overweight",
      range: "25 ≤ BMI < 29.9",
      color: "#e67e22",
    },
    {
      category: "Obesity",
      range: "BMI ≥ 30",
      color: "#c0392b",
    },
  ];

  const bmiCategories = document.getElementById("bmi-categories");

  let categoryCards = "";

  BMICategories.forEach((bmiCategory) => {
    categoryCards += `
    <div class="bmi-category">
      <div class="content">
      <h4>${bmiCategory.category}</h4>
      <p>${bmiCategory.range}</p>
      </div>
      <div class="circle" style="background: ${bmiCategory.color}"></div>
    </div>
    `;
  });

  bmiCategories.innerHTML = categoryCards;
}

function viewHistory() {
  loadHistory();
  const screens = ["landing", "steps", "result"];
  const current =
    screens.find((id) =>
      document.getElementById(id).classList.contains("active"),
    ) || "landing";
  nextStep(current, "history");
}

function loadHistory() {
  const saved = JSON.parse(localStorage.getItem("historyBMI") || "[]");
  const list = document.getElementById("history-list");

  if (saved.length === 0) {
    list.innerHTML = `<div class="history-empty"><p>No history yet. Calculate your BMI to get started.</p></div>`;
    return;
  }

  list.innerHTML = saved
    .map((item, i) => {
      const colors = {
        Underweight: "#60a5fa",
        "Normal weight": "#00ff91",
        Overweight: "#fbbf24",
        Obese: "#f87171",
      };
      const color = colors[item.category] || "#c6c6c6";
      return `
    <div class="history-card" id="history-card-${i}">
      <div class="history-card-left">
        <h3 class="history-bmi" style="color:${color}">${item.bmi}</h3>
        <h3 class="history-category" style="color:${color}">${item.category}</h3>
      </div>
      <div class="history-card-info">
        <p>Gender : ${item.gender ? item.gender.charAt(0).toUpperCase() + item.gender.slice(1) : "--"}</p>
        <p>Height : ${item.height}</p>
        <p>Weight : ${item.weight}</p>
      </div>
      <button class="btn delete" onclick="deleteHistoryItem(${i})">
      Delete
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="3 6 5 6 21 6"/>
          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
          <path d="M10 11v6M14 11v6"/>
          <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
        </svg>
        
      </button>
    </div>`;
    })
    .join("");
}

function deleteHistoryItem(index) {
  const saved = JSON.parse(localStorage.getItem("historyBMI") || "[]");
  saved.splice(index, 1);
  localStorage.setItem("historyBMI", JSON.stringify(saved));
  historyData = saved;
  loadHistory();
}

function goBack() {
  if (document.getElementById("history").classList.contains("active")) {
    nextStep("history", "landing");
    return;
  }

  if (document.getElementById("result").classList.contains("active")) {
    nextStep("result", "landing");
    document.getElementById("step-height").classList.remove("active");
    document.getElementById("step-weight").classList.remove("active");
    document.getElementById("step-gender").classList.add("active");
    return;
  }

  const steps = ["step-gender", "step-height", "step-weight"];
  const active = steps.find((id) =>
    document.getElementById(id).classList.contains("active"),
  );

  if (!active || active === "step-gender") {
    nextStep("steps", "landing");
    nextStep("step-height", "step-gender");
    nextStep("step-weight", "step-gender");
    document.getElementById("step-gender").classList.add("active");
  } else if (active === "step-height") {
    nextStep("step-height", "step-gender");
  } else if (active === "step-weight") {
    nextStep("step-weight", "step-height");
  }
}

function nextStep(current, next) {
  document.getElementById(current).classList.remove("active");
  document.getElementById(next).classList.add("active");
}

const form = document.getElementById("steps");

form.addEventListener("submit", (e) => {
  e.preventDefault();

  calculateBMI();
  nextStep("steps", "result");
});

let historyData = JSON.parse(localStorage.getItem("historyBMI") || "[]");

function calculateBMI() {
  const formData = new FormData(form);

  const heightUnit = formData.get("height");
  const weightUnit = formData.get("weight");

  const feetVal = document.getElementById("valueFeet").textContent;
  const inchesVal = document.getElementById("valueInches").textContent;
  const weightVal = document.getElementById("weightValue").textContent;

  const data = {
    gender: formData.get("gender"),
    height:
      heightUnit === "ft" ? `${feetVal}ft ${inchesVal}in` : `${feetVal}cm`,
    heightUnit,
    weight: `${weightVal}${weightUnit}`,
    weightUnit,
  };

  const bmi = calculateBMIValue(
    feetVal,
    inchesVal,
    weightVal,
    heightUnit,
    weightUnit,
  );
  data.bmi = bmi.toFixed(1);

  let category = "";
  let categoryClass = "";
  if (bmi < 18.5) {
    category = "Underweight";
    categoryClass = "category-underweight";
  } else if (bmi < 25) {
    category = "Normal weight";
    categoryClass = "category-normal";
  } else if (bmi < 30) {
    category = "Overweight";
    categoryClass = "category-overweight";
  } else {
    category = "Obese";
    categoryClass = "category-obese";
  }

  data.category = category;

  historyData.push(data);
  localStorage.setItem("historyBMI", JSON.stringify(historyData));

  const bmiRounded = bmi.toFixed(1);
  document.getElementById("bmiValue").textContent = bmiRounded;

  const catEl = document.getElementById("bmiCategory");
  catEl.textContent = category;
  catEl.className = categoryClass;

  drawSpeedometer(bmi);

  form.reset();
}

function speedoPoint(bmiVal, r) {
  const BMI_MIN = 10,
    BMI_MAX = 40;
  const clamped = Math.min(Math.max(bmiVal, BMI_MIN), BMI_MAX);
  const angleDeg = 180 - ((clamped - BMI_MIN) / (BMI_MAX - BMI_MIN)) * 180;
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: 200 + r * Math.cos(rad),
    y: 200 - r * Math.sin(rad),
    angleDeg,
  };
}

function arcPath(bmiFrom, bmiTo, r) {
  const p1 = speedoPoint(bmiFrom, r);
  const p2 = speedoPoint(bmiTo, r);

  return `M ${p1.x.toFixed(2)} ${p1.y.toFixed(2)} A ${r} ${r} 0 0 1 ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
}

function drawSpeedometer(bmiVal) {
  const zones = [
    { from: 10, to: 18.5, color: "#60a5fa" },
    { from: 18.5, to: 25, color: "#00ff91" },
    { from: 25, to: 30, color: "#fbbf24" },
    { from: 30, to: 40, color: "#f87171" },
  ];

  const R = 164;
  const zonesGroup = document.getElementById("speedoZones");
  zonesGroup.innerHTML = "";

  zones.forEach((z) => {
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", arcPath(z.from, z.to, R));
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", z.color);
    path.setAttribute("stroke-width", "34");
    path.setAttribute("stroke-linecap", "butt");
    path.setAttribute("opacity", "1");
    zonesGroup.appendChild(path);
  });

  const needleColor =
    bmiVal < 18.5
      ? "#60a5fa"
      : bmiVal < 25
        ? "#00ff91"
        : bmiVal < 30
          ? "#fbbf24"
          : "#f87171";

  const needle = document.getElementById("speedoNeedle");
  needle.setAttribute("stroke", needleColor);

  const target = speedoPoint(bmiVal, 125);
  const startX = 200 - 125;
  const startY = 200;

  let start = null;
  const DURATION = 1200;

  function animate(ts) {
    if (!start) start = ts;
    const progress = Math.min((ts - start) / DURATION, 1);

    const eased = 1 - Math.pow(1 - progress, 3);
    const cx = startX + (target.x - startX) * eased;
    const cy = startY + (target.y - startY) * eased;
    needle.setAttribute("x2", cx.toFixed(2));
    needle.setAttribute("y2", cy.toFixed(2));
    if (progress < 1) requestAnimationFrame(animate);
  }

  requestAnimationFrame(animate);
}

function calculateBMIValue(feet, inches, weight, heightUnit, weightUnit) {
  let heightInMeters;
  let weightInKg;

  if (heightUnit === "ft") {
    const totalInches = parseInt(feet) * 12 + parseInt(inches);
    heightInMeters = totalInches * 0.0254;
  }

  if (heightUnit === "cm") {
    heightInMeters = parseInt(feet) / 100;
  }

  if (weightUnit === "kg") {
    weightInKg = parseInt(weight);
  }

  if (weightUnit === "lb") {
    weightInKg = parseInt(weight) * 0.453592;
  }

  const bmi = weightInKg / (heightInMeters * heightInMeters);
  return bmi;
}

loadFeatures();
loadBMICategories();
ruler();
weightRuler();
