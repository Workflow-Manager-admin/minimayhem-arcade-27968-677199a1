import React, { useEffect, useRef, useState } from "react";
import "./SlidingTilePuzzlePage.css";

/**
 * PUBLIC_INTERFACE
 * SlidingTilePuzzlePage
 * Puzzle grid fits a fixed (responsive) container, tiles auto-scale to gridSize.
 * Uses dynamic sizing, light/dark styles, custom palette/styles, and smooth transitions.
 */
function SlidingTilePuzzlePage() {
  // Supported grid sizes
  const SIZES = [4, 5, 6];

  // Main state
  const [size, setSize] = useState(4);
  const [tiles, setTiles] = useState([]);
  const [emptyIdx, setEmptyIdx] = useState(0);
  const [moveCount, setMoveCount] = useState(0);
  const [gameWon, setGameWon] = useState(false);
  const [history, setHistory] = useState([]); // For undo
  const [timer, setTimer] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const [fastestSolve, setFastestSolve] = useState(null); // Local best for size

  const timerRef = useRef();

  // Board setup & reset on size
  useEffect(() => {
    initializeBoard(size);
    // eslint-disable-next-line
  }, [size]);

  // Timer effect
  useEffect(() => {
    if (timerActive) {
      timerRef.current = setInterval(() => setTimer((t) => t + 1), 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    return () => clearInterval(timerRef.current);
  }, [timerActive]);

  // Load best time/moves for this size (from localStorage)
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const best = window.localStorage.getItem(`mmarcade-slidingtile-best-${size}`);
        setFastestSolve(best ? JSON.parse(best) : null);
      } catch {}
    }
  }, [size, gameWon]);

  function formatTime(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  }

  // Shuffle to a solvable & unsolved board of current size
  function initializeBoard(sz) {
    const arr = Array.from({ length: sz * sz }, (_, i) => i);
    let shuffled = [];
    do {
      shuffled = arr.slice().sort(() => Math.random() - 0.5);
    } while (!isSolvable(shuffled, sz) || isSolved(shuffled));
    setTiles(shuffled);
    setEmptyIdx(shuffled.indexOf(0));
    setMoveCount(0);
    setGameWon(false);
    setHistory([]);
    setTimer(0);
    setTimerActive(false);
    // Set best record
    if (typeof window !== "undefined") {
      try {
        const best = window.localStorage.getItem(`mmarcade-slidingtile-best-${sz}`);
        setFastestSolve(best ? JSON.parse(best) : null);
      } catch {}
    }
  }

  function handleTileClick(idx) {
    if (gameWon) return;
    const row = Math.floor(idx / size);
    const col = idx % size;
    const emptyRow = Math.floor(emptyIdx / size);
    const emptyCol = emptyIdx % size;
    const isAdjacent =
      (row === emptyRow && Math.abs(col - emptyCol) === 1) ||
      (col === emptyCol && Math.abs(row - emptyRow) === 1);

    if (isAdjacent) {
      if (moveCount === 0 && timer === 0) setTimerActive(true);
      setHistory((prev) => [...prev, { tiles: [...tiles], emptyIdx, moveCount }]);
      const newTiles = tiles.slice();
      [newTiles[emptyIdx], newTiles[idx]] = [newTiles[idx], newTiles[emptyIdx]];
      setTiles(newTiles);
      setEmptyIdx(idx);
      setMoveCount((m) => m + 1);

      if (isSolved(newTiles)) {
        setTimerActive(false);
        setGameWon(true);
        saveBestIfNeeded(moveCount + 1, timer + 0, size);
      }
    }
  }

  function handleUndo() {
    if (!history.length || moveCount === 0) return;
    const last = history[history.length - 1];
    setTiles(last.tiles);
    setEmptyIdx(last.emptyIdx);
    setMoveCount(last.moveCount);
    setHistory((h) => h.slice(0, h.length - 1));
    setGameWon(false);
    setTimerActive(last.moveCount > 0);
  }

  function handleRestart() {
    initializeBoard(size);
  }

  function handleSizeChange(e) {
    const val = parseInt(e.target.value, 10);
    if (!SIZES.includes(val)) return;
    setSize(val);
  }

  useEffect(() => {
    function handler(e) {
      if (e.key === "u" || e.key === "U" || e.key === "z" || e.key === "Z") {
        handleUndo();
      }
      if (e.key === "r" || e.key === "R") {
        handleRestart();
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line
  }, [history, moveCount, size, tiles, emptyIdx]);

  // PUBLIC_INTERFACE: isSolved = all tiles ascending, blank last
  function isSolved(arr) {
    for (let i = 0; i < arr.length - 1; ++i) {
      if (arr[i] !== i + 1) return false;
    }
    if (arr[arr.length - 1] !== 0) return false;
    return true;
  }
  // PUBLIC_INTERFACE: isSolvable = classic N-puzzle parity check
  function isSolvable(arr, n) {
    let inv = 0;
    for (let i = 0; i < arr.length; ++i) {
      for (let j = i + 1; j < arr.length; ++j) {
        if (arr[i] && arr[j] && arr[i] > arr[j]) inv++;
      }
    }
    if (n % 2 === 1) return inv % 2 === 0;
    const emptyRowFromBottom = n - Math.floor(arr.indexOf(0) / n);
    if (emptyRowFromBottom % 2 === 0) return inv % 2 === 1;
    return inv % 2 === 0;
  }

  // Save best moves/time to localStorage if new best for this grid size
  function saveBestIfNeeded(moves, time, sz) {
    try {
      if (typeof window !== "undefined") {
        const key = `mmarcade-slidingtile-best-${sz}`;
        let prev = window.localStorage.getItem(key);
        let best = prev ? JSON.parse(prev) : null;
        const shouldSave =
          !best ||
          moves < best.moves ||
          (moves === best.moves && time < best.time);
        if (shouldSave) {
          window.localStorage.setItem(key, JSON.stringify({ moves, time }));
          setFastestSolve({ moves, time });
        }
      }
    } catch {}
  }

  return (
    <div className="stp-root">
      <main className="stp-main-card">
        <div className="stp-title-row">
          <h2 className="stp-title">
            <span role="img" aria-label="Grid">🔲</span> Sliding Tile Puzzle
          </h2>
        </div>
        <div className="stp-bar">
          <label className="stp-picker-label" htmlFor="stp-size-selector">
            Grid:
            <select
              value={size}
              id="stp-size-selector"
              onChange={handleSizeChange}
              className="stp-size-selector"
              disabled={moveCount > 0 && !gameWon}
              aria-label="Grid size selector"
            >
              <option value={4}>4x4</option>
              <option value={5}>5x5</option>
              <option value={6}>6x6</option>
            </select>
          </label>
          <span className="stp-timer-pill">
            Time <span className="pill-value">{formatTime(timer)}</span>
          </span>
          <span className="stp-moves-pill">
            Moves <span className="pill-value">{moveCount}</span>
          </span>
          <button className="stp-btn" onClick={handleUndo} disabled={moveCount === 0 || !history.length}>
            <span aria-hidden="true">↩</span> Undo
          </button>
          <button className="stp-btn" onClick={handleRestart}>
            <span aria-hidden="true">↻</span> Restart
          </button>
        </div>
        <div
          className="stp-puzzle-grid"
          data-size={size}
          style={{
            width: "min(400px, 90vw)",
            aspectRatio: "1/1",
            gridTemplateColumns: `repeat(${size}, 1fr)`,
            gridTemplateRows: `repeat(${size}, 1fr)`
          }}
          aria-label="Sliding tile puzzle grid"
        >
          {tiles.map((val, idx) =>
            val === 0 ? (
              <div
                key={idx}
                className="stp-tile stp-blank"
                tabIndex={-1}
                aria-label="empty space"
              />
            ) : (
              <button
                key={idx}
                className="stp-tile"
                tabIndex={0}
                aria-label={`Tile ${val}`}
                onClick={() => handleTileClick(idx)}
                disabled={gameWon}
              >
                {val}
              </button>
            )
          )}
        </div>
        <div className="stp-tip">
          {gameWon ? (
            <>
              <span role="img" aria-label="Confetti">🎉</span> Solved {size}x{size} in {moveCount} moves and {formatTime(timer)}!
              <br />
              {fastestSolve && (
                <span className="best-row">Your Best: {fastestSolve.moves} moves, {formatTime(fastestSolve.time)}</span>
              )}
              <span className="try-harder-tip">Try a harder grid size!</span>
            </>
          ) : (
            <>
              Arrange tiles 1–{size * size - 1}, blank last. Click tiles to slide.<br />
              Controls: <b>Undo</b> ({history.length > 0 ? "Available" : "N/A"}), <b>Restart</b>, <b>Grid Size</b>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

export default SlidingTilePuzzlePage;
