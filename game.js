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
// ---------- SOLVABILITY ENGINE ----------

// Adjust these to match your actual tile value naming:
const FLOWER_VALUES = ['flower1', 'flower2', 'flower3', 'flower4'];
const SEASON_VALUES = ['season1', 'season2', 'season3', 'season4'];

// Clone board (data only, no DOM elements needed)
function cloneBoard(board) {
    return board.map(t => ({
        id: t.id,
        x: t.x,
        y: t.y,
        z: t.z,
        value: t.value,
        removed: t.removed === true
    }));
}

// Mahjong-correct matching: flowers with flowers, seasons with seasons, others strict
function isMahjongMatch(a, b) {
    if (a.removed || b.removed) return false;

    const av = a.value;
    const bv = b.value;

    const aIsFlower = FLOWER_VALUES.includes(av);
    const bIsFlower = FLOWER_VALUES.includes(bv);
    if (aIsFlower && bIsFlower) return true;

    const aIsSeason = SEASON_VALUES.includes(av);
    const bIsSeason = SEASON_VALUES.includes(bv);
    if (aIsSeason && bIsSeason) return true;

    return av === bv;
}

// Wrapper around your existing "is tile free" logic.
// Replace this body if your function name/signature differs.
function isTileFreeInBoard(board, tile) {
    // Here we assume you already have a function isTileFree(tile)
    // that uses x, y, z, removed, etc. If it relies on global "tiles",
    // you may need to temporarily set a global reference or adapt it.
    return isTileFree(tile);
}

// Get all free tiles in this board state
function getFreeTiles(board) {
    return board.filter(t => !t.removed && isTileFreeInBoard(board, t));
}

// Get all matching pairs among free tiles
function getMatchingPairs(freeTiles) {
    const pairs = [];
    for (let i = 0; i < freeTiles.length; i++) {
        for (let j = i + 1; j < freeTiles.length; j++) {
            if (isMahjongMatch(freeTiles[i], freeTiles[j])) {
                pairs.push([freeTiles[i], freeTiles[j]]);
            }
        }
    }
    return pairs;
}

// Simulate removing a pair and return new board state
function simulateMove(board, pair) {
    const newBoard = cloneBoard(board);
    const idsToRemove = new Set([pair[0].id, pair[1].id]);
    for (let t of newBoard) {
        if (idsToRemove.has(t.id)) {
            t.removed = true;
        }
    }
    return newBoard;
}

// Check if all tiles are removed
function allTilesRemoved(board) {
    return board.every(t => t.removed);
}

// Recursive solver
function isSolvable(board, depth = 0, maxDepth = 5000) {
    // Safety guard to avoid infinite recursion in weird cases
    if (depth > maxDepth) return false;

    if (allTilesRemoved(board)) return true;

    const freeTiles = getFreeTiles(board);
    const pairs = getMatchingPairs(freeTiles);

    if (pairs.length === 0) return false;

    for (const pair of pairs) {
        const nextBoard = simulateMove(board, pair);
        if (isSolvable(nextBoard, depth + 1, maxDepth)) {
            return true;
        }
    }

    return false;
}

// Convenience: check if current live tiles array is solvable
function isCurrentLayoutSolvable() {
    const boardCopy = cloneBoard(tiles); // assumes your main array is called "tiles"
    return isSolvable(boardCopy);
}

// ---------- END SOLVABILITY ENGINE ----------

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
   .filter(obj => {
  const name = obj.tile.name;
  if (name.startsWith("flower") || name.startsWith("season")) return false;
  return !obj.tile.matched;
})

    .filter(obj => {
      const el = document.querySelector(`.tile[data-index="${obj.index}"]`);
      return el && !el.classList.contains("blocked");
    });

  for (let i = 0; i < playable.length; i++) {
    for (let j = i + 1; j < playable.length; j++) {
      if (tilesMatch(playable[i].tile, playable[j].tile))
 {
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
// ------------------------------
// ------------------------------
// BLOCKING LOGIC (pixel-accurate)
// ------------------------------
function updateBlockedStates() {
  const TILE_WIDTH = 90;
  const TILE_HEIGHT = 128;
  const TILE_SPACING_X = 70;
  const TILE_SPACING_Y = 100;
  const Z_OFFSET_X = -8;
  const Z_OFFSET_Y = -8;

  const els = document.querySelectorAll(".tile");

  function getRect(t) {
    const left = t.x * TILE_SPACING_X + t.z * Z_OFFSET_X;
    const top  = t.y * TILE_SPACING_Y + t.z * Z_OFFSET_Y;

    return {
      left,
      top,
      right: left + TILE_WIDTH,
      bottom: top + TILE_HEIGHT
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

    // Check for tile directly above
    const hasAbove = tiles.some((t, i) => {
      if (i === index || t.matched) return false;
      if (t.z !== tile.z + 1) return false;
      return overlaps(rect, getRect(t));
    });

    // Check left side
    const leftBlocked = tiles.some((t, i) => {
      if (i === index || t.matched) return false;
      if (t.z !== tile.z) return false;

      const r = getRect(t);
      const verticalOverlap = !(r.bottom <= rect.top || r.top >= rect.bottom);
      const touchesLeft = r.right > rect.left - 5 && r.right <= rect.left + 20;

      return verticalOverlap && touchesLeft;
    });

    // Check right side
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

// Check for match using proper Mahjong rules
if (tilesMatch(firstSelected.tile, tile)) {

    // MATCH
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

    // NO MATCH
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
 document.getElementById("hint-btn").addEventListener("click", () => {
    showHint();
});

document.getElementById("shuffle-btn").addEventListener("click", () => {
    shuffleTiles();
});
});
