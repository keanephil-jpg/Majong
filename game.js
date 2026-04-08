// ------------------------------
// GLOBAL STATE
// ------------------------------
let layout = [];
let tiles = [];
let firstSelected = null;

// ------------------------------
// TILE GEOMETRY CONSTANTS
// ------------------------------
const BOARD_WIDTH = 1200;
const BOARD_HEIGHT = 900;
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
// FREE TILE / PAIR DETECTION
// ------------------------------
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
  if (tile.matched) return false;

  const rect = getRectData(tile);

  // Any tile with HIGHER z that overlaps counts as "above"
  const hasAbove = board.some(t => {
    if (t.id === tile.id || t.matched) return false;
    if (t.z <= tile.z) return false;          // <-- key change: any higher z
    return overlapsRect(rect, getRectData(t));
  });

  if (hasAbove) return false;

  // Check left side
  const leftBlocked = board.some(t => {
    if (t.id === tile.id || t.matched) return false;
    if (t.z !== tile.z) return false;

    const r = getRectData(t);
    const verticalOverlap = !(r.bottom <= rect.top || r.top >= rect.bottom);
    const touchesLeft = r.right > rect.left - 5 && r.right < rect.left + 25;

    return verticalOverlap && touchesLeft;
  });

  // Check right side
  const rightBlocked = board.some(t => {
    if (t.id === tile.id || t.matched) return false;
    if (t.z !== tile.z) return false;

    const r = getRectData(t);
    const verticalOverlap = !(r.bottom <= rect.top || r.top >= rect.bottom);
    const touchesRight = r.left < rect.right + 5 && r.left > rect.right - 25;

    return verticalOverlap && touchesRight;
  });

  // Free if left OR right is open
  return (!leftBlocked || !rightBlocked);
}


function getFreeTiles(board) {
  return board.filter(t => !t.matched && isTileFreeData(board, t));
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

function hasAnyMoves() {
  const free = getFreeTiles(tiles);
  const pairs = getMatchingPairs(free);
  return pairs.length > 0;
}

// ------------------------------
// SET UP BOARD
// ------------------------------
async function setupBoard() {
  await loadLayout();

  const board = document.getElementById("board");
  board.innerHTML = "";

  // Build tile set
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

  // Centering offsets
  const layoutWidth = 15 * TILE_SPACING_X;
  const layoutHeight = 8 * TILE_SPACING_Y;
  const offsetX = (BOARD_WIDTH - layoutWidth) / 2;
  const offsetY = (BOARD_HEIGHT - layoutHeight) / 2;

  // Place tiles
  layout.forEach((pos, index) => {
    const tile = tiles[index];
    tile.x = pos.x;
    tile.y = pos.y;
    tile.z = pos.z;

    const el = createTileElement(tile, index);

    const left = offsetX + pos.x * TILE_SPACING_X + pos.z * Z_OFFSET_X;
    const top  = offsetY + pos.y * TILE_SPACING_Y + pos.z * Z_OFFSET_Y;

    el.style.left = left + "px";
    el.style.top = top + "px";
    el.style.zIndex = pos.z * 10;

    board.appendChild(el);
  });

  updateBlockedStates();
  updateMovesCounter();
}

// ------------------------------
// SHUFFLE BOARD (NO SOLVER, CLEAN REBUILD)
// ------------------------------
async function shuffleUntilSolvable() {
  shuffle(tiles);

  const board = document.getElementById("board");
  board.innerHTML = "";

  const layoutWidth = 15 * TILE_SPACING_X;
  const layoutHeight = 8 * TILE_SPACING_Y;
  const offsetX = (BOARD_WIDTH - layoutWidth) / 2;
  const offsetY = (BOARD_HEIGHT - layoutHeight) / 2;

  layout.forEach((pos, index) => {
    const tile = tiles[index];
    tile.x = pos.x;
    tile.y = pos.y;
    tile.z = pos.z;

    const el = createTileElement(tile, index);

    const left = offsetX + pos.x * TILE_SPACING_X + pos.z * Z_OFFSET_X;
    const top  = offsetY + pos.y * TILE_SPACING_Y + pos.z * Z_OFFSET_Y;

    el.style.left = left + "px";
    el.style.top = top + "px";
    el.style.zIndex = pos.z * 10;

    board.appendChild(el);
  });

  updateBlockedStates();
  updateMovesCounter();
}


  if (!hasAnyMoves()) {
    status.textContent = "No moves after shuffle. Try again.";
  } else {
    status.textContent = "New moves available.";
  }
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
function updateMovesCounter() {
  const free = getFreeTiles(tiles);
  const pairs = getMatchingPairs(free);
  const moves = pairs.length;

  const movesEl = document.getElementById("moves-display");
  movesEl.textContent = `Moves available: ${moves}`;
  console.log("FREE TILES:", free.length);

}


function showHint() {
  const status = document.getElementById("status");
  const free = getFreeTiles(tiles);
  const pairs = getMatchingPairs(free);

  console.log("FREE:", free.length, free);
  console.log("PAIRS:", pairs.length, pairs);

  if (pairs.length === 0) {
    status.textContent = "No moves. Try shuffle.";
    return;
  }

  const [a, b] = pairs[0];

  const idx1 = a.id;
const idx2 = b.id;


  console.log("HINT INDEXES:", idx1, idx2);

  const el1 = document.querySelector(`.tile[data-index="${idx1}"]`);
  const el2 = document.querySelector(`.tile[data-index="${idx2}"]`);

  console.log("ELEMENTS:", el1, el2);

  if (!el1 || !el2) return;

  el1.classList.add("hint-glow");
  el2.classList.add("hint-glow");

  status.textContent = "Hint shown.";

  setTimeout(() => {
    el1.classList.remove("hint-glow");
    el2.classList.remove("hint-glow");
    status.textContent = "";
  }, 1200);
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

  // Add fade animation
  el1.classList.add("match-fade");
  thisEl.classList.add("match-fade");

  // Remove from view after animation
 setTimeout(() => {
  el1.style.visibility = "hidden";
  thisEl.style.visibility = "hidden";
}, 500);


  firstSelected = null;
  status.textContent = "Match!";


      firstSelected = null;
      status.textContent = "Match!";

      if (tiles.every(t => t.matched)) {
        status.textContent = "You cleared the board! 🎉";
      } else if (!hasAnyMoves()) {
        status.textContent = "No moves left. Try shuffle.";
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
updateBlockedStates();
updateMovesCounter();


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
});
