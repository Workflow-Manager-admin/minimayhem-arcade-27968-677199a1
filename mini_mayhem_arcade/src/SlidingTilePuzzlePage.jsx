import React, { useEffect, useRef, useState } from "react";
import "./SlidingTilePuzzlePage.css";

/**
 * PUBLIC_INTERFACE
 * SlidingTilePuzzlePage
 * Now supports grid size selection (4x4/5x5/6x6), move count, timer, undo, shuffle, and proper win detection.
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

  // On grid size change
  useEffect(() => {
    initializeBoard(size);
    // eslint-disable-next-line
  }, [size]);

  // Timer logic
  useEffect(() => {
    if (timerActive) {
      timerRef.current = setInterval(() => setTimer((t) => t + 1), 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    return () => clearInterval(timerRef.current);
  }, [timerActive]);

  // Load best time/moves
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        // Best time and moves per-grid size (mmarcade-slidingtile-best-<size>)
        const best = window.localStorage.getItem(`mmarcade-slidingtile-best-${size}`);
        if (best) {
          setFastestSolve(JSON.parse(best));
        } else {
          setFastestSolve(null);
        }
      } catch {}
    }
  }, [size, gameWon]);

  // Format time as mm:ss
  function formatTime(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  }

  // Board init/reset: shuffle to random solvable/unsolved board
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
    // Re-load solve best for this size
    if (typeof window !== "undefined") {
      try {
        const best = window.localStorage.getItem(`mmarcade-slidingtile-best-${sz}`);
        setFastestSolve(best ? JSON.parse(best) : null);
      } catch {}
    }
  }

  // Move logic with undo history
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
      // Start timer on first move
      if (moveCount === 0 && timer === 0) setTimerActive(true);
      // Store history for undo (prev tiles, emptyIdx)
      setHistory((prev) => [...prev, { tiles: [...tiles], emptyIdx, moveCount }]);
      const newTiles = tiles.slice();
      [newTiles[emptyIdx], newTiles[idx]] = [newTiles[idx], newTiles[emptyIdx]];
      setTiles(newTiles);
      setEmptyIdx(idx);
      setMoveCount((m) => m + 1);

      // Win check after move
      if (isSolved(newTiles)) {
        setTimerActive(false);
        setGameWon(true);
        saveBestIfNeeded(moveCount + 1, timer + 0, size);
      }
    }
  }

  // Undo: revert to last prev state
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

  // Restart button
  function handleRestart() {
    initializeBoard(size);
  }

  // Grid size selector handler
  function handleSizeChange(e) {
    const val = parseInt(e.target.value, 10);
    if (!SIZES.includes(val)) return;
    setSize(val);
  }

  // Keyboard: undo ("u" or "z"), restart ("r"), navigation
  useEffect(() => {
    function handler(e) {
      if (e.key === "u" || e.key === "U" || e.key === "z" || e.key === "Z") {
        handleUndo();
      }
      if (e.key === "r" || e.key === "R") {
        handleRestart();
      }
      if (e.key === "ArrowLeft" || e.key === "ArrowRight" || e.key === "ArrowUp" || e.key === "ArrowDown" || e.key === "h" || e.key === "j" || e.key === "k" || e.key === "l") {
        // Allow future keyboard controls for tile sliding if desired
        // (not implemented in base version - only pointer/click)
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line
  }, [history, moveCount, size, tiles, emptyIdx]);

  // PUBLIC_INTERFACE: isSolved (goal state for arbitrary size, all ascending w/only one 0 last)
  function isSolved(arr) {
    for (let i = 0; i < arr.length - 1; ++i) {
      if (arr[i] !== i + 1) return false;
    }
    // Last tile must be empty
    if (arr[arr.length - 1] !== 0) return false;
    return true;
  }

  // PUBLIC_INTERFACE: isSolvable for arbitrary board size (classic N-puzzle rules)
  function isSolvable(arr, n) {
    let inv = 0;
    for (let i = 0; i < arr.length; ++i) {
      for (let j = i + 1; j < arr.length; ++j) {
        if (arr[i] && arr[j] && arr[i] > arr[j]) inv++;
      }
    }
    // If n is odd, inversions even → solvable
    if (n % 2 === 1) return inv % 2 === 0;
    // even n: blank on even row from bottom, inversions odd
    const emptyRowFromBottom = n - Math.floor(arr.indexOf(0) / n);
    if (emptyRowFromBottom % 2 === 0) return inv % 2 === 1;
    return inv % 2 === 0;
  }

  // Best result: localStorage per grid size (as object)
  function saveBestIfNeeded(moves, time, sz) {
    try {
      if (typeof window !== "undefined") {
        const key = `mmarcade-slidingtile-best-${sz}`;
        let prev = window.localStorage.getItem(key);
        let best = prev ? JSON.parse(prev) : null;
        // Moves prioritized first
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

  // UI rendering for grid, controls, stats
  return (
    <div className="slidetile-root">
      <main className="slidetile-main">
        <header className="slidetile-header">
          <h2 className="slidetile-title">
            <span className="slidetile-emoji">🔲</span> Sliding Tile Puzzle
          </h2>
          <div className="slidetile-controls-row">
            <label className="slidetile-size-label" htmlFor="slidetile-size">
              Grid:
              <select
                value={size}
                id="slidetile-size"
                onChange={handleSizeChange}
                className="slidetile-size-selector"
                disabled={moveCount > 0 && !gameWon}
                aria-label="Grid size selector"
              >
                <option value={4}>4x4</option>
                <option value={5}>5x5</option>
                <option value={6}>6x6</option>
              </select>
            </label>
            <div className="slidetile-timer-pill">
              <span className="pill-caption">Time</span>
              <span className="pill-value">{formatTime(timer)}</span>
            </div>
            <div className="slidetile-movectr">
              <span className="moves-label">Moves</span>
              <span className="moves-value">{moveCount}</span>
            </div>
            <button className="btn undo-btn" onClick={handleUndo} disabled={moveCount === 0 || !history.length}>
              <span aria-hidden="true">↩</span> Undo
            </button>
            <button className="btn restart-btn" onClick={handleRestart}>
              <span aria-hidden="true">↻</span> Restart
            </button>
          </div>
        </header>
        {/* Tile Grid */}
        {/* Responsive, square, fixed container (max 400px, max 90vw) */}
        <div
          className="slidetile-board"
          style={{
            width: "min(400px, 90vw)",
            height: "min(400px, 90vw)",
            gridTemplateColumns: `repeat(${size}, 1fr)`,
            gridTemplateRows: `repeat(${size}, 1fr)`,
            gap: "9px",
            margin: "0 auto"
          }}
          aria-label="Sliding tile puzzle grid"
        >
          {tiles.map((v, idx) =>
            v === 0 ? (
              <div
                key={idx}
                className="tile empty"
                tabIndex={-1}
                aria-label="empty space"
                style={{
                  // Ensures min/max size: 100%
                  width: "100%",
                  height: "100%",
                  aspectRatio: "1 / 1"
                }}
              ></div>
            ) : (
              <button
                key={idx}
                className="tile"
                onClick={() => handleTileClick(idx)}
                tabIndex={0}
                aria-label={`Tile ${v}`}
                disabled={gameWon}
                style={{
                  // Calculate the tile size as a fraction of the container
                  width: "100%",
                  height: "100%",
                  aspectRatio: "1 / 1"
                }}
              >
                {v}
              </button>
            )
          )}
        </div>
        {/* Instructions / Win Msg */}
        <div className={`slidetile-tip${gameWon ? " win" : ""}`}>
          {gameWon ? (
            <>
              <span role="img" aria-label="Confetti">🎉</span> Solved {size}x{size} in {moveCount} moves and {formatTime(timer)}!
              <br />
              {fastestSolve
                ? <span className="best-row">Your Best: {fastestSolve.moves} moves, {formatTime(fastestSolve.time)}</span>
                : null
              }
              <span className="try-harder-tip">Try a harder grid size!</span>
            </>
          ) : (
            <>
              Arrange tiles 1 to {size * size - 1} (blank last). Click tiles to slide.<br />
              Controls: <b>Undo</b> ({history.length > 0 ? "Available" : "N/A"}), <b>Restart</b>, <b>Grid Size</b>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

export default SlidingTilePuzzlePage;
