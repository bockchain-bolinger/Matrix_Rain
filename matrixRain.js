const canvas = document.getElementById("matrix");
const ctx = canvas.getContext("2d");
const fpsEl = document.getElementById("fps");
const qualitySelect = document.getElementById("quality");
const themeSelect = document.getElementById("theme");
const colorIndicator = document.getElementById("colorIndicator");

const fontSize = 20;
const chars = Array.from({ length: 96 }, (_, i) =>
  String.fromCharCode(0x30A0 + i)
);

let columns = 0;
let drops = [];
let columnWidth = fontSize;
let speed = 50;
let lastTime = 0;
let resizePending = false;
let fpsLast = 0;
let fpsFrames = 0;
let quality = "high";
let autoQuality = "high";
let lastAutoAdjust = 0;
let theme = "matrix";
let bufferCanvas = null;
let bufferCtx = null;
const minFrameMs = 16;
const fpsIntervalMs = 500;
const autoAdjustCooldownMs = 1500;
const qualitySettings = {
  high: { columnScale: 1, trailAlpha: 0.05 },
  medium: { columnScale: 1.5, trailAlpha: 0.06 },
  low: { columnScale: 2, trailAlpha: 0.08 }
};
const themeSettings = {
  matrix: { color: "#00ff00" },
  cyber: { color: "#00f6ff" },
  blue: { color: "#3a7bff" },
  amber: { color: "#ffb000" },
  ice: { color: "#9bf7ff" },
  cycle: { colors: ["#00ff00", "#00f6ff", "#ffb000", "#ff4d4d", "#9bf7ff"] }
};

function getActiveQuality() {
  return quality === "auto" ? autoQuality : quality;
}

function getActiveColor(timestamp) {
  if (theme === "cycle") {
    const palette = themeSettings.cycle.colors;
    const index = Math.floor(timestamp / 200) % palette.length;
    return palette[index];
  }
  return themeSettings[theme].color;
}

function ensureBuffer(width, height) {
  if (!bufferCanvas) {
    bufferCanvas = typeof OffscreenCanvas !== "undefined"
      ? new OffscreenCanvas(width, height)
      : document.createElement("canvas");
  }
  bufferCanvas.width = width;
  bufferCanvas.height = height;
  bufferCtx = bufferCanvas.getContext("2d");
  bufferCtx.font = `${fontSize}px monospace`;
  bufferCtx.imageSmoothingEnabled = false;
  ctx.imageSmoothingEnabled = false;
}

function resizeCanvas() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  canvas.width = width;
  canvas.height = height;

  const densityScale = Math.max(1, Math.floor(width / 1200));
  const activeQuality = getActiveQuality();
  const qualityScale = qualitySettings[activeQuality].columnScale;
  columnWidth = fontSize * densityScale * qualityScale;
  columns = Math.floor(width / columnWidth);
  drops = Array(columns).fill(1);
  ensureBuffer(width, height);
}

function drawMatrix(timestamp) {
  const activeQuality = getActiveQuality();
  const trailAlpha = qualitySettings[activeQuality].trailAlpha;
  bufferCtx.globalAlpha = trailAlpha;
  bufferCtx.fillStyle = "#000";
  bufferCtx.fillRect(0, 0, bufferCanvas.width, bufferCanvas.height);
  bufferCtx.globalAlpha = 1;

  const color = getActiveColor(timestamp);
  bufferCtx.fillStyle = color;
  if (colorIndicator) {
    colorIndicator.style.backgroundColor = color;
    colorIndicator.style.borderColor = color;
  }

  for (let x = 0; x < drops.length; x++) {
    const y = drops[x];
    const text = chars[(Math.random() * chars.length) | 0];
    bufferCtx.fillText(text, x * columnWidth, y * fontSize);

    if (y * fontSize > canvas.height && Math.random() > 0.975) {
      drops[x] = 0;
    }
    drops[x]++;
  }

  ctx.drawImage(bufferCanvas, 0, 0);
}

function animate(timestamp) {
  if (timestamp - lastTime >= speed) {
    lastTime = timestamp;
    drawMatrix(timestamp);
    fpsFrames++;
    if (timestamp - fpsLast >= fpsIntervalMs) {
      const fps = Math.round((fpsFrames * 1000) / (timestamp - fpsLast));
      fpsEl.textContent = `FPS: ${fps}`;
      if (quality === "auto" && timestamp - lastAutoAdjust >= autoAdjustCooldownMs) {
        let nextQuality = autoQuality;
        if (fps < 30) {
          nextQuality = "low";
        } else if (fps < 45) {
          nextQuality = "medium";
        } else if (fps > 55) {
          nextQuality = "high";
        }
        if (nextQuality !== autoQuality) {
          autoQuality = nextQuality;
          resizeCanvas();
        }
        lastAutoAdjust = timestamp;
      }
      fpsLast = timestamp;
      fpsFrames = 0;
    }
  }
  requestAnimationFrame(animate);
}

window.addEventListener("resize", () => {
  if (resizePending) return;
  resizePending = true;
  requestAnimationFrame(() => {
    resizePending = false;
    resizeCanvas();
  });
});

document.getElementById("speedUp").addEventListener("click", () => {
  speed = Math.max(minFrameMs, speed - 10);
});

document.getElementById("speedDown").addEventListener("click", () => {
  speed = Math.min(200, speed + 10);
});

qualitySelect.addEventListener("change", () => {
  quality = qualitySelect.value;
  if (quality !== "auto") {
    autoQuality = quality;
  }
  resizeCanvas();
});

themeSelect.addEventListener("change", () => {
  theme = themeSelect.value;
});

resizeCanvas();
fpsLast = performance.now();
requestAnimationFrame(animate);
