// ------------------------------
// GLOBAL STATE
// ------------------------------
let layout = [];
let tiles = [];
let firstSelected = null;

// ------------------------------
// TILE GEOMETRY CONSTANTS
// ------------------------------
const TILE_WIDTH = 90;
const TILE_HEIGHT = 128;
const TILE_SPACING_X = 70;
const TILE_SPACING_Y = 100;
const Z_OFFSET_X = -8;
const Z_OFFSET_Y = -8;

// Shrink collision box to ignore transparent PNG padding
const COLLISION_MARGIN_X = 10;
const COLLISION_MARGIN_Y = 14;

// ------------------------------
// LOAD LAYOUT FILE
// ------------------------------
async function loadLayout() {
  const response = await fetch("layout-turtle.json");
  layout = await response.json();
}

// ------------------------------
// TILE FILENAMES
// ------------------------------
const tileNames = [
  // Dots
  "dot-1.png","dot-2.png","dot-3.png","dot-4.png","dot-5.png","dot-6.png","dot-7.png","dot-8.png","dot-9.png",

  // Bamboo
  "bamboo-1.png","bamboo-2.png","bamboo-3.png","bamboo-4.png","bamboo-5.png","bamboo-6.png","bamboo-7.png","bamboo-8.png","bamboo-9.png",

  // Characters
  "char-1.png","char-2.png","char-3.png","char-4.png","char-5.png","char-6.png","char-7.png","char-8.png","char-9.png",

  // Winds
  "wind-east.png","wind-south.png","wind-west.png","wind-north.png",

  // Dragons
  "dragon-red.png","dragon-green.png","dragon-white.png",

  // Flowers
  "flower-1.png","flower-2.png","flower-3.png","flower-4.png",

  // Seasons
  "season-1.png","season-2.png","season-3.png","season-4.png"
];

// ------------------------------
// CREATE TILE ELEMENT
// ------------------------------
function createTileElement(tile, index) {
  const img = document.createElement("img");
  img.src = "png/" + tile.name;
  img.alt = tile.name;
  img.className = "tile";
  img.dataset.index = index;
  img.addEventListener("click", onTileClick);
  return img;
}

// ------------------------------
// SHUFFLE ARRAY
// ------------------------------
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

// ------------------------------
// MAHJONG MATCHING LOGIC
// ------------------------------
function isFlower(name) {
  return name.startsWith("flower-");
}

function isSeason(name) {
  return name.startsWith("season-");
}

function tilesMatch(a, b) {
  const av = a.name;
  const bv = b.name;

  if (isFlower(av) && isFlower(bv)) return true;
  if (isSeason(av) && isSeason(bv)) return true;

  return av === bv;
}

// ------------------------------
// SOLVABILITY ENGINE (DATA-ONLY)
// ------------------------------
function cloneBoard(board) {
  return board.map(t => ({
    id: t.id,
    x: t.x,
    y: t.y,
    z: t.z,
    name: t.name,
    removed: t.matched
  }));
}

function getRectData(t) {
  const left = t.x * TILE_SPACING_X + t.z * Z_OFFSET_X;
  const top  = t.y * TILE_SPACING_Y + t.z * Z_OFFSET_Y;

  return {
    left: left + COLLISION_MARGIN_X,
    top: top + COLLISION_MARGIN_Y,
    right: left + TILE_WIDTH - COLLISION_MARGIN_X,
    bottom: top + TILE_HEIGHT - COLLISION_MARGIN_Y
  };
}

function overlapsRect(a, b) {
  return !(
    a.right <= b.left ||
    a.left >= b.right ||
    a.bottom <= b.top ||
    a.top >= b.bottom
  );
}

function isTileFreeData(board, tile) {
  if (tile.removed) return false;

  const rect = getRectData(tile);

  const hasAbove = board.some(t => {
    if (t.id === tile.id || t.removed) return false;
    if (t.z !== tile.z + 1) return false;
    return overlapsRect(rect, getRectData(t));
  });

  if (hasAbove) return false;

  const leftBlocked = board.some(t => {
    if (t.id === tile.id || t.removed) return false;
    if (t.z !== tile.z) return false;

    const r = getRectData(t);
    const verticalOverlap = !(r.bottom <= rect.top || r.top >= rect.bottom);
    const touchesLeft = r.right > rect.left - 5 && r.right <= rect.left + 20;

    return verticalOverlap && touchesLeft;
  });

  const rightBlocked = board.some(t => {
    if (t.id === tile.id || t.removed) return false;
    if (t.z !== tile.z) return false;

    const r = getRectData(t);
    const verticalOverlap = !(r.bottom <= rect.top || r.top >= rect.bottom);
    const touchesRight = r.left < rect.right + 5 && r.left >= rect.right - 20;

    return verticalOverlap && touchesRight;
  });

  return !(leftBlocked && rightBlocked);
}

function getFreeTiles(board) {
  return board.filter(t => !t.removed && isTileFreeData(board, t));
}

function getMatchingPairs(freeTiles) {
  const pairs = [];
  for (let i = 0; i < freeTiles.length; i++) {
    for (let j = i + 1; j < freeTiles.length; j++) {
      if (tilesMatch(freeTiles[i], freeTiles[j])) {
        pairs.push([freeTiles[i], freeTiles[j]]);
      }
    }
  }
  return pairs;
}

function simulateMove(board, pair) {
  const newBoard = cloneBoard(board);
  const ids = new Set([pair[0].id, pair[1].id]);
  newBoard.forEach(t => {
    if (ids.has(t.id)) t.removed = true;
  });
  return newBoard;
}

function allTilesRemoved(board) {
  return board.every(t => t.removed);
}

function isSolvable(board, depth = 0, maxDepth = 5000) {
  if (depth > maxDepth) return false;
  if (allTilesRemoved(board)) return true;

  const freeTiles = getFreeTiles(board);
  const pairs = getMatchingPairs(freeTiles);

  if (pairs.length === 0) return false;

  for (const pair of pairs) {
    const nextBoard = simulateMove(board, pair);
    if (isSolvable(nextBoard, depth + 1, maxDepth)) return true;
  }

  return false;
}

function isCurrentLayoutSolvable() {
  return isSolvable(cloneBoard(tiles));
}
// ------------------------------
// SOLVABLE SHUFFLE
// ------------------------------
async function shuffleUntilSolvable(maxAttempts = 200) {
  const status = document.getElementById("status");
  status.textContent = "Shuffling for a solvable layout...";

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {

    // Shuffle all unmatched tiles
    deepShuffleAllTiles();

    // Check solvability
    if (isCurrentLayoutSolvable()) {
      status.textContent = "Solvable layout found!";
      return true;
    }
  }

  status.textContent = "Could not find a solvable shuffle.";
  return false;
}

// ------------------------------
// SET UP BOARD
// ------------------------------
async function setupBoard() {
  await loadLayout();

  const board = document.getElementById("board");
  const status = document.getElementById("status");
  board.innerHTML = "";
  status.textContent = "";

  tiles = [];
  tileNames.forEach(name => {
    for (let i = 0; i < 4; i++) {
      tiles.push({
        id: tiles.length,
        name,
        matched: false,
        x: 0,
        y: 0,
        z: 0
      });
    }
  });

  shuffle(tiles);

  layout.forEach((pos, index) => {
    const tile = tiles[index];
    tile.x = pos.x;
    tile.y = pos.y;
    tile.z = pos.z;

    const el = createTileElement(tile, index);

    const left = pos.x * TILE_SPACING_X + pos.z * Z_OFFSET_X;
    const top  = pos.y * TILE_SPACING_Y + pos.z * Z_OFFSET_Y;

    el.style.left = left + "px";
    el.style.top = top + "px";
    el.style.zIndex = pos.z * 10;

    board.appendChild(el);
  });

  updateBlockedStates();
}

// ------------------------------
// DEEP SHUFFLE (ALL UNMATCHED)
// ------------------------------
function deepShuffleAllTiles() {
  const remaining = tiles
    .map((t, i) => (!t.matched ? i : null))
    .filter(i => i !== null);

  const names = remaining.map(i => tiles[i].name);
  shuffle(names);

  remaining.forEach((tileIndex, k) => {
    tiles[tileIndex].name = names[k];
    const el = document.querySelector(`.tile[data-index="${tileIndex}"]`);
    if (el) el.src = "png/" + tiles[tileIndex].name;
  });

  updateBlockedStates();
}


// ------------------------------
// SMART HINT ENGINE (solver-aware)
// ------------------------------
function findSmartHintPair() {
  // Work on a cloned board so we don't touch live state
  const board = cloneBoard(tiles);

  // Get all free tiles in data space
  let freeTiles = getFreeTiles(board);

  // Optional: exclude flowers/seasons from hints (your original behaviour)
  freeTiles = freeTiles.filter(t => {
    const name = t.name;
    if (isFlower(name) || isSeason(name)) return false;
    return true;
  });

  const pairs = getMatchingPairs(freeTiles);
  if (pairs.length === 0) return null;

  // Try each pair and see if taking it keeps the board solvable
  for (const pair of pairs) {
    const nextBoard = simulateMove(board, pair);
    if (isSolvable(nextBoard)) {
      // Map back from cloned tiles (by id) to live tile indices
      const id1 = pair[0].id;
      const id2 = pair[1].id;

      const idx1 = tiles.findIndex(t => t.id === id1 && !t.matched);
      const idx2 = tiles.findIndex(t => t.id === id2 && !t.matched);

      if (idx1 !== -1 && idx2 !== -1) {
        return [idx1, idx2];
      }
    }
  }

  // Fallback: if no "safe" pair found, return any legal pair
  const fallback = pairs[0];
  if (fallback) {
    const id1 = fallback[0].id;
    const id2 = fallback[1].id;

    const idx1 = tiles.findIndex(t => t.id === id1 && !t.matched);
    const idx2 = tiles.findIndex(t => t.id === id2 && !t.matched);

    if (idx1 !== -1 && idx2 !== -1) {
      return [idx1, idx2];
    }
  }

  return null;
}

function showHint() {
  const status = document.getElementById("status");

 let pair = findSmartHintPair();


  if (!pair) {
    status.textContent = "No moves available. Shuffling...";
    deepShuffleAllTiles();
    pair = findHintPair();
    if (!pair) {
      deepShuffleAllTiles();
      pair = findHintPair();
    }
    if (!pair) {
      status.textContent = "Still no moves. Try again.";
      return;
    }
    status.textContent = "New moves available!";
  }

  const [i1, i2] = pair;

  const el1 = document.querySelector(`.tile[data-index="${i1}"]`);
  const el2 = document.querySelector(`.tile[data-index="${i2}"]`);

  el1.classList.add("selected");
  el2.classList.add("selected");

  setTimeout(() => {
    el1.classList.remove("selected");
    el2.classList.remove("selected");
    status.textContent = "";
  }, 1000);
}

// ------------------------------
// SHUFFLE FREE TILES ONLY
// ------------------------------
function shuffleTiles() {
  const freeIndices = tiles
    .map((t, i) => ({ tile: t, index: i }))
    .filter(obj => !obj.tile.matched)
    .filter(obj => {
      const el = document.querySelector(`.tile[data-index="${obj.index}"]`);
      return el && !el.classList.contains("blocked");
    })
    .map(obj => obj.index);

  if (freeIndices.length < 2) return;

  const freeNames = freeIndices.map(i => tiles[i].name);
  shuffle(freeNames);

  freeIndices.forEach((tileIndex, k) => {
    tiles[tileIndex].name = freeNames[k];
    const el = document.querySelector(`.tile[data-index="${tileIndex}"]`);
    if (el) el.src = "png/" + tiles[tileIndex].name;
  });

  updateBlockedStates();
}

// ------------------------------
// BLOCKING LOGIC (pixel-accurate)
// ------------------------------
function updateBlockedStates() {
  const els = document.querySelectorAll(".tile");

  function getRect(t) {
    const left = t.x * TILE_SPACING_X + t.z * Z_OFFSET_X;
    const top  = t.y * TILE_SPACING_Y + t.z * Z_OFFSET_Y;

    return {
      left: left + COLLISION_MARGIN_X,
      top: top + COLLISION_MARGIN_Y,
      right: left + TILE_WIDTH - COLLISION_MARGIN_X,
      bottom: top + TILE_HEIGHT - COLLISION_MARGIN_Y
    };
  }

  function overlaps(a, b) {
    return !(
      a.right <= b.left ||
      a.left >= b.right ||
      a.bottom <= b.top ||
      a.top >= b.bottom
    );
  }

  els.forEach((el, index) => {
    const tile = tiles[index];

    if (tile.matched) {
      el.classList.add("blocked");
      return;
    }

    const rect = getRect(tile);

    const hasAbove = tiles.some((t, i) => {
      if (i === index || t.matched) return false;
      if (t.z !== tile.z + 1) return false;
      return overlaps(rect, getRect(t));
    });

    const leftBlocked = tiles.some((t, i) => {
      if (i === index || t.matched) return false;
      if (t.z !== tile.z) return false;

      const r = getRect(t);
      const verticalOverlap = !(r.bottom <= rect.top || r.top >= rect.bottom);
      const touchesLeft = r.right > rect.left - 5 && r.right <= rect.left + 20;

      return verticalOverlap && touchesLeft;
    });

    const rightBlocked = tiles.some((t, i) => {
      if (i === index || t.matched) return false;
      if (t.z !== tile.z) return false;

      const r = getRect(t);
      const verticalOverlap = !(r.bottom <= rect.top || r.top >= rect.bottom);
      const touchesRight = r.left < rect.right + 5 && r.left >= rect.right - 20;

      return verticalOverlap && touchesRight;
    });

    const blocked = hasAbove || (leftBlocked && rightBlocked);

    if (blocked) {
      el.classList.add("blocked");
    } else {
      el.classList.remove("blocked");
    }
  });
}

// ------------------------------
// TILE CLICK HANDLER
// ------------------------------
function onTileClick(e) {
  const index = parseInt(e.currentTarget.dataset.index, 10);
  const tile = tiles[index];
  if (tile.matched) return;
  if (e.currentTarget.classList.contains("blocked")) return;

  const status = document.getElementById("status");
  const thisEl = document.querySelector(`.tile[data-index="${index}"]`);

  if (firstSelected && firstSelected.index === index) {
    thisEl.classList.remove("selected");
    firstSelected = null;
    status.textContent = "";
    return;
  }

  if (!firstSelected) {
    firstSelected = { index, tile };
    thisEl.classList.add("selected");
    status.textContent = "Select a matching tile.";
    return;
  }

  thisEl.classList.add("selected");

  if (tilesMatch(firstSelected.tile, tile)) {
    tiles[firstSelected.index].matched = true;
    tiles[index].matched = true;

    setTimeout(() => {
      const el1 = document.querySelector(`.tile[data-index="${firstSelected.index}"]`);
      el1.style.visibility = "hidden";
      thisEl.style.visibility = "hidden";

      firstSelected = null;
      status.textContent = "Match!";

      if (tiles.every(t => t.matched)) {
        status.textContent = "You cleared the board! 🎉";
      }

      updateBlockedStates();
    }, 200);
  } else {
    setTimeout(() => {
      const el1 = document.querySelector(`.tile[data-index="${firstSelected.index}"]`);
      el1.classList.remove("selected");
      thisEl.classList.remove("selected");

      firstSelected = null;
      status.textContent = "No match. Try again.";
    }, 400);
  }
}

// ------------------------------
// INITIALISE
// ------------------------------
document.addEventListener("DOMContentLoaded", () => {
  setupBoard();
  document.getElementById("restart-btn").addEventListener("click", setupBoard);
  document.getElementById("hint-btn").addEventListener("click", showHint);
  document.getElementById("shuffle-btn").addEventListener("click", () => {
    shuffleUntilSolvable();
});

