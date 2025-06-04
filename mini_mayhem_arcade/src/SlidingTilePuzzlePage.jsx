import React, { useState, useEffect } from "react";
import "./SlidingTilePuzzlePage.css";

// Size of the board (can allow difficulty selector later)
const BOARD_SIZE = 4;

/**
 * Returns a fresh solved board (2D array, 0 = blank, tiles numbered 1..N^2-1)
 */
function createSolvedBoard(size) {
  const arr = [];
  let n = 1;
  for (let y = 0; y < size; y++) {
    arr.push([]);
    for (let x = 0; x < size; x++) {
      if (y === size - 1 && x === size - 1) {
        arr[y].push(0); // blank
      } else {
        arr[y].push(n++);
      }
    }
  }
  return arr;
}

/**
 * Checks if the given board is SOLVED (tiles 1..N^2-1 in order, blank at end)
 */
function checkSolved(bd) {
  let n = 1;
  const N = bd.length;
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      if (y === N - 1 && x === N - 1) {
        if (bd[y][x] !== 0) return false;
      } else if (bd[y][x] !== n++) {
        return false;
      }
    }
  }
  return true;
}

/**
 * Check if the current board is solvable using inversion logic.
 * Supports both odd NxN and even NxN.
 */
function isSolvable(board) {
  const N = board.length;
  const flat = board.flat();
  let inversions = 0;
  for (let i = 0; i < flat.length; ++i) {
    for (let j = i + 1; j < flat.length; ++j) {
      if (flat[i] && flat[j] && flat[i] > flat[j]) inversions++;
    }
  }
  let blankRowFromBottom;
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      if (board[y][x] === 0) blankRowFromBottom = N - y;
    }
  }
  if (N % 2 === 1) {
    // Odd: solvable if inversions even
    return inversions % 2 === 0;
  } else {
    // Even: solvable if (blankRowFromBottom even and inversions odd) or vice versa
    return ((blankRowFromBottom % 2 === 0) === (inversions % 2 === 1));
  }
}

/**
 * Deep copies a board (2D array)
 */
function deepCopyBoard(bd) {
  return bd.map((row) => [...row]);
}

function findBlank(bd) {
  for (let y = 0; y < bd.length; y++) {
    for (let x = 0; x < bd[0].length; x++) {
      if (bd[y][x] === 0) return { x, y };
    }
  }
  return null;
}

function canMoveTile(bd, x, y) {
  const { x: bx, y: by } = findBlank(bd);
  return (
    (x === bx && Math.abs(y - by) === 1) ||
    (y === by && Math.abs(x - bx) === 1)
  );
}

// PUBLIC_INTERFACE
function SlidingTilePuzzlePage() {
  // State for board & stats
  const [board, setBoard] = useState(() => createSolvedBoard(BOARD_SIZE));
  const [moves, setMoves] = useState(0);
  const [won, setWon] = useState(false);

  /**
   * Shuffle the board into a random, solvable, non-solved state.
   * Uses blank-move random shuffling to guarantee solvability.
   * If board is accidentally solved at the end, tries again.
   */
  function shuffleSolvableUnsolved() {
    let bd = createSolvedBoard(BOARD_SIZE);
    let tries = 0;
    let gotUnsolved = false;
    while (!gotUnsolved && tries < 40) {
      // Shuffle with valid blank moves (to ensure solvable and realistic positions)
      bd = createSolvedBoard(BOARD_SIZE);
      let blank = { ...findBlank(bd) };
      // Do a sequence of random adjacent moves (80 steps for good mix)
      for (let i = 0; i < 80; ++i) {
        let neighbors = [];
        if (blank.y > 0) neighbors.push([blank.x, blank.y - 1]);
        if (blank.y < BOARD_SIZE - 1) neighbors.push([blank.x, blank.y + 1]);
        if (blank.x > 0) neighbors.push([blank.x - 1, blank.y]);
        if (blank.x < BOARD_SIZE - 1) neighbors.push([blank.x + 1, blank.y]);
        const [nx, ny] = neighbors[Math.floor(Math.random() * neighbors.length)];
        // Swap
        bd[blank.y][blank.x] = bd[ny][nx];
        bd[ny][nx] = 0;
        blank = { x: nx, y: ny };
      }
      // Avoid producing a solved board (not fun), ensure solvable
      if (!checkSolved(bd) && isSolvable(bd)) gotUnsolved = true;
      tries++;
    }
    setBoard(deepCopyBoard(bd));
    setMoves(0);
    setWon(false);
  }

  /**
   * On first mount, shuffle the board.
   * This matches required: shuffle-on-mount, not just on replay/reset.
   */
  useEffect(() => {
    shuffleSolvableUnsolved();
    // eslint-disable-next-line
  }, []);

  function handleTileClick(x, y) {
    if (won) return; // No moves after win
    if (!canMoveTile(board, x, y)) return;
    const bcopy = deepCopyBoard(board);
    const { x: bx, y: by } = findBlank(board);
    // Swap tile and blank
    bcopy[by][bx] = bcopy[y][x];
    bcopy[y][x] = 0;

    setBoard(bcopy);
    setMoves((m) => m + 1);
    if (checkSolved(bcopy)) {
      setWon(true);
      saveStats(moves + 1);
    }
  }

  function handleReplay() {
    shuffleSolvableUnsolved();
  }

  // Save best stats locally
  function saveStats(movesVal) {
    try {
      if (typeof window !== "undefined") {
        const prevMoves = Number(
          window.localStorage.getItem("mmarcade-slidingtile-bestmoves") || "10000"
        );
        if (!prevMoves || movesVal < prevMoves) {
          window.localStorage.setItem("mmarcade-slidingtile-bestmoves", movesVal);
        }
      }
    } catch {}
  }

  /**
   * Render the puzzle board
   */
  function renderBoard() {
    return (
      <div className="slidingpuzzle-board" aria-label="Sliding tile puzzle grid">
        {board.map((row, y) =>
          row.map((v, x) => {
            const isBlank = v === 0;
            return (
              <button
                key={`${y}-${x}`}
                className={
                  "tile" +
                  (isBlank ? " blank" : "") +
                  (canMoveTile(board, x, y) && !isBlank && !won ? " movable" : "")
                }
                disabled={isBlank || won || !canMoveTile(board, x, y)}
                onClick={() => handleTileClick(x, y)}
                aria-label={isBlank ? "Blank tile" : `Tile ${v}`}
                tabIndex={isBlank ? -1 : 0}
              >
                {!isBlank && v}
              </button>
            );
          })
        )}
      </div>
    );
  }

  /**
   * Show a congratulatory message if won!
   */
  function renderWinBanner() {
    if (!won) return null;
    return (
      <div className="slidingpuzzle-banner">
        🎉 Puzzle solved in <b>{moves}</b> moves!
        <button className="btn" onClick={handleReplay} style={{ marginLeft: 24 }}>
          Play Again
        </button>
      </div>
    );
  }

  return (
    <div className="slidingpuzzle-root" style={{ minHeight: "100vh" }}>
      <div className="slidingpuzzle-card">
        <header className="slidingpuzzle-header">
          <h2 className="slidingpuzzle-title">
            <span className="slidingpuzzle-icon" aria-hidden="true">
              🔲
            </span>{" "}
            Sliding Tile Puzzle
          </h2>
          <div className="slidingpuzzle-subtitle">
            Arrange tiles from 1–15 in order by sliding them. Fewer moves = better!
          </div>
        </header>
        <section className="slidingpuzzle-boardzone">
          {renderBoard()}
        </section>
        <footer className="slidingpuzzle-stats">
          <span>
            Moves: <b>{moves}</b>
          </span>
          <button className="btn" style={{ marginLeft: 18 }} onClick={handleReplay}>
            ↻ Shuffle
          </button>
        </footer>
        {renderWinBanner()}
      </div>
      <div className="slidingpuzzle-instructions">
        Tap any movable tile next to the blank to slide. Solve the puzzle as fast as possible! <br />
        <i>Note: This game shuffles to a random, solvable (and unsolved!) state on first load each time.</i>
      </div>
    </div>
  );
}

export default SlidingTilePuzzlePage;
