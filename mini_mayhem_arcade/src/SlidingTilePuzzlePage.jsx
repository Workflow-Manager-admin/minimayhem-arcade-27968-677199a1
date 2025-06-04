import React, { useCallback, useEffect, useRef, useState } from "react";
import "./SlidingTilePuzzlePage.css";
import { useNavigate } from "react-router-dom";

/*
 * PUBLIC_INTERFACE
 * SlidingTilePuzzlePage
 * Classic hard-level sliding tile puzzle, supporting 4x4, 5x5, 6x6 grids (default 5x5).
 * Shuffles to a solvable board, tracks moves and timer, supports undo, restart, styling.
 */
const GRID_SIZES = [4, 5, 6]; // min 4x4, default 5x5
const STORAGE_BEST_MOVES = "mmarcade-slidingtile-bestmoves";
const STORAGE_BEST_TIME = "mmarcade-slidingtile-besttime";

function generateGoal(size) {
  // [1...N*N-1, 0] where 0 is the empty space
  const tiles = [];
  for (let i = 1; i < size * size; ++i) tiles.push(i);
  tiles.push(0);
  return tiles;
}

// Shuffle using Fisher-Yates and ensure solvable
function shuffleBoard(goalTiles, size) {
  let board = goalTiles.slice();
  do {
    for (let i = board.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [board[i], board[j]] = [board[j], board[i]];
    }
  } while (!isSolvable(board, size) || isSolved(board, size));
  return board;
}

// Solvability check for N-puzzle, assuming 0 is the blank (bottom-right in solved)
function isSolvable(arr, size) {
  let inv = 0;
  for (let i = 0; i < arr.length; i++) {
    for (let j = i + 1; j < arr.length; j++) {
      if (arr[i] && arr[j] && arr[i] > arr[j]) inv++;
    }
  }
  if (size % 2 === 1) {
    // Odd grid, solvable if inversions even
    return inv % 2 === 0;
  } else {
    // Even grid, blank row from bottom (1-based)
    const blankRow = size - Math.floor(arr.indexOf(0) / size);
    if (blankRow % 2 === 0) {
      // Blank on even row from bottom, must have odd inversions
      return inv % 2 === 1;
    } else {
      // Blank on odd row from bottom, must have even inversions
      return inv % 2 === 0;
    }
  }
}

function isSolved(tiles, size) {
  for (let i = 0; i < size * size - 1; ++i) {
    if (tiles[i] !== i + 1) return false;
  }
  return tiles[tiles.length - 1] === 0;
}

function formatTime(s) {
  const m = Math.floor(s / 60);
  const ss = s % 60;
  return `${m}:${ss < 10 ? "0" : ""}${ss}`;
}

function getBestScore(key) {
  if (typeof window === "undefined") return null;
  try {
    const val = window.localStorage.getItem(key);
    if (val != null) return JSON.parse(val);
  } catch {}
  return null;
}

function saveBestScore(key, value, comparator = (a, b) => a < b) {
  if (typeof window === "undefined") return;
  try {
    const existing = getBestScore(key);
    if (
      typeof existing === "number" &&
      !comparator(value, existing)
    )
      return;
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

function SlidingTilePuzzlePage() {
  const defaultSize = 5;
  const [gridSize, setGridSize] = useState(defaultSize);
  const [tiles, setTiles] = useState(generateGoal(defaultSize));
  const [history, setHistory] = useState([]); // Stack of {tiles, moves, time}
  const [moves, setMoves] = useState(0);
  const [timer, setTimer] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameWon, setGameWon] = useState(false);

  const timerRef = useRef();
  const navigate = useNavigate();

  // Shuffle and start a new game
  const startGame = useCallback(
    (size = gridSize) => {
      const goal = generateGoal(size);
      const fresh = shuffleBoard(goal, size);
      setTiles(fresh);
      setHistory([]);
      setMoves(0);
      setTimer(0);
      setGameStarted(false);
      setTimerRunning(false);
      setGameWon(false);
      setGridSize(size);
    },
    [gridSize]
  );

  // On mount or grid size change, start game
  useEffect(() => {
    startGame(gridSize);
    // eslint-disable-next-line
  }, [gridSize]);

  // Timer
  useEffect(() => {
    if (timerRunning && !gameWon) {
      timerRef.current = setInterval(() => setTimer((t) => t + 1), 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    return () => clearInterval(timerRef.current);
  }, [timerRunning, gameWon]);

  // Win detection
  useEffect(() => {
    if (isSolved(tiles, gridSize) && !gameWon) {
      setTimerRunning(false);
      setGameWon(true);
      // Try save best score
      if (typeof window !== "undefined") {
        if (
          moves > 0 &&
          (!getBestScore(STORAGE_BEST_MOVES) || moves < getBestScore(STORAGE_BEST_MOVES))
        ) {
          saveBestScore(STORAGE_BEST_MOVES, moves);
        }
        if (
          timer > 0 &&
          (!getBestScore(STORAGE_BEST_TIME) || timer < getBestScore(STORAGE_BEST_TIME))
        ) {
          saveBestScore(STORAGE_BEST_TIME, timer);
        }
      }
    }
    // eslint-disable-next-line
  }, [tiles, moves, timer, gameWon]);

  // Handle tile click
  function handleTileClick(i) {
    if (gameWon) return;
    const sz = gridSize;
    const emptyIdx = tiles.indexOf(0);
    // tile i must be adjacent to empty
    const eRow = Math.floor(emptyIdx / sz),
      eCol = emptyIdx % sz;
    const row = Math.floor(i / sz),
      col = i % sz;
    if (
      (row === eRow && Math.abs(col - eCol) === 1) ||
      (col === eCol && Math.abs(row - eRow) === 1)
    ) {
      // Valid move
      if (!gameStarted) {
        setGameStarted(true);
        setTimerRunning(true);
      }
      setHistory((h) =>
        h.length > 40
          ? [...h.slice(-40), { tiles: tiles.slice(), moves, timer }]
          : [...h, { tiles: tiles.slice(), moves, timer }]
      );
      const updated = tiles.slice();
      updated[emptyIdx] = updated[i];
      updated[i] = 0;
      setTiles(updated);
      setMoves((m) => m + 1);
    }
  }

  // Undo
  function handleUndo() {
    if (history.length < 1 || gameWon) return;
    const last = history[history.length - 1];
    setTiles(last.tiles.slice());
    setMoves(last.moves);
    setTimer(last.timer);
    setHistory((h) => h.slice(0, h.length - 1));
    setGameStarted(true);
    setTimerRunning(true);
    setGameWon(false);
  }

  // Restart
  function handleRestart() {
    startGame(gridSize);
  }

  // Grid size change
  function handleGridSize(e) {
    startGame(Number(e.target.value));
  }

  // For accessibility: arrow keys move empty tile if focused, R=replay, U=undo
  useEffect(() => {
    const handler = (e) => {
      if (gameWon) {
        if (e.key === "Enter" || e.key === " ") {
          handleRestart();
        }
        return;
      }
      const sz = gridSize;
      const empty = tiles.indexOf(0);
      let target;
      if (e.key === "ArrowUp") {
        if (empty + sz < sz * sz) target = empty + sz;
      } else if (e.key === "ArrowDown") {
        if (empty - sz >= 0) target = empty - sz;
      } else if (e.key === "ArrowLeft") {
        if (empty % sz < sz - 1) target = empty + 1;
      } else if (e.key === "ArrowRight") {
        if (empty % sz > 0) target = empty - 1;
      } else if (e.key === "r" || e.key === "R") {
        handleRestart();
        return;
      } else if (e.key === "u" || e.key === "U") {
        handleUndo();
        return;
      }
      if (typeof target === "number") {
        handleTileClick(target);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line
  }, [tiles, gridSize, gameWon, history, moves, timer]);

  // Win modal
  function WinModal({ open, moves, time, bestMoves, bestTime, onReplay, onBack }) {
    if (!open) return null;
    return (
      <div className="sliding-modal-backdrop">
        <div className="sliding-modal-content" role="dialog" aria-modal="true">
          <span className="sliding-modal-trophy" role="img" aria-label="trophy">
            🏆
          </span>
          <div className="sliding-modal-title">You Solved It!</div>
          <div className="sliding-modal-stats">
            <span className="sliding-modal-stat">
              <span className="caption">Moves</span>
              <span className="value">{moves}</span>
            </span>
            <span className="sliding-modal-stat">
              <span className="caption">Time</span>
              <span className="value">{formatTime(time)}</span>
            </span>
          </div>
          <div className="sliding-modal-best-row">
            <span className="modal-best-label">Best: </span>
            <span className="modal-best-score">
              {typeof bestMoves === "number" && typeof bestTime === "number"
                ? `${bestMoves} moves, ${formatTime(bestTime)}`
                : "-"}
            </span>
          </div>
          <button className="btn accent sliding-modal-replay-btn" onClick={onReplay}>
            <span aria-hidden="true">↻</span> Replay
          </button>
          <button className="btn sliding-modal-link-btn" onClick={onBack}>
            Back to Games
          </button>
        </div>
      </div>
    );
  }

  // For "Best Score" display
  const bestMovesScore = getBestScore(STORAGE_BEST_MOVES);
  const bestTimeScore = getBestScore(STORAGE_BEST_TIME);

  // Board render
  function renderBoard() {
    const sz = gridSize;
    return (
      <div
        className={`sliding-board sliding-board-${sz}`}
        style={{
          gridTemplateColumns: `repeat(${sz}, 1fr)`,
          gridTemplateRows: `repeat(${sz}, 1fr)`,
        }}
        aria-label={`Sliding Tile Puzzle ${sz}x${sz}`}
        tabIndex={0}
      >
        {tiles.map((tile, i) => {
          const isEmpty = tile === 0;
          return (
            <button
              key={i}
              className={`sliding-tile${isEmpty ? " empty" : ""}`}
              style={{
                animationDelay: gameStarted
                  ? "0s"
                  : ((0.55 * i) / (sz * sz)).toFixed(2) + "s",
              }}
              tabIndex={isEmpty ? -1 : 0}
              disabled={gameWon || isEmpty}
              aria-label={isEmpty ? "Empty space" : `Tile ${tile}`}
              onClick={() => handleTileClick(i)}
            >
              {isEmpty ? "" : tile}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="slidingpuzzle-root">
      <div className="sliding-blur1"></div>
      <div className="sliding-blur2"></div>
      <section className="slidingpuzzle-main-card">
        <header className="slidingpuzzle-header">
          <h2 className="slidingpuzzle-title">
            <span className="sliding-emoji" aria-hidden="true">
              🔲
            </span>{" "}
            Sliding Tile Puzzle
          </h2>
          <div className="slidingpuzzle-instructions">
            Slide tiles in order from 1 to {(gridSize * gridSize) - 1}.{" "}
            <span className="mobile-hide">
              Click/arrow-key tiles next to the empty space. Undo/Restart anytime.
            </span>
          </div>
        </header>
        <div className="slidingpuzzle-controls-row">
          <label className="slidingpuzzle-size-label">
            Grid:
            <select
              value={gridSize}
              onChange={handleGridSize}
              aria-label="Grid size"
              disabled={gameStarted}
            >
              {GRID_SIZES.map((sz) => (
                <option key={sz} value={sz}>{sz} x {sz}</option>
              ))}
            </select>
          </label>
          <div className="pill-group">
            <Pill caption="Moves" value={moves} accent />
            <Pill caption="Time" value={formatTime(timer)} />
          </div>
          <button
            className="btn sliding-undo-btn"
            aria-label="Undo"
            disabled={!history.length || gameWon}
            onClick={handleUndo}
          >
            <span aria-hidden="true">⎌</span> Undo
          </button>
          <button
            className="btn sliding-restart-btn"
            aria-label="Restart"
            onClick={handleRestart}
          >
            <span aria-hidden="true">↻</span> Restart
          </button>
        </div>
        {renderBoard()}
        {!gameStarted && !gameWon && (
          <div className="sliding-tip">
            Move tiles into order as fast as you can! Fewer moves & time wins.
          </div>
        )}
        <div className="sliding-best-info">
          <b>Best:</b>{" "}
          {typeof bestMovesScore === "number" && typeof bestTimeScore === "number"
            ? `${bestMovesScore} moves, ${formatTime(bestTimeScore)}`
            : "No record yet"}
        </div>
      </section>
      <WinModal
        open={gameWon}
        moves={moves}
        time={timer}
        bestMoves={bestMovesScore}
        bestTime={bestTimeScore}
        onReplay={handleRestart}
        onBack={() => navigate("/games")}
      />
    </div>
  );
}

// Pill-styled info chip
function Pill({ caption, value, accent }) {
  return (
    <span className={`pill sliding-pill${accent ? " accent" : ""}`}>
      <span className="pill-caption">{caption}</span>
      <span className="pill-value">{value}</span>
    </span>
  );
}

export default SlidingTilePuzzlePage;
