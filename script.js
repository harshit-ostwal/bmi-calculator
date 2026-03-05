function ruler() {
  // Ruler
  // / height selector
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

    // ── config ───────────────────────────────────────────────
    const PX_PER_INCH = 12;
    const PX_PER_CM = PX_PER_INCH / 2.54;
    const CFG = {
      ft: { min: 48, max: 84, px: PX_PER_INCH }, // 4 ft – 7 ft (in inches)
      cm: { min: 120, max: 220, px: PX_PER_CM }, // 120 – 220 cm
    };
    let unit = "ft";
    let snapTimer = null;
    let lastTick = null;

    // ── Web Audio tick ────────────────────────────────────────
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

    // ── build ticks ───────────────────────────────────────────
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

    // ── update value display ──────────────────────────────────
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

    // ── snap ─────────────────────────────────────────────────
    function snap() {
      const c = CFG[unit];
      const raw = c.min + viewport.scrollTop / c.px;
      const snapped = Math.round(Math.max(c.min, Math.min(c.max, raw)));
      const target = (snapped - c.min) * c.px;
      viewport.scrollTo({ top: target, behavior: "smooth" });
    }

    // ── scroll ───────────────────────────────────────────────
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

    // ── pointer drag ──────────────────────────────────────────
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
      const delta = dragStartY - e.clientY; // drag up = higher value
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

    // ── unit switch ───────────────────────────────────────────
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

    // ── init ─────────────────────────────────────────────────
    radioFt.checked = true;
    switchUnit("ft", 67);

    document.addEventListener("pointerdown", function unlock() {
      ensureAudio();
      document.removeEventListener("pointerdown", unlock);
    });
  });
}

function weightRuler() {
  // Horizontal weight ruler selector
  document.addEventListener("DOMContentLoaded", () => {
    const viewport = document.getElementById("weightViewport");
    const content = document.getElementById("weightContent");
    const elValue = document.getElementById("weightValue");
    const elUnit = document.getElementById("weightUnit");
    const radioKg = document.getElementById("weight-kg");
    const radioLb = document.getElementById("weight-lb");

    if (!viewport) return;

    // ── config ───────────────────────────────────────────────
    const PX_PER_KG = 14;
    const PX_PER_LB = PX_PER_KG * 0.453592; // ~6.35 px/lb
    const CFG = {
      kg: { min: 30, max: 200, px: PX_PER_KG },
      lb: { min: 66, max: 440, px: PX_PER_LB },
    };
    let unit = "kg";
    let snapTimer = null;
    let lastTick = null;

    // ── Web Audio tick ────────────────────────────────────────
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

    // ── build ticks (horizontal) ──────────────────────────────
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

    // ── update value display ──────────────────────────────────
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

    // ── snap ─────────────────────────────────────────────────
    function snap() {
      const c = CFG[unit];
      const raw = c.min + viewport.scrollLeft / c.px;
      const snapped = Math.round(Math.max(c.min, Math.min(c.max, raw)));
      const target = (snapped - c.min) * c.px;
      viewport.scrollTo({ left: target, behavior: "smooth" });
    }

    // ── scroll ───────────────────────────────────────────────
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

    // ── pointer drag (horizontal) ──────────────────────────────
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
      const delta = dragStartX - e.clientX; // drag left = lower, drag right = higher
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

function goBack() {
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

function calculateBMI() {
  const formData = new FormData(form);

  const heightUnit = formData.get("height");
  const weightUnit = formData.get("weight");

  const feet = document.getElementById("valueFeet").textContent;
  const inches = document.getElementById("valueInches").textContent;
  const weight = document.getElementById("weightValue").textContent;

  const data = {
    gender: formData.get("gender"),
    height: heightUnit === "ft" ? `${feet}ft ${inches}in` : `${feet}cm`,
    heightUnit,
    weight: `${weight}${weightUnit}`,
    weightUnit,
  };

  const bmi = calculateBMIValue(feet, inches, weight, heightUnit, weightUnit);
  data.bmi = bmi.toFixed(1);

  return data;
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
