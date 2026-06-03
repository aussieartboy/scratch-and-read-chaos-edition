const IMAGE_WIDTH = 1024;
const IMAGE_HEIGHT = 1536;
const COIN_RADIUS = 38;
const MOBILE_IMAGE_WIDTH = 853;
const MOBILE_IMAGE_HEIGHT = 1844;
const MOBILE_COIN_RADIUS = 32;
const SCRATCH_THRESHOLD = 0.5;
const STORAGE_KEY = "scratch-and-read-chaos-progress-v1";

const mobileCoinPositions = {
  fantasy: [
    [68.7, 505.7],
    [145.2, 506.0],
    [220.9, 505.8],
    [296.7, 505.7],
    [369.7, 505.9],
  ],
  rh: [
    [478.3, 505.7],
    [553.3, 505.6],
    [629.6, 505.6],
    [704.5, 505.8],
    [779.8, 505.6],
  ],
  zombie: [
    [68.1, 899.9],
    [145.1, 899.9],
    [220.3, 900.2],
    [295.8, 900.2],
    [369.3, 900.4],
  ],
  monster: [
    [477.4, 899.4],
    [551.6, 899.4],
    [627.6, 899.5],
    [703.5, 899.6],
    [780.1, 899.5],
  ],
  comfort: [
    [69.6, 1266.1],
    [150.9, 1266.0],
    [233.2, 1266.3],
    [315.3, 1266.4],
    [396.7, 1266.1],
  ],
};

// Adjust scratch zone coordinates here. x/y/r are in pixels relative to the
// current desktop artwork and are converted to percentages at render time.
const categories = [
  {
    key: "fantasy",
    label: "Fantasy / Badass FMC",
    color: "#a855f7",
    mobileCrop: { x: 8, y: 380, width: 407, height: 355 },
    books: [
      ["bonds-that-tie", "The Bonds That Tie", 129.2, 391.0],
      ["kate-daniels", "Kate Daniels", 213.7, 395.1],
      ["daughter-of-no-worlds", "Daughter of No Worlds", 300.7, 395.7],
      ["age-of-the-andinna", "Age of the Andinna", 382.9, 395.8],
      ["the-fifth-nicnevin", "The Fifth Nicnevin", 461.8, 393.9],
    ],
  },
  {
    key: "rh",
    label: "RH / Found Family Chaos",
    color: "#ff4aa2",
    mobileCrop: { x: 427, y: 380, width: 407, height: 355 },
    books: [
      ["all-the-pretty-monsters", "All the Pretty Monsters", 564.6, 394.5],
      ["ruthless-boys", "Ruthless Boys of the Zodiac", 648.3, 396.6],
      ["kit-davenport", "Kit Davenport", 735.8, 396.1],
      ["curse-of-the-gods", "Curse of the Gods", 815.3, 397.6],
      ["the-dark-side", "The Dark Side", 901.6, 398.5],
    ],
  },
  {
    key: "zombie",
    label: "Apocalypse / Zombie Chaos",
    color: "#8bdc42",
    mobileCrop: { x: 8, y: 760, width: 407, height: 360 },
    books: [
      ["zombie-fallout", "Zombie Fallout", 142.1, 713.2],
      ["adrians-undead-diary", "Adrian's Undead Diary", 218.5, 713.0],
      ["mountain-man", "Mountain Man", 299.8, 713.9],
      ["double-dead", "Double Dead", 380.4, 714.0],
      ["dungeon-crawler-carl", "Dungeon Crawler Carl", 456.7, 713.3],
    ],
  },
  {
    key: "monster",
    label: "Supernatural / Monster Hunters",
    color: "#38dce8",
    mobileCrop: { x: 427, y: 760, width: 407, height: 360 },
    books: [
      ["dresden-files", "The Dresden Files", 560.1, 712.6],
      ["cal-leandros", "Cal Leandros", 643.3, 713.5],
      ["sandman-slim", "Sandman Slim", 725.8, 713.9],
      ["iron-druid", "Iron Druid Chronicles", 806.3, 715.7],
      ["monster-hunter-international", "Monster Hunter International", 889.6, 714.0],
    ],
  },
  {
    key: "comfort",
    label: "Weird Comfort Chaos",
    color: "#f2b84b",
    mobileCrop: { x: 8, y: 1138, width: 445, height: 345 },
    books: [
      ["murderbot-diaries", "Murderbot Diaries", 145.1, 1035.7],
      ["good-omens", "Good Omens", 241.1, 1036.4],
      ["cerulean-sea", "The House in the Cerulean Sea", 336.5, 1037.0],
      ["raven-cycle", "The Raven Cycle", 436.0, 1036.5],
      ["addie-larue", "The Invisible Life of Addie LaRue", 537.8, 1035.1],
    ],
  },
];

const coins = categories.flatMap((category) =>
  category.books.map(([id, title, x, y], index) => {
    const [mobileX, mobileY] = mobileCoinPositions[category.key][index];
    return {
    id: `${category.key}-${id}`,
    title,
    category: category.label,
    categoryKey: category.key,
    color: category.color,
    x,
    y,
    mobileX,
    mobileY,
    r: COIN_RADIUS,
    };
  }),
);

const scratchLayer = document.querySelector("#scratchLayer");
const progressText = document.querySelector("#progressText");
const resetButton = document.querySelector("#resetButton");
const markAllButton = document.querySelector("#markAllButton");
const artwork = document.querySelector("#artwork");
const missingArtworkNotice = document.querySelector("#missingArtworkNotice");
const categoryRail = document.querySelector("#categoryRail");
const boardShell = document.querySelector(".board-shell");
const mobileBoard = document.querySelector("#mobileBoard");

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

function renderCoins() {
  scratchLayer.replaceChildren(...coins.map((coin) => createCoinElement(coin)));
  renderMobileBoard();
}

function renderCategoryRail() {
  if (!categoryRail) return;

  const buttons = categories.map((category) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "category-jump";
    button.textContent = shortCategoryLabel(category.label);
    button.style.setProperty("--category-color", category.color);
    button.addEventListener("click", () => scrollToCategory(category));
    return button;
  });

  categoryRail.replaceChildren(...buttons);
}

function renderMobileBoard() {
  if (!mobileBoard) return;

  const cards = categories.map((category) => {
    const card = document.createElement("article");
    card.className = "mobile-category-card";
    card.dataset.mobileCategory = category.key;
    card.style.setProperty("--category-color", category.color);

    const heading = document.createElement("h2");
    heading.textContent = category.label;

    const crop = document.createElement("div");
    crop.className = "mobile-crop";
    crop.style.aspectRatio = `${category.mobileCrop.width} / ${category.mobileCrop.height}`;

    const cropImage = document.createElement("img");
    cropImage.src = "assets/scratch-and-read-mobile.png";
    cropImage.alt = "";
    cropImage.setAttribute("aria-hidden", "true");
    cropImage.draggable = false;
    cropImage.style.width = `${(MOBILE_IMAGE_WIDTH / category.mobileCrop.width) * 100}%`;
    cropImage.style.left = `${(-category.mobileCrop.x / category.mobileCrop.width) * 100}%`;
    cropImage.style.top = `${(-category.mobileCrop.y / category.mobileCrop.height) * 100}%`;

    const categoryCoins = coins.filter((coin) => coin.categoryKey === category.key);
    const coinLayer = document.createElement("div");
    coinLayer.className = "scratch-layer";
    coinLayer.setAttribute("aria-label", `${category.label} scratchable book markers`);
    coinLayer.append(...categoryCoins.map((coin) => createCoinElement(coin, mobileCropFrame(category.mobileCrop))));

    crop.append(cropImage, coinLayer);
    card.append(heading, crop);
    return card;
  });

  mobileBoard.replaceChildren(...cards);
}

function createCoinElement(coin, frame = null) {
  const zone = document.createElement("div");
  const radius = frame?.radius ?? coin.r;
  const diameter = radius * 2;
  zone.className = "scratch-zone";
  zone.role = "button";
  zone.tabIndex = 0;
  zone.dataset.coinId = coin.id;
  zone.setAttribute("aria-label", `${coin.title}, ${coin.category}`);
  const sourceX = frame?.xKey ? coin[frame.xKey] : coin.x;
  const sourceY = frame?.yKey ? coin[frame.yKey] : coin.y;
  const frameX = frame?.x ?? 0;
  const frameY = frame?.y ?? 0;
  const frameWidth = frame?.width ?? IMAGE_WIDTH;
  const frameHeight = frame?.height ?? IMAGE_HEIGHT;
  const x = (sourceX - frameX) / frameWidth;
  const y = (sourceY - frameY) / frameHeight;
  const d = diameter / frameWidth;
  zone.style.setProperty("--x", `${x * 100}%`);
  zone.style.setProperty("--y", `${y * 100}%`);
  zone.style.setProperty("--d", `${d * 100}%`);
  zone.style.setProperty("--tick-color", coin.color);

  const tick = document.createElement("span");
  tick.className = "tick";
  tick.setAttribute("aria-hidden", "true");
  tick.textContent = "✓";

  const canvas = document.createElement("canvas");
  canvas.width = 160;
  canvas.height = 160;

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
    document.body.classList.add("is-scratching-board");
    boardShell?.classList.add("is-scratching");
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
  zone.addEventListener("contextmenu", (event) => event.preventDefault());
  zone.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    completeCoin(coinId);
  });

  function finishScratch(event, shouldCheck) {
    if (!scratch.active) return;
    scratch.active = false;
    scratch.moves = 0;
    window.clearTimeout(scratch.holdTimer);
    document.body.classList.remove("is-scratching-board");
    boardShell?.classList.remove("is-scratching");
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

function scrollToCategory(category) {
  const mobileCard = document.querySelector(`[data-mobile-category="${category.key}"]`);
  if (mobileCard && getComputedStyle(mobileCard).display !== "none") {
    mobileCard.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }

  if (!boardShell) return;

  const boardWidth = boardShell.scrollWidth;
  const viewportWidth = boardShell.clientWidth;
  const sourceX = category.books[0][2];
  const target = (sourceX / IMAGE_WIDTH) * boardWidth - viewportWidth * 0.18;

  boardShell.scrollTo({
    left: Math.max(0, Math.min(target, boardShell.scrollWidth - viewportWidth)),
    behavior: "smooth",
  });
}

function mobileCropFrame(crop) {
  return {
    x: crop.x,
    y: crop.y,
    width: crop.width,
    height: crop.height,
    radius: MOBILE_COIN_RADIUS,
    xKey: "mobileX",
    yKey: "mobileY",
  };
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
  document.querySelectorAll(`[data-coin-id="${coinId}"]`).forEach((zone) => {
    zone.classList.remove("is-scratching");
    zone.classList.add("is-complete");
  });
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
