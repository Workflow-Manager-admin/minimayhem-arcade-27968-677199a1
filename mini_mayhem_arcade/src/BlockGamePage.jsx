import React, { useEffect, useState, useCallback } from "react";
import "./BlockGamePage.css";
import { useNavigate } from "react-router-dom";

/*
  PUBLIC_INTERFACE
  BlockGamePage
  - 10x10 grid casual block-fit puzzle (1010-style)
  - Mouse/touch drag or tap controls (desktop/mobile friendly)
  - Random shape choices, placement, row/column clear, score handling, game over logic
  - Neon/soft color theming (detect dark/light mode)
  - Score persistence via localStorage
*/

// --- Constants ---
const GRID_SIZE = 10;
// Shapes: arrays of [x,y] coords relative to anchor (top-left = 0,0).
const SHAPES = [
  // Single blocks
  [[0, 0]],
  // 2-block lines
  [[0, 0], [1, 0]],
  [[0, 0], [0, 1]],
  // 3-block lines
  [[0,0],[1,0],[2,0]],
  [[0,0],[0,1],[0,2]],
  // 4-block lines
  [[0,0],[1,0],[2,0],[3,0]],
  [[0,0],[0,1],[0,2],[0,3]],
  // 5-block lines
  [[0,0],[1,0],[2,0],[3,0],[4,0]],
  [[0,0],[0,1],[0,2],[0,3],[0,4]],
  // 2x2 square
  [[0,0],[1,0],[0,1],[1,1]],
  // 3x3 square
  [[0,0],[1,0],[2,0],[0,1],[1,1],[2,1],[0,2],[1,2],[2,2]],
  // "L" shapes
  [[0,0],[0,1],[0,2],[1,2]],
  [[0,0],[1,0],[2,0],[2,1]],
  [[0,0],[1,0],[1,1],[1,2]],
  [[0,2],[1,2],[1,1],[1,0]],
  // "T" shape (3 across + center below)
  [[0,0],[1,0],[2,0],[1,1]],
  // S shape
  [[0,0],[1,0],[1,1],[2,1]],
  [[1,0],[2,0],[0,1],[1,1]]
];
// Neon palette, softed
const BLOCK_PALETTE = [
  "#00ffd0", // Aqua
  "#ffe07a", // Yellow
  "#fd89ff", // Pink
  "#89fcff", // Light blue
  "#ffb374", // Orange
  "#85ff52", // Green
  "#8aadf6", // Sky blue
  "#fc96c4", // Pink
  "#68adc4", // Brand blue
];
function randomBlockColor() {
  return BLOCK_PALETTE[Math.floor(Math.random()*BLOCK_PALETTE.length)];
}

const STORAGE_BEST_KEY = "blockgame-bestscore";
const STORAGE_LAST_KEY = "blockgame-lastscore";

// --- Utility Functions ---
function emptyGrid() {
  return Array(GRID_SIZE).fill().map(()=>Array(GRID_SIZE).fill(null));
}
function deepCopyGrid(grid) {
  return grid.map(row => row.slice());
}
// Return array [row indices], [col indices] which can be fully cleared
function getFullRowsCols(grid) {
  const fullRows = [];
  const fullCols = [];
  for (let r=0; r<GRID_SIZE; ++r)
    if (grid[r].every(cell => cell !== null)) fullRows.push(r);
  for (let c=0; c<GRID_SIZE; ++c)
    if (grid.every(row => row[c] !== null)) fullCols.push(c);
  return [fullRows, fullCols];
}
function canPlaceShapeOnGrid(grid, shape, anchorX, anchorY) {
  for (let [dx,dy] of shape)
    if (
      anchorY+dy<0 || anchorY+dy>=GRID_SIZE 
      || anchorX+dx<0 || anchorX+dx>=GRID_SIZE 
      || grid[anchorY+dy][anchorX+dx] !== null
    )
      return false;
  return true;
}
// Checks if any legal placement exists for the given shape on this grid
function hasPlacement(grid, shape) {
  for (let y=0; y<GRID_SIZE; ++y)
    for (let x=0; x<GRID_SIZE; ++x)
      if (canPlaceShapeOnGrid(grid, shape, x, y))
        return true;
  return false;
}

// -- Page Component --
function BlockGamePage() {
  // Game state
  const [grid, setGrid] = useState(() => emptyGrid());
  const [pieces, setPieces] = useState(() => generatePieces());
  const [selectedIdx, setSelectedIdx] = useState(null); // index of dragged/clicked piece
  const [ghostPos, setGhostPos] = useState(null); // {row,col}
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [bestScore, setBestScore] = useState(() => loadBestScore());
  const [lastScore, setLastScore] = useState(() => loadLastScore());
  const [isMobile, setIsMobile] = useState(false);

  const navigate = useNavigate();

  // Effect: Detect mobile/touch
  useEffect(() => {
    setIsMobile(window.matchMedia("(pointer: coarse)").matches || /Mobi|Android/i.test(navigator.userAgent));
  }, []);

  // Effect: On mount/load, reset all state
  useEffect(() => {
    resetGame();
    // eslint-disable-next-line
  }, []);

  // Generate 3 new pieces
  function generatePieces() {
    return Array(3)
      .fill(0)
      .map(() => {
        const shape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
        const color = randomBlockColor();
        return { shape, color, used: false };
      });
  }

  // Busy check (game over): after every turn/piece
  useEffect(() => {
    // Only check if NO piece is currently used
    const unusedPieces = pieces.filter((p) => !p.used);
    // If any unused piece is possible to place, not over
    if (unusedPieces.length && !gameOver) {
      // If none can be played, end
      if (!unusedPieces.some(p => hasPlacement(grid, p.shape))) {
        setGameOver(true);
        persistScores(score);
      }
    }
    // eslint-disable-next-line
  }, [pieces, grid]);

  // Handle piece drag-start/select (desktop: mousedown, mobile: touch)
  function onSelectPiece(idx) {
    if (gameOver || pieces[idx].used) return;
    setSelectedIdx(idx);
    setGhostPos(null);
  }
  // Place piece (by anchor cell)
  function tryPlacePiece(idx, cellX, cellY) {
    if (gameOver) return;
    const p = pieces[idx];
    if (!p || p.used) return false;
    if (!canPlaceShapeOnGrid(grid, p.shape, cellX, cellY)) return false;
    // Place on a temp grid
    let newGrid = deepCopyGrid(grid);
    for (let [dx, dy] of p.shape) {
      newGrid[cellY + dy][cellX + dx] = p.color;
    }
    // Check for rows/cols to clear after placing
    let [rows, cols] = getFullRowsCols(newGrid);
    let cellsCleared = 0;
    if (rows.length || cols.length) {
      for (let r of rows) {
        newGrid[r] = Array(GRID_SIZE).fill(null);
        cellsCleared += GRID_SIZE;
      }
      for (let c of cols) {
        for (let r = 0; r < GRID_SIZE; ++r)
          if (newGrid[r][c] !== null) {
            newGrid[r][c] = null;
            cellsCleared += 1;
          }
      }
    }
    // Score: +#placed, +20 (row/col clear), +cells cleared for combos (bonus)
    let gained = p.shape.length;
    if ((rows.length || cols.length)) gained += 20 * (rows.length + cols.length);
    gained += cellsCleared * 1;
    setScore(prev => prev + gained);

    // Mark piece as used, refresh grid, check if all pieces placed
    const newPieces = pieces.map((piece, i) =>
      i === idx ? { ...piece, used: true } : piece
    );
    setGrid(newGrid);
    setPieces(newPieces);

    // If all are now used, refill hand
    if (newPieces.every(p => p.used)) {
      setTimeout(() => setPieces(generatePieces()), 225);
    }
    setSelectedIdx(null);
    setGhostPos(null);
    return true;
  }
  // Click-grid: Place selected piece at this anchor
  function onGridCellClick(x, y) {
    if (selectedIdx == null || pieces[selectedIdx].used) return;
    if (tryPlacePiece(selectedIdx, x, y)) {
      setSelectedIdx(null);
    }
  }

  // For keyboard accessibility ("r" to restart)
  useEffect(() => {
    function handler(e) {
      if (e.key === "r" || e.key === "R") resetGame();
      if ((e.key === "q" || e.key === "Q") && !gameOver) navigate("/games");
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line
  }, [gameOver, navigate]);

  // For localStorage best
  function persistScores(finalScore) {
    if (typeof window === "undefined") return;
    // Save last game
    window.localStorage.setItem(STORAGE_LAST_KEY, finalScore);
    setLastScore(finalScore);
    // Save best
    let prevBest = Number(window.localStorage.getItem(STORAGE_BEST_KEY) || 0);
    if (isNaN(prevBest) || finalScore > prevBest) {
      window.localStorage.setItem(STORAGE_BEST_KEY, finalScore);
      setBestScore(finalScore);
    }
  }
  function loadBestScore() {
    if (typeof window === "undefined") return 0;
    let bs = Number(window.localStorage.getItem(STORAGE_BEST_KEY) || 0);
    return isNaN(bs) ? 0 : bs;
  }
  function loadLastScore() {
    if (typeof window === "undefined") return 0;
    let ls = Number(window.localStorage.getItem(STORAGE_LAST_KEY) || 0);
    return isNaN(ls) ? 0 : ls;
  }

  // Reset game state
  function resetGame() {
    setGrid(emptyGrid());
    setPieces(generatePieces());
    setScore(0);
    setSelectedIdx(null);
    setGhostPos(null);
    setGameOver(false);
  }

  // Controls: mouse events for drag ghost (desktop-only)
  function handleMouseOverCell(x, y) {
    if (selectedIdx == null || pieces[selectedIdx].used) return;
    setGhostPos({ x, y });
  }
  function handleMouseLeaveGrid() {
    setGhostPos(null);
  }

  // Touch: tap first to select, tap again to place
  function handlePieceTap(idx) {
    if (selectedIdx === idx) {
      // Tap same again -> cancel select
      setSelectedIdx(null);
      setGhostPos(null);
    } else {
      onSelectPiece(idx);
    }
  }
  function handleGridTap(x, y) {
    onGridCellClick(x, y);
  }

  // Render
  return (
    <div className="blockgame-root">
      <header className="blockgame-header">
        <button className="bkg-back-btn"
         onClick={() => navigate("/games")}
         tabIndex={0}
         aria-label="Back to Mini-Games"
        >← Back</button>
        <h2 className="blockgame-title">
          <span className="bgp-emoji" role="img" aria-label="blocks">🧩</span> Block Fit Puzzle
        </h2>
        <div className="bkg-pill-row">
          <Pill label="Score" value={score} accent />
          <Pill label="Best" value={bestScore} />
          <Pill label="Last" value={lastScore} />
          <button className="bkg-restart-btn" onClick={resetGame} title="Restart [R]">↻ Restart</button>
        </div>
      </header>
      <main className="blockgame-main">
        {/* Main 10x10 grid */}
        <section
          className="blockgame-grid"
          style={{
            gridTemplateColumns: `repeat(${GRID_SIZE},1fr)`,
            gridTemplateRows: `repeat(${GRID_SIZE},1fr)`
          }}
          aria-label="Block fit puzzle grid"
          onMouseLeave={!isMobile ? handleMouseLeaveGrid : undefined}
        >
          {grid.map((row, y) =>
            row.map((cell, x) => {
              // Ghost for selected piece
              let isGhost =
                ghostPos && selectedIdx != null &&
                pieces[selectedIdx] &&
                !pieces[selectedIdx].used &&
                pieces[selectedIdx].shape.some(([dx, dy]) => ghostPos.x === x - dx && ghostPos.y === y - dy)
                && canPlaceShapeOnGrid(grid, pieces[selectedIdx].shape, ghostPos.x, ghostPos.y)
                && pieces[selectedIdx].shape.some(([dx, dy]) => ghostPos.x + dx === x && ghostPos.y + dy === y);

              let colorStyle = {};
              if (cell) colorStyle.background = cell;
              else if (isGhost && selectedIdx != null) {
                colorStyle.background = pieces[selectedIdx].color + "55";
              } else {
                colorStyle.background = "transparent";
              }
              return (
                <div
                  key={`cell-${x}-${y}`}
                  className={
                    "bg-cell" +
                    (cell ? " filled" : "") +
                    (isGhost ? " ghost" : "")
                  }
                  style={colorStyle}
                  onMouseOver={
                    !isMobile && selectedIdx != null && !pieces[selectedIdx].used
                      ? () => handleMouseOverCell(x, y)
                      : undefined
                  }
                  onClick={
                    isMobile
                      ? () => handleGridTap(x, y)
                      : () => onGridCellClick(x, y)
                  }
                  tabIndex={0}
                  aria-label={`Grid cell ${x + 1},${y + 1}`}
                >
                  {/* Optional: transition, border */}
                </div>
              );
            })
          )}
        </section>
        {/* Shape "hand" area */}
        <section className="blockgame-pieces" aria-label="Block choices">
          {pieces.map((p, idx) => (
            <BlockPiece
              key={idx}
              piece={p}
              selected={selectedIdx === idx}
              used={p.used}
              onMouseDown={!isMobile ? () => onSelectPiece(idx) : undefined}
              onClick={isMobile ? () => handlePieceTap(idx) : undefined}
              tabIndex={0}
              isMobile={isMobile}
            />
          ))}
        </section>
        {gameOver && (
          <div className="blockgame-overlay">
            <div className="blockgame-modal">
              <div className="bkg-modal-emoji">🎉</div>
              <div className="bkg-modal-title">Game Over</div>
              <div className="bkg-modal-score">Final Score: <b>{score}</b></div>
              <div className="bkg-modal-best">Best: <b>{bestScore}</b></div>
              <div>
                <button className="bkg-restart-btn big" onClick={resetGame}>New Game</button>
                <button className="bkg-back-btn" onClick={() => navigate("/games")}>← Back</button>
              </div>
            </div>
          </div>
        )}
        <div className="bkg-tip-row">
          <span>
            Place all blocks to score! Rows/columns fill up, they clear & give bonuses.<br />
            <b>Tip:</b> You can tap a piece, then tap a cell to anchor, or drag&drop (desktop).<br />
            <b>[R]</b> Restart, <b>[←]</b> Back, <b>[Q]</b> for Games menu.
          </span>
        </div>
      </main>
    </div>
  );
}

// -- BlockPiece Renders shape in a mini grid
function BlockPiece({ piece, selected, used, onMouseDown, onClick, tabIndex, isMobile }) {
  // Find bounds to fit into minimal 5x5 display grid
  const cells = piece.shape;
  const minX = Math.min(...cells.map(([x]) => x));
  const minY = Math.min(...cells.map(([, y]) => y));
  const maxX = Math.max(...cells.map(([x]) => x));
  const maxY = Math.max(...cells.map(([, y]) => y));
  const dx = maxX - minX + 1;
  const dy = maxY - minY + 1;
  const displaySize = Math.max(dx, dy);

  return (
    <button
      className={
        "bkg-piece" +
        (selected ? " selected" : "") +
        (used ? " used" : "")
      }
      style={{
        width: "80px",
        height: "80px",
        opacity: used ? 0.35 : 1
      }}
      onMouseDown={onMouseDown}
      onClick={onClick}
      disabled={used}
      tabIndex={tabIndex}
      aria-label={used ? "Piece used" : "Choose piece"}
    >
      <span
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${displaySize}, 1fr)`,
          gridTemplateRows: `repeat(${displaySize}, 1fr)`,
          width: "100%",
          height: "100%",
        }}
      >
        {Array.from({ length: displaySize * displaySize }).map((_, i) => {
          const x = i % displaySize;
          const y = Math.floor(i / displaySize);
          const match = cells.some(([cx, cy]) => cx - minX === x && cy - minY === y);
          const style = match ? {
            background: piece.color,
            borderRadius: "6px",
            boxShadow: match ? `0 0 10px 2px ${piece.color}cc` : undefined
          } : {};
          return (
            <span
              key={i}
              className={
                "bkg-mini-cell" + (match ? " filled" : "")
              }
              style={style}
            />
          );
        })}
      </span>
    </button>
  );
}
// -- Score pill badge
function Pill({ label, value, accent }) {
  return (
    <span className={"bkg-pill" + (accent ? " accent" : "")}>
      <span className="bkg-pill-label">{label}</span>
      <span className="bkg-pill-val">{value}</span>
    </span>
  );
}

export default BlockGamePage;
