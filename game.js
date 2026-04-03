let layout = [];
let tiles = [];
let firstSelected = null;

async function loadLayout() {
  const response = await fetch("layout-turtle.json");
  layout = await response.json();
}
// List of tile image filenames (must exist in png/)
const tileNames = [
  "dot-1.png",
  "dot-2.png",
  "dot-3.png",
  "bamboo-1.png",
  "bamboo-2.png",
  "bamboo-3.png",
  "char-1.png",
  "char-2.png",
  "char-3.png"
];

// We’ll make pairs of each tile
let tiles = [];
let firstSelected = null;

function createTileElement(tile, index) {
  const img = document.createElement("img");
  img.src = "png/" + tile.name;
  img.alt = tile.name;
  img.className = "tile";
  img.dataset.index = index;
  img.addEventListener("click", onTileClick);
  return img;
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

async function setupBoard() {
  await loadLayout();

  const board = document.getElementById("board");
  const status = document.getElementById("status");
  board.innerHTML = "";
  status.textContent = "";

  // Build pairs
  tiles = [];
  tileNames.forEach(name => {
    tiles.push({ name, matched: false });
    tiles.push({ name, matched: false });
  });

  shuffle(tiles);

  // Place tiles according to layout
  layout.forEach((pos, index) => {
    const tile = tiles[index];
    tile.x = pos.x;
    tile.y = pos.y;
    tile.z = pos.z;

    const el = createTileElement(tile, index);

    // Convert tile coords to pixels
    const left = pos.x * 60 - pos.z * 5;
    const top = pos.y * 80 - pos.z * 5;

    el.style.left = left + "px";
    el.style.top = top + "px";
    el.style.zIndex = pos.z * 10;

    board.appendChild(el);
  });

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



function onTileClick(e) {
  const index = parseInt(e.currentTarget.dataset.index, 10);
  const tile = tiles[index];
  if (tile.matched) return;
  if (e.currentTarget.classList.contains("blocked")) {
  return;
}


  const board = document.getElementById("board");
  const status = document.getElementById("status");
  const allTileEls = board.querySelectorAll(".tile");

  const thisEl = allTileEls[index];

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
      allTileEls[firstSelected.index].style.visibility = "hidden";
      thisEl.style.visibility = "hidden";
      firstSelected = null;
      status.textContent = "Match!";

      if (tiles.every(t => t.matched)) {
        status.textContent = "You cleared the board! 🎉";
      }
    }, 200);
  } else {
    // No match
    setTimeout(() => {
      allTileEls[firstSelected.index].classList.remove("selected");
      thisEl.classList.remove("selected");
      firstSelected = null;
      status.textContent = "No match. Try again.";
    }, 400);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  setupBoard();
  document.getElementById("restart-btn").addEventListener("click", setupBoard);
});
