const IMAGE_WIDTH = 1024;
const IMAGE_HEIGHT = 1536;
const COIN_RADIUS = 38;
const MOBILE_IMAGE_WIDTH = 853;
const MOBILE_IMAGE_HEIGHT = 1844;
const MOBILE_COIN_RADIUS = 32;
const SCRATCH_THRESHOLD = 0.5;
const STORAGE_KEY = "scratch-and-read-chaos-progress-v1";
const SUPABASE_URL = "https://gmthueauidmluipgiapj.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_874uwyvRVcx3nesZYBNvYw_JbhTkXty";
const SYNC_POLL_INTERVAL_MS = 20000;
const SYNC_BOARD_ID = getSyncBoardId();

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
      ["bonds-that-tie", "The Bonds That Tie", 132.4, 387.2],
      ["kate-daniels", "Kate Daniels", 219.4, 387.3],
      ["daughter-of-no-worlds", "Daughter of No Worlds", 307.8, 387.6],
      ["age-of-the-andinna", "Age of the Andinna", 388.5, 387.5],
      ["the-fifth-nicnevin", "The Fifth Nicnevin", 465.5, 387.3],
    ],
  },
  {
    key: "rh",
    label: "RH / Found Family Chaos",
    color: "#ff4aa2",
    mobileCrop: { x: 427, y: 380, width: 407, height: 355 },
    books: [
      ["all-the-pretty-monsters", "All the Pretty Monsters", 571.2, 387.1],
      ["ruthless-boys", "Ruthless Boys of the Zodiac", 655.6, 387.6],
      ["kit-davenport", "Kit Davenport", 742.7, 387.5],
      ["curse-of-the-gods", "Curse of the Gods", 823.9, 387.6],
      ["the-dark-side", "The Dark Side", 909.5, 387.5],
    ],
  },
  {
    key: "zombie",
    label: "Apocalypse / Zombie Chaos",
    color: "#8bdc42",
    mobileCrop: { x: 8, y: 760, width: 407, height: 360 },
    books: [
      ["zombie-fallout", "Zombie Fallout", 149.5, 704.4],
      ["adrians-undead-diary", "Adrian's Undead Diary", 224.7, 704.3],
      ["mountain-man", "Mountain Man", 308.9, 704.4],
      ["double-dead", "Double Dead", 387.3, 704.4],
      ["dungeon-crawler-carl", "Dungeon Crawler Carl", 462.5, 704.2],
    ],
  },
  {
    key: "monster",
    label: "Supernatural / Monster Hunters",
    color: "#38dce8",
    mobileCrop: { x: 427, y: 760, width: 407, height: 360 },
    books: [
      ["dresden-files", "The Dresden Files", 569.1, 704.3],
      ["cal-leandros", "Cal Leandros", 650.8, 704.6],
      ["sandman-slim", "Sandman Slim", 734.9, 704.6],
      ["iron-druid", "Iron Druid Chronicles", 815.0, 704.5],
      ["monster-hunter-international", "Monster Hunter International", 895.2, 704.5],
    ],
  },
  {
    key: "comfort",
    label: "Weird Comfort Chaos",
    color: "#f2b84b",
    mobileCrop: { x: 8, y: 1138, width: 445, height: 345 },
    books: [
      ["murderbot-diaries", "Murderbot Diaries", 150.9, 1026.1],
      ["good-omens", "Good Omens", 247.9, 1026.4],
      ["cerulean-sea", "The House in the Cerulean Sea", 345.3, 1026.3],
      ["raven-cycle", "The Raven Cycle", 442.2, 1026.2],
      ["addie-larue", "The Invisible Life of Addie LaRue", 542.4, 1026.1],
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
  syncBoardId: SYNC_BOARD_ID,
  syncClient: null,
  syncEnabled: false,
  syncSaving: false,
  syncSaveTimer: null,
  lastCloudSignature: "",
  localRevision: 0,
};

artwork.addEventListener("error", () => {
  missingArtworkNotice.hidden = false;
});

renderCoins();
renderCategoryRail();
updateProgressText();
initCloudSync();
registerServiceWorker();

resetButton.addEventListener("click", () => {
  if (!window.confirm("Reset all scratched books?")) return;

  state.completed.clear();
  saveProgress(0);
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
  context.arc(width / 2, height / 2, width * 0.5, 0, Math.PI * 2);
  context.fill();

  context.globalAlpha = 0.3;
  for (let i = 0; i < 620; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.sqrt(Math.random()) * width * 0.49;
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
  context.arc(width / 2, height / 2, width * 0.465, 0, Math.PI * 2);
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
  if (state.completed.has(coinId)) return;

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
    const parsed = JSON.parse(localStorage.getItem(getStorageKey()));
    if (!Array.isArray(parsed)) return [];
    const validIds = new Set(coins.map((coin) => coin.id));
    return parsed.filter((id) => validIds.has(id));
  } catch {
    return [];
  }
}

function saveProgress(delay = 600) {
  state.localRevision += 1;
  localStorage.setItem(getStorageKey(), JSON.stringify([...state.completed]));
  queueCloudSave(delay);
}

function getStorageKey() {
  return SYNC_BOARD_ID ? `${STORAGE_KEY}:${SYNC_BOARD_ID}` : STORAGE_KEY;
}

function getSyncBoardId() {
  const fromHash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const fromQuery = new URLSearchParams(window.location.search);
  const value = fromHash.get("board") || fromHash.get("sync") || fromQuery.get("board") || fromQuery.get("sync");

  if (!value) return "";

  return value.trim().replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80);
}

async function initCloudSync() {
  if (!state.syncBoardId || !SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY || !window.supabase?.createClient) {
    return;
  }

  state.syncClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
  state.syncEnabled = true;

  await loadCloudProgress();

  window.addEventListener("online", () => queueCloudSave(0));
  window.addEventListener("focus", () => loadCloudProgress());
  window.setInterval(() => {
    if (!document.hidden) loadCloudProgress();
  }, SYNC_POLL_INTERVAL_MS);
}

async function loadCloudProgress() {
  if (!state.syncEnabled || !state.syncClient || state.syncSaving) return;

  const revisionAtStart = state.localRevision;

  try {
    const { data, error } = await state.syncClient.rpc("get_scratch_progress", {
      p_board_id: state.syncBoardId,
    });

    if (error) throw error;
    if (revisionAtStart !== state.localRevision) return;

    const cloudIds = normalizeProgressIds(data);
    const cloudSignature = signatureFor(cloudIds);

    if (cloudSignature !== signatureFor([...state.completed])) {
      applyCompletedIds(cloudIds);
    }

    state.lastCloudSignature = cloudSignature;
  } catch (error) {
    console.warn("Cloud sync is unavailable. Local progress is still saved.", error);
  }
}

function queueCloudSave(delay = 600) {
  if (!state.syncEnabled || !state.syncClient) return;

  window.clearTimeout(state.syncSaveTimer);
  state.syncSaveTimer = window.setTimeout(() => {
    saveCloudProgress();
  }, delay);
}

async function saveCloudProgress() {
  if (!state.syncEnabled || !state.syncClient) return;
  if (state.syncSaving) {
    queueCloudSave(250);
    return;
  }

  const completedIds = [...state.completed];
  const signature = signatureFor(completedIds);
  if (signature === state.lastCloudSignature) return;

  state.syncSaving = true;

  try {
    const { error } = await state.syncClient.rpc("save_scratch_progress", {
      p_board_id: state.syncBoardId,
      p_completed_ids: completedIds,
    });

    if (error) throw error;

    state.lastCloudSignature = signature;
  } catch (error) {
    console.warn("Cloud save failed. Local progress is still saved.", error);
  } finally {
    state.syncSaving = false;
  }
}

function applyCompletedIds(ids) {
  state.completed = new Set(normalizeProgressIds(ids));

  document.querySelectorAll(".scratch-zone").forEach((zone) => {
    const isComplete = state.completed.has(zone.dataset.coinId);
    zone.classList.toggle("is-complete", isComplete);
    if (!isComplete) drawGoldCover(zone.querySelector("canvas"));
  });

  localStorage.setItem(getStorageKey(), JSON.stringify([...state.completed]));
  updateProgressText();
}

function normalizeProgressIds(ids) {
  if (!Array.isArray(ids)) return [];

  const validIds = new Set(coins.map((coin) => coin.id));
  return [...new Set(ids)].filter((id) => validIds.has(id));
}

function signatureFor(ids) {
  return normalizeProgressIds(ids).sort().join("|");
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("service-worker.js").catch(() => {
      // Local file previews and some static hosts can block service workers.
    });
  });
}
