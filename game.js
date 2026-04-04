// ------------------------------
// GLOBAL STATE
// ------------------------------
let layout = [];
let tiles = [];
let firstSelected = null;

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

  // Flowers (singletons)
  "flower-1.png","flower-2.png","flower-3.png","flower-4.png",

  // Seasons (singletons)
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
// SET UP BOARD
// ------------------------------
async function setupBoard() {
  await loadLayout();

  const board = document.getElementById("board");
  const status = document.getElementById("status");
  board.innerHTML = "";
  status.textContent = "";

  // Build pairs
  tiles = [];
  tileNames.forEach(name => {
    // Standard Mahjong: 4 copies of each tile
    for (let i = 0; i < 4; i++) {
      tiles.push({ name, matched: false });
    }
  });

  // Shuffle initial tiles
  shuffle(tiles);

  // Place tiles according to layout
  layout.forEach((pos, index) => {
    const tile = tiles[index];
    tile.x = pos.x;
    tile.y = pos.y;
    tile.z = pos.z;

    const el = createTileElement(tile, index);

    // Convert tile coords to pixels (overlapping)
    const left = pos.x * 70 - pos.z * 8;
    const top = pos.y * 100 - pos.z * 8;

    el.style.left = left + "px";
    el.style.top = top + "px";
    el.style.zIndex = pos.z * 10;

    board.appendChild(el);
  });

  updateBlockedStates();
}
function deepShuffleAllTiles() {
  // Collect all unmatched tile indices
  const remainingIndices = tiles
    .map((t, i) => (!t.matched ? i : null))
    .filter(i => i !== null);

  // Extract their names
  const names = remainingIndices.map(i => tiles[i].name);

  // Shuffle all names
  shuffle(names);

  // Put shuffled names back
  remainingIndices.forEach((tileIndex, k) => {
    tiles[tileIndex].name = names[k];
  });

  // Update DOM images
  remainingIndices.forEach(tileIndex => {
    const el = document.querySelector(`.tile[data-index="${tileIndex}"]`);
    if (el) {
      el.src = "png/" + tiles[tileIndex].name;
    }
  });

  updateBlockedStates();
}

// ------------------------------
// HINT LOGIC
// ------------------------------
function findHintPair() {
  const playable = tiles
    .map((t, i) => ({ tile: t, index: i }))
    .filter(obj => !obj.tile.matched)
    .filter(obj => {
      const el = document.querySelector(`.tile[data-index="${obj.index}"]`);
      return el && !el.classList.contains("blocked");
    });

  for (let i = 0; i < playable.length; i++) {
    for (let j = i + 1; j < playable.length; j++) {
      if (playable[i].tile.name === playable[j].tile.name) {
        return [playable[i].index, playable[j].index];
      }
    }
  }

  return null;
}

function showHint() {
  const status = document.getElementById("status");

  let pair = findHintPair();

  // If no moves remain, auto-shuffle ALL tiles
  if (!pair) {
    status.textContent = "No moves available. Shuffling...";

    deepShuffleAllTiles();
    pair = findHintPair();

    // If still no moves (extremely rare), shuffle again
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

  // Show the hint
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
// SHUFFLE TILES (NAMES-ONLY)
// ------------------------------
function shuffleTiles() {
  // 1. Identify FREE tiles only
  const freeIndices = tiles
    .map((t, i) => ({ tile: t, index: i }))
    .filter(obj => !obj.tile.matched)
    .filter(obj => {
      const el = document.querySelector(`.tile[data-index="${obj.index}"]`);
      return el && !el.classList.contains("blocked");
    })
    .map(obj => obj.index);

  // If fewer than 2 free tiles, nothing to shuffle
  if (freeIndices.length < 2) return;

  // 2. Extract their names
  const freeNames = freeIndices.map(i => tiles[i].name);

  // 3. Shuffle the names
  shuffle(freeNames);

  // 4. Put shuffled names back onto the SAME free tile positions
  freeIndices.forEach((tileIndex, k) => {
    tiles[tileIndex].name = freeNames[k];
  });

  // 5. Update the DOM images for free tiles
  freeIndices.forEach(tileIndex => {
    const tile = tiles[tileIndex];
    const el = document.querySelector(`.tile[data-index="${tileIndex}"]`);
    if (el) {
      el.src = "png/" + tile.name;
    }
  });

  // 6. Recalculate blocking
  updateBlockedStates();
}





// ------------------------------
// BLOCKING LOGIC
// ------------------------------
function updateBlockedStates() {
  const board = document.getElementById("board");
  const els = board.querySelectorAll(".tile");

  els.forEach((el, index) => {
    const tile = tiles[index];
    if (tile.matched) {
      el.classList.add("blocked");
      return;
    }

    const { x, y, z } = tile;

    // Check if a tile is on top
    const hasAbove = tiles.some(t =>
      !t.matched &&
      t.z === z + 1 &&
      Math.abs(t.x - x) <= 1 &&
      Math.abs(t.y - y) <= 1
    );

    // Check left and right
    const leftBlocked = tiles.some(t =>
      !t.matched &&
      t.z === z &&
      t.y === y &&
      t.x === x - 2
    );

    const rightBlocked = tiles.some(t =>
      !t.matched &&
      t.z === z &&
      t.y === y &&
      t.x === x + 2
    );

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

  // Always get the correct tile element by data-index
  const thisEl = document.querySelector(`.tile[data-index="${index}"]`);

  // If clicking the same tile again, deselect
  if (firstSelected && firstSelected.index === index) {
    thisEl.classList.remove("selected");
    firstSelected = null;
    status.textContent = "";
    return;
  }

  // First selection
  if (!firstSelected) {
    firstSelected = { index, tile };
    thisEl.classList.add("selected");
    status.textContent = "Select a matching tile.";
    return;
  }

  // Second selection
  thisEl.classList.add("selected");

  if (firstSelected.tile.name === tile.name) {
    // Match
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
    // No match
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
  document.getElementById("shuffle-btn").addEventListener("click", shuffleTiles);
});
