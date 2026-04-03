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

function setupBoard() {
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

  tiles.forEach((tile, index) => {
    const el = createTileElement(tile, index);
    board.appendChild(el);
  });

  firstSelected = null;
}

function onTileClick(e) {
  const index = parseInt(e.currentTarget.dataset.index, 10);
  const tile = tiles[index];
  if (tile.matched) return;

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
