const IMAGE_WIDTH = 1536;
const IMAGE_HEIGHT = 864;
const COIN_RADIUS = 28;
const SCRATCH_THRESHOLD = 0.5;
const STORAGE_KEY = "scratch-and-read-chaos-progress-v1";

// The original artwork appears to show 24 visible gold circles. The
// Apocalypse / Zombie Chaos section lists five books, but the supplied
// coordinate set has only four visible circles there. Set this to true to
// render an estimated fifth synthetic coin for that section.
const SHOW_SYNTHETIC_MISSING_ZOMBIE_COIN = false;

// Adjust scratch zone coordinates here. x/y/r are in pixels relative to the
// original 1536 x 864 artwork and are converted to percentages at render time.
const categories = [
  {
    key: "fantasy",
    label: "Fantasy / Badass FMC",
    color: "#a855f7",
    books: [
      ["bonds-that-tie", "The Bonds That Tie", 49, 353],
      ["kate-daniels", "Kate Daniels", 109, 353],
      ["daughter-of-no-worlds", "Daughter of No Worlds", 169, 353],
      ["age-of-the-andinna", "Age of the Andinna", 228, 353],
      ["the-fifth-nicnevin", "The Fifth Nicnevin", 287, 353],
    ],
  },
  {
    key: "rh",
    label: "RH / Found Family Chaos",
    color: "#ff4aa2",
    books: [
      ["all-the-pretty-monsters", "All the Pretty Monsters", 369, 353],
      ["ruthless-boys", "Ruthless Boys of the Zodiac", 426, 353],
      ["kit-davenport", "Kit Davenport", 483, 353],
      ["curse-of-the-gods", "Curse of the Gods", 541, 353],
      ["the-dark-side", "The Dark Side", 597, 353],
    ],
  },
  {
    key: "zombie",
    label: "Apocalypse / Zombie Chaos",
    color: "#8bdc42",
    books: [
      ["zombie-fallout", "Zombie Fallout", 677, 353],
      ["adrians-undead-diary", "Adrian's Undead Diary", 739, 353],
      ["mountain-man", "Mountain Man", 800, 353],
      ["double-dead", "Double Dead", 862, 353],
    ],
  },
  {
    key: "monster",
    label: "Supernatural / Monster Hunters",
    color: "#38dce8",
    books: [
      ["dresden-files", "The Dresden Files", 945, 353],
      ["cal-leandros", "Cal Leandros", 1002, 353],
      ["sandman-slim", "Sandman Slim", 1059, 353],
      ["iron-druid", "Iron Druid Chronicles", 1115, 353],
      ["monster-hunter-international", "Monster Hunter International", 1171, 353],
    ],
  },
  {
    key: "comfort",
    label: "Weird Comfort Chaos",
    color: "#f2b84b",
    books: [
      ["murderbot-diaries", "Murderbot Diaries", 1251, 368],
      ["good-omens", "Good Omens", 1310, 368],
      ["cerulean-sea", "The House in the Cerulean Sea", 1370, 368],
      ["raven-cycle", "The Raven Cycle", 1429, 368],
      ["addie-larue", "The Invisible Life of Addie LaRue", 1488, 368],
    ],
  },
];

if (SHOW_SYNTHETIC_MISSING_ZOMBIE_COIN) {
  categories
    .find((category) => category.key === "zombie")
    .books.push(["dungeon-crawler-carl", "Dungeon Crawler Carl", 902, 353, true]);
}

const coins = categories.flatMap((category) =>
  category.books.map(([id, title, x, y, synthetic = false]) => ({
    id: `${category.key}-${id}`,
    title,
    category: category.label,
    color: category.color,
    x,
    y,
    r: COIN_RADIUS,
    synthetic,
  })),
);

const scratchLayer = document.querySelector("#scratchLayer");
const progressText = document.querySelector("#progressText");
const resetButton = document.querySelector("#resetButton");
const markAllButton = document.querySelector("#markAllButton");
const exportButton = document.querySelector("#exportButton");
const importInput = document.querySelector("#importInput");
const artwork = document.querySelector("#artwork");
const missingArtworkNotice = document.querySelector("#missingArtworkNotice");
const categoryRail = document.querySelector("#categoryRail");
const boardShell = document.querySelector(".board-shell");

const state = {
  completed: new Set(loadProgress()),
};

artwork.addEventListener("error", () => {
  missingArtworkNotice.hidden = false;
});

renderCoins();
renderCategoryRail();
updateProgressText();
registerServiceWorker();

resetButton.addEventListener("click", () => {
  state.completed.clear();
  saveProgress();
  document.querySelectorAll(".scratch-zone").forEach((zone) => {
    zone.classList.remove("is-complete");
    drawGoldCover(zone.querySelector("canvas"));
  });
  updateProgressText();
});

markAllButton.addEventListener("click", () => {
  coins.forEach((coin) => completeCoin(coin.id));
});

exportButton.addEventListener("click", () => {
  const payload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    completed: [...state.completed],
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "scratch-and-read-progress.json";
  link.click();
  URL.revokeObjectURL(url);
});

importInput.addEventListener("change", async (event) => {
  const [file] = event.target.files;
  if (!file) return;

  try {
    const data = JSON.parse(await file.text());
    const imported = Array.isArray(data.completed) ? data.completed : [];
    const validIds = new Set(coins.map((coin) => coin.id));
    state.completed = new Set(imported.filter((id) => validIds.has(id)));
    saveProgress();
    renderCoins();
    updateProgressText();
  } catch {
    window.alert("That progress file could not be imported.");
  } finally {
    importInput.value = "";
  }
});

function renderCoins() {
  scratchLayer.replaceChildren(...coins.map(createCoinElement));
}

function renderCategoryRail() {
  if (!categoryRail) return;

  const buttons = categories.map((category) => {
    const firstBook = category.books[0];
    const button = document.createElement("button");
    button.type = "button";
    button.className = "category-jump";
    button.textContent = shortCategoryLabel(category.label);
    button.style.setProperty("--category-color", category.color);
    button.addEventListener("click", () => scrollToCategory(firstBook[2]));
    return button;
  });

  categoryRail.replaceChildren(...buttons);
}

function createCoinElement(coin) {
  const zone = document.createElement("button");
  const diameter = coin.r * 2;
  zone.type = "button";
  zone.className = "scratch-zone";
  zone.dataset.coinId = coin.id;
  zone.setAttribute("aria-label", `${coin.title}, ${coin.category}`);
  zone.style.setProperty("--x", `${(coin.x / IMAGE_WIDTH) * 100}%`);
  zone.style.setProperty("--y", `${(coin.y / IMAGE_HEIGHT) * 100}%`);
  zone.style.setProperty("--d", `${(diameter / IMAGE_WIDTH) * 100}%`);
  zone.style.setProperty("--tick-color", coin.color);
  if (coin.synthetic) {
    zone.title = "Synthetic estimated coin for Dungeon Crawler Carl";
  }

  const tick = document.createElement("span");
  tick.className = "tick";
  tick.setAttribute("aria-hidden", "true");
  tick.textContent = "✓";

  const canvas = document.createElement("canvas");
  canvas.width = 112;
  canvas.height = 112;

  zone.append(tick, canvas);
  attachScratchHandlers(zone, canvas, coin.id);

  if (state.completed.has(coin.id)) {
    zone.classList.add("is-complete");
  } else {
    drawGoldCover(canvas);
  }

  return zone;
}

function attachScratchHandlers(zone, canvas, coinId) {
  const context = canvas.getContext("2d", { willReadFrequently: true });
  const scratch = {
    active: false,
    holdTimer: null,
    moves: 0,
    lastTap: 0,
  };

  zone.addEventListener("pointerdown", (event) => {
    if (state.completed.has(coinId)) return;

    const now = Date.now();
    if (now - scratch.lastTap < 360) {
      completeCoin(coinId);
      return;
    }
    scratch.lastTap = now;

    scratch.active = true;
    scratch.moves = 0;
    zone.classList.add("is-scratching");
    try {
      zone.setPointerCapture(event.pointerId);
    } catch {
      // Synthetic events and a few unusual browser states can reject capture.
      // Scratching still works without capture when the pointer stays on-zone.
    }
    scratchAt(event, canvas, context);

    scratch.holdTimer = window.setTimeout(() => {
      if (scratch.active && scratch.moves <= 1) {
        completeCoin(coinId);
      }
    }, 650);
  });

  zone.addEventListener("pointermove", (event) => {
    if (!scratch.active || state.completed.has(coinId)) return;
    event.preventDefault();
    scratch.moves += 1;
    window.clearTimeout(scratch.holdTimer);
    scratchAt(event, canvas, context);

    if (scratch.moves % 6 === 0 && getScratchRatio(context, canvas) >= SCRATCH_THRESHOLD) {
      completeCoin(coinId);
    }
  });

  zone.addEventListener("pointerup", (event) => finishScratch(event, true));
  zone.addEventListener("pointercancel", (event) => finishScratch(event, false));
  zone.addEventListener("lostpointercapture", () => finishScratch(null, true));

  function finishScratch(event, shouldCheck) {
    if (!scratch.active) return;
    scratch.active = false;
    scratch.moves = 0;
    window.clearTimeout(scratch.holdTimer);
    zone.classList.remove("is-scratching");

    if (event && zone.hasPointerCapture?.(event.pointerId)) {
      try {
        zone.releasePointerCapture(event.pointerId);
      } catch {
        // Capture may already be gone after pointer cancellation.
      }
    }

    if (!state.completed.has(coinId) && shouldCheck && getScratchRatio(context, canvas) >= SCRATCH_THRESHOLD) {
      completeCoin(coinId);
    }
  }
}

function scrollToCategory(sourceX) {
  if (!boardShell) return;

  const boardWidth = boardShell.scrollWidth;
  const viewportWidth = boardShell.clientWidth;
  const target = (sourceX / IMAGE_WIDTH) * boardWidth - viewportWidth * 0.18;

  boardShell.scrollTo({
    left: Math.max(0, Math.min(target, boardShell.scrollWidth - viewportWidth)),
    behavior: "smooth",
  });
}

function shortCategoryLabel(label) {
  return label
    .replace("Fantasy / Badass FMC", "Fantasy")
    .replace("RH / Found Family Chaos", "RH")
    .replace("Apocalypse / Zombie Chaos", "Zombie")
    .replace("Supernatural / Monster Hunters", "Monster")
    .replace("Weird Comfort Chaos", "Comfort");
}

function scratchAt(event, canvas, context) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const x = (event.clientX - rect.left) * scaleX;
  const y = (event.clientY - rect.top) * scaleY;
  const brush = canvas.width * 0.16;

  context.save();
  context.globalCompositeOperation = "destination-out";
  context.beginPath();
  context.arc(x, y, brush, 0, Math.PI * 2);
  context.fill();

  for (let i = 0; i < 5; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() * brush * 1.6;
    context.beginPath();
    context.arc(
      x + Math.cos(angle) * distance,
      y + Math.sin(angle) * distance,
      brush * (0.12 + Math.random() * 0.16),
      0,
      Math.PI * 2,
    );
    context.fill();
  }
  context.restore();
}

function drawGoldCover(canvas) {
  const context = canvas.getContext("2d");
  const { width, height } = canvas;
  context.clearRect(0, 0, width, height);

  const gradient = context.createRadialGradient(
    width * 0.34,
    height * 0.28,
    width * 0.04,
    width * 0.5,
    height * 0.5,
    width * 0.54,
  );
  gradient.addColorStop(0, "#fff0a6");
  gradient.addColorStop(0.35, "#f4cf48");
  gradient.addColorStop(0.76, "#d49a23");
  gradient.addColorStop(1, "#8e5a0e");

  context.fillStyle = gradient;
  context.beginPath();
  context.arc(width / 2, height / 2, width * 0.48, 0, Math.PI * 2);
  context.fill();

  context.globalAlpha = 0.3;
  for (let i = 0; i < 620; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.sqrt(Math.random()) * width * 0.47;
    const x = width / 2 + Math.cos(angle) * distance;
    const y = height / 2 + Math.sin(angle) * distance;
    context.fillStyle = Math.random() > 0.5 ? "#fff8cf" : "#7a4d0f";
    context.fillRect(x, y, 1.6, 1.6);
  }
  context.globalAlpha = 1;

  context.save();
  context.globalAlpha = 0.18;
  context.strokeStyle = "#fff8cf";
  context.lineWidth = width * 0.026;
  for (let x = -width * 0.45; x < width * 1.1; x += width * 0.16) {
    context.beginPath();
    context.moveTo(x, height * 0.95);
    context.lineTo(x + width * 0.62, height * 0.05);
    context.stroke();
  }
  context.restore();

  context.strokeStyle = "rgba(255, 246, 184, 0.75)";
  context.lineWidth = width * 0.035;
  context.beginPath();
  context.arc(width / 2, height / 2, width * 0.44, 0, Math.PI * 2);
  context.stroke();
}

function getScratchRatio(context, canvas) {
  const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
  const center = canvas.width / 2;
  const radius = canvas.width * 0.48;
  let transparent = 0;
  let total = 0;

  for (let y = 0; y < canvas.height; y += 2) {
    for (let x = 0; x < canvas.width; x += 2) {
      const dx = x - center;
      const dy = y - center;
      if (dx * dx + dy * dy > radius * radius) continue;

      total += 1;
      const alpha = data[(y * canvas.width + x) * 4 + 3];
      if (alpha < 24) transparent += 1;
    }
  }

  return total === 0 ? 0 : transparent / total;
}

function completeCoin(coinId) {
  state.completed.add(coinId);
  const zone = document.querySelector(`[data-coin-id="${coinId}"]`);
  if (zone) {
    zone.classList.remove("is-scratching");
    zone.classList.add("is-complete");
  }
  saveProgress();
  updateProgressText();
}

function updateProgressText() {
  progressText.textContent = `${state.completed.size} / ${coins.length} scratched`;
}

function loadProgress() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!Array.isArray(parsed)) return [];
    const validIds = new Set(coins.map((coin) => coin.id));
    return parsed.filter((id) => validIds.has(id));
  } catch {
    return [];
  }
}

function saveProgress() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...state.completed]));
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("service-worker.js").catch(() => {
      // Local file previews and some static hosts can block service workers.
    });
  });
}
