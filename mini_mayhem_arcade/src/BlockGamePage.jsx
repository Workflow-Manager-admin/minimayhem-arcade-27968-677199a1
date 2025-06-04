import React, { useEffect, useRef, useState } from "react";
import "./BlockGamePage.css";
import { useNavigate } from "react-router-dom";

/*
 * PUBLIC_INTERFACE
 * BlockGamePage: 10x10 block-fit puzzle game inspired by 1010/Blockudoku
 * - Drag/drop (tap/click-to-place) random shapes onto a 10x10 grid
 * - Clear full rows/columns, earn points, game ends when no placement is possible
 * - High score saved in localStorage as "mmarcade-blockgame-highscore"
 * - Neon/soft glow style, dark and light modes
 */

// --- Block shapes (classic 1010: 1-5 blocks, straight, square, L, T variants)
const SHAPES = [
  [[1]],

  [[1, 1]],
  [[1], [1]],
  [[1, 1, 1]],
  [[1], [1], [1]],

  [[1, 1, 1, 1]],
  [[1], [1], [1], [1]],

  [[1, 1, 1, 1, 1]],
  [[1], [1], [1], [1], [1]],

  [[1, 1], [1, 1]], // 2x2 square

  [[1, 1, 1], [0, 1, 0]], // T
  [[1, 0], [1, 1]], // L
  [[0, 1], [1, 1]], // mirrored L

  [[1, 1, 0], [0, 1, 1]], // Z
  [[0, 1, 1], [1, 1, 0]], // S
];

// Assign each shape a color (neon soft palette)
const SHAPE_COLORS = [
  "#28f1ec", "#f8ae2c", "#60e95d", "#e166e2", "#4daffc",
  "#ffd84d", "#a2f24b", "#e24b50", "#21deff", "#f9a3e3",
  "#62aaff", "#ff4d75", "#20ffd0", "#ffb347", "#b584ff"
];

// --- Board setup
const BOARD_SIZE = 10; // 10x10 grid

// Shape randomizer for 3 selectable blocks
function generateRandomBlockSet() {
  let set = [];
  while (set.length < 3) {
    const idx = Math.floor(Math.random() * SHAPES.length);
    // Optionally, avoid repeats for greater variety
    set.push({
      shape: SHAPES[idx],
      id: Date.now() + "-" + idx + "-" + Math.random().toString(36).slice(2, 7),
      color: SHAPE_COLORS[idx % SHAPE_COLORS.length]
    });
  }
  return set;
}

// --- Utility: check if a shape fits on grid at [row, col]
// shape: array, board: array, [row,col] is top/left
function canPlaceShape(board, shape, row, col) {
  for (let r = 0; r < shape.length; ++r) {
    for (let c = 0; c < shape[0].length; ++c) {
      if (shape[r][c]) {
        // Out of bounds or collision
        if (
          row + r < 0 ||
          row + r >= BOARD_SIZE ||
          col + c < 0 ||
          col + c >= BOARD_SIZE ||
          board[row + r][col + c]
        ) {
          return false;
        }
      }
    }
  }
  return true;
}

// --- Place shape on board (mutates clone), returns new board
function placeShapeOnBoard(board, shape, row, col, color) {
  const newBoard = board.map(row => [...row]);
  for (let r = 0; r < shape.length; ++r) {
    for (let c = 0; c < shape[0].length; ++c) {
      if (shape[r][c]) {
        newBoard[row + r][col + c] = color;
      }
    }
  }
  return newBoard;
}

// --- Find/clear full rows/columns, return { clearedCount, board }
function clearFullLines(board) {
  const fullRows = [], fullCols = [];
  // Check rows
  for (let r = 0; r < BOARD_SIZE; ++r) {
    if (board[r].every(cell => !!cell)) fullRows.push(r);
  }
  // Check columns
  for (let c = 0; c < BOARD_SIZE; ++c) {
    let isFull = true;
    for (let r = 0; r < BOARD_SIZE; ++r) {
      if (!board[r][c]) { isFull = false; break; }
    }
    if (isFull) fullCols.push(c);
  }
  // Clear lines
  let cleared = 0;
  const newBoard = board.map(row => [...row]);
  if (fullRows.length) {
    fullRows.forEach(r => {
      for (let c = 0; c < BOARD_SIZE; ++c) newBoard[r][c] = null;
    });
    cleared += fullRows.length;
  }
  if (fullCols.length) {
    fullCols.forEach(c => {
      for (let r = 0; r < BOARD_SIZE; ++r) newBoard[r][c] = null;
    });
    cleared += fullCols.length;
  }
  return { clearedCount: cleared, board: newBoard };
}

// --- Check if any of the current blocks can fit ANYWHERE on the board
function canFitAnyBlock(board, blocks) {
  for (let b of blocks) {
    for (let r = 0; r <= BOARD_SIZE - b.shape.length; ++r) {
      for (let c = 0; c <= BOARD_SIZE - b.shape[0].length; ++c) {
        if (canPlaceShape(board, b.shape, r, c)) return true;
      }
    }
  }
  return false;
}

// --- Format score
function formatScore(score) {
  return score.toLocaleString();
}

function getHighScore() {
  if (typeof window === "undefined") return 0;
  const val = window.localStorage.getItem("mmarcade-blockgame-highscore");
  return val ? parseInt(val, 10) : 0;
}

function setHighScore(score) {
  if (typeof window === "undefined") return;
  const prev = getHighScore();
  if (score > prev) {
    window.localStorage.setItem("mmarcade-blockgame-highscore", score);
  }
}

// PUBLIC_INTERFACE
function BlockGamePage() {
  // --- Main game state
  const [board, setBoard] = useState(() =>
    Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(null))
  );
  const [blockSet, setBlockSet] = useState(generateRandomBlockSet());
  const [selectedBlockIdx, setSelectedBlockIdx] = useState(null);
  const [placing, setPlacing] = useState(null); // { shape, color }
  const [previewCell, setPreviewCell] = useState(null); // { r,c }
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [highScore, setHS] = useState(getHighScore());
  const navigate = useNavigate();
  const boardRef = useRef();

  // Load high score from localStorage on mount and after gameover
  useEffect(() => {
    setHS(getHighScore());
  }, [gameOver]);

  // Handle block selection (click)
  function handleBlockSelect(idx) {
    if (!blockSet[idx]) return;
    setSelectedBlockIdx(idx);
    setPlacing({
      ...blockSet[idx],
    });
  }

  // Placement preview (hover/focus): show only if shape selected
  function handleCellMouseOver(r, c) {
    if (placing) {
      setPreviewCell({ r, c });
    }
  }
  function handleCellMouseOut() {
    setPreviewCell(null);
  }

  // Attempt to place a shape at board[r][c] (on click)
  function handleCellClick(r, c) {
    if (!placing) return;
    const shape = placing.shape;
    const color = placing.color;
    if (!canPlaceShape(board, shape, r, c)) {
      // Optionally, show feedback?
      return;
    }
    // Place
    let nextBoard = placeShapeOnBoard(board, shape, r, c, color);
    // Clear lines, get score
    const { clearedCount, board: clearedBoard } = clearFullLines(nextBoard);
    let added = 0;
    for (let rr = 0; rr < shape.length; ++rr) {
      for (let cc = 0; cc < shape[0].length; ++cc) {
        if (shape[rr][cc]) added += 1;
      }
    }
    let nextScore = score + added + clearedCount * 10;
    setScore(nextScore);

    // Remove that block from set
    let nextBlockSet = blockSet.slice();
    nextBlockSet.splice(selectedBlockIdx, 1);

    // Set state/reset placements
    setBoard(clearedBoard);
    setBlockSet(nextBlockSet);
    setSelectedBlockIdx(null);
    setPlacing(null);
    setPreviewCell(null);

    // If all blocks used, refill
    setTimeout(() => {
      if (nextBlockSet.length === 0) {
        setBlockSet(generateRandomBlockSet());
      }
    }, 140);

    // Check end
    setTimeout(() => {
      if (!canFitAnyBlock(clearedBoard, nextBlockSet.length ? nextBlockSet : generateRandomBlockSet())) {
        // Game over!
        setGameOver(true);
        setHighScore(nextScore);
        setHS(getHighScore());
      }
    }, 300);
  }

  function handleRestart() {
    setBoard(Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(null)));
    setBlockSet(generateRandomBlockSet());
    setSelectedBlockIdx(null);
    setPlacing(null);
    setPreviewCell(null);
    setScore(0);
    setGameOver(false);
  }

  // Keyboard shortcuts: [R]estart, 1/2/3 to select block
  useEffect(() => {
    function handler(e) {
      if (e.key === "r" || e.key === "R") {
        handleRestart();
      }
      if (!gameOver && ["1", "2", "3"].includes(e.key)) {
        handleBlockSelect(parseInt(e.key) - 1);
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line
  }, [blockSet, gameOver, selectedBlockIdx]);

  // For mobile: tap cell to place after selecting block
  // On screen, shapes show tap/click to "pick up", then tap on board to place

  // UI rendering
  return (
    <div className="blockgame-root">
      <div className="blockgame-blur1"></div>
      <div className="blockgame-blur2"></div>
      <main className="blockgame-main-card">
        <header className="blockgame-header">
          <h2 className="blockgame-title">
            <span className="blockgame-emoji" aria-hidden="true">🧩</span> Block Fit Puzzle
          </h2>
          <div className="blockgame-pills">
            <StatPill label="Score" value={formatScore(score)} accent />
            <StatPill label="High" value={formatScore(highScore)} />
            <button className="blockgame-btn s" aria-label="Restart" onClick={handleRestart}>
              <span aria-hidden="true">↻</span> Restart
            </button>
            <button className="blockgame-btn s" onClick={() => navigate("/games")}>
              ← Back to Games
            </button>
          </div>
        </header>
        <section className="blockgame-board-zone">
          <BoardGrid
            board={board}
            placing={placing}
            previewCell={previewCell}
            onCellClick={handleCellClick}
            onCellMouseOver={handleCellMouseOver}
            onCellMouseOut={handleCellMouseOut}
            gameOver={gameOver}
            ref={boardRef}
          />
        </section>
        <section className="blockgame-shapes-row">
          {blockSet.map((block, i) => (
            <div
              key={block.id}
              className={
                "blockgame-shape-picker" +
                (selectedBlockIdx === i ? " selected" : "") +
                (!canFitAnyBlock(board, [block]) ? " unusable" : "")
              }
              tabIndex={0}
              aria-label={"Select block " + (i + 1)}
              title={`Pick Block ${i + 1} (Key: ${i + 1})`}
              onClick={() => handleBlockSelect(i)}
              onKeyDown={e => {
                if (e.key === "Enter" || e.key === " ") handleBlockSelect(i);
              }}
            >
              <ShapePreview shape={block.shape} color={block.color} />
              <span className="blockgame-shape-label">{i + 1}</span>
            </div>
          ))}
        </section>
        <section className="blockgame-instructions">
          <b>How to play:</b> Select a neon block below, then tap/click on the board to place. Clear filled rows and columns for bonus points!
          <br />
          <small>
            <span className="blockgame-tip">Tip: Use keys 1/2/3 or <b>R</b> to restart.</span>
          </small>
        </section>
      </main>
      {gameOver && (
        <GameOverModal
          score={score}
          highScore={highScore}
          onRestart={handleRestart}
          onExit={() => navigate("/games")}
        />
      )}
    </div>
  );
}

// --- Pills for stats/top row
function StatPill({ label, value, accent }) {
  return (
    <span className={`blockgame-pill${accent ? " accent" : ""}`}>
      <span className="pill-label">{label}</span>
      <span className="pill-value">{value}</span>
    </span>
  );
}

// --- Board grid rendering
const BoardGrid = React.forwardRef(
  (
    {
      board,
      placing,
      previewCell,
      onCellClick,
      onCellMouseOver,
      onCellMouseOut,
      gameOver
    },
    ref
  ) => {
    return (
      <div
        className={`blockgame-board${gameOver ? " board-over" : ""}`}
        ref={ref}
        tabIndex={0}
        aria-label="Block Fit Game Board (10 by 10 grid)"
      >
        {board.map((row, r) =>
          row.map((cell, c) => {
            // Preview placement shape highlight
            let preview = false,
              previewEdges = false;
            if (
              placing &&
              previewCell &&
              canPlaceShape(board, placing.shape, previewCell.r, previewCell.c)
            ) {
              // If this cell is covered by the preview shape at anchor
              const relR = r - previewCell.r;
              const relC = c - previewCell.c;
              if (
                relR >= 0 &&
                relC >= 0 &&
                relR < placing.shape.length &&
                relC < placing.shape[0].length &&
                placing.shape[relR][relC]
              ) {
                preview = true;
              }
            }
            return (
              <button
                key={r + "-" + c}
                className={
                  "blockgame-cell" +
                  (cell ? " filled" : "") +
                  (preview ? " preview" : "") +
                  (gameOver ? " over" : "")
                }
                style={cell ? { background: cell, boxShadow: `0 1px 14px ${cell}77` } : {}}
                tabIndex={0}
                onMouseOver={() => onCellMouseOver(r, c)}
                onFocus={() => onCellMouseOver(r, c)}
                onMouseOut={onCellMouseOut}
                onBlur={onCellMouseOut}
                onClick={() => onCellClick(r, c)}
                aria-label={`Cell (${r + 1},${c + 1})`}
                disabled={!!gameOver}
              />
            );
          })
        )}
      </div>
    );
  }
);

// --- Shape preview (for palette/selector)
function ShapePreview({ shape, color }) {
  return (
    <div className="blockgame-shape-preview" aria-hidden="true">
      {shape.map((row, r) =>
        row.map((cell, c) =>
          cell ? (
            <span
              key={r + "-" + c}
              className="blockgame-shape-cell"
              style={{
                background: color,
                boxShadow: `0 0 8px 1px ${color}88, 0 2px 10px 0 ${color}63`
              }}
            />
          ) : (
            <span key={r + "-" + c} className="blockgame-shape-empty" />
          )
        )
      )}
    </div>
  );
}

function GameOverModal({ score, highScore, onRestart, onExit }) {
  return (
    <div className="blockgame-modal-backdrop">
      <div className="blockgame-modal-content" role="dialog" aria-modal="true">
        <div className="blockgame-modal-trophy">🏆</div>
        <div className="blockgame-modal-title">
          Game Over!
        </div>
        <div className="blockgame-modal-score-row">
          <span className="blockgame-modal-label">Score:</span>{" "}
          <span className="blockgame-modal-value">{formatScore(score)}</span>
        </div>
        <div className="blockgame-modal-score-row">
          <span className="blockgame-modal-label">Your Best:</span>{" "}
          <span className="blockgame-modal-value">{formatScore(highScore)}</span>
        </div>
        <button className="blockgame-btn blockgame-modal-btn" onClick={onRestart} autoFocus>
          <span aria-hidden="true">↺</span> Play Again
        </button>
        <button className="blockgame-btn blockgame-modal-btn" onClick={onExit}>
          ← Back to Games
        </button>
      </div>
    </div>
  );
}

export default BlockGamePage;
