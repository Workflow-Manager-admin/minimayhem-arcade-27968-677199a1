import React, { useCallback, useEffect, useState } from "react";
import "./IceSlidePuzzlePage.css";
import { useNavigate } from "react-router-dom";

// Grid Legend: 0 = empty, 1 = wall, 2 = goal, 3 = player
// Emojis (matching style spec): player = 🧊, wall = 🟫, goal = 🎯, ice = " "/blank, visited optional shade

const WALL = 1, GOAL = 2, PLAYER = 3, EMPTY = 0;
const PLAYER_EMOJI = "🧊";
const WALL_EMOJI = "🟫";
const GOAL_EMOJI = "🎯";
const VISITED_EMOJI = "░"; // faint, optional (can use color too)
const EMPTY_EMOJI = "  ";

// Can adjust size and config
const DEFAULT_LEVEL = {
  grid: [
    [1,1,1,1,1,1,1],
    [1,0,0,0,0,2,1],
    [1,0,1,1,0,1,1],
    [1,0,1,0,0,0,1],
    [1,0,0,3,1,0,1],
    [1,1,1,1,1,1,1]
  ],
  start: { row:4, col:3 }
};

const LS_BEST_KEY = "iceSlideScore"; // Key for best in localStorage

// Returns deep clone of 2D grid
function cloneGrid(grid) {
  return grid.map(row => row.slice());
}

// PUBLIC_INTERFACE
/**
 * IceSlidePuzzlePage: Classic ice sliding puzzle game.
 * - Slide 🧊 until you hit 🟫 wall, try to reach 🎯 in fewest moves.
 * - Saves high score (fewest steps).
 * - Arrow keys/touch: slide, R: restart, Back/Win: return to games.
 */
function IceSlidePuzzlePage() {
  // State: grid, player position, step count, win state, bestScore from LS
  const [grid, setGrid] = useState(cloneGrid(DEFAULT_LEVEL.grid));
  const [player, setPlayer] = useState({...DEFAULT_LEVEL.start}); // {row, col}
  const [steps, setSteps] = useState(0);
  const [win, setWin] = useState(false);
  const [best, setBest] = useState(null);

  const navigate = useNavigate();

  // Load best score only on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const b = window.localStorage.getItem(LS_BEST_KEY);
      if (b !== null && !isNaN(Number(b))) setBest(Number(b));
    }
  }, []);

  // Level reset
  const resetLevel = useCallback(() => {
    setGrid(cloneGrid(DEFAULT_LEVEL.grid));
    setPlayer({...DEFAULT_LEVEL.start});
    setSteps(0);
    setWin(false);
  }, []);

  // Find cell in grid that's the goal
  const goalPos = (() => {
    for(let r=0;r<grid.length;r++) for(let c=0;c<grid[0].length;c++)
      if(grid[r][c]===GOAL) return {row:r, col:c};
    return null;
  })();

  // Slide in a direction until hit wall or edge, return new pos
  function slide(dir) {
    if (win) return;
    let { row, col } = player;
    let drow = 0, dcol = 0;
    if (dir==="up") drow = -1;
    else if (dir==="down") drow = 1;
    else if (dir==="left") dcol = -1;
    else if (dir==="right") dcol = 1;
    else return;

    let nrow = row, ncol = col;
    let last = { row, col };
    while(true) {
      const nextR = nrow + drow, nextC = ncol + dcol;
      if (
        nextR < 0
        || nextC < 0
        || nextR >= grid.length
        || nextC >= grid[0].length
        || grid[nextR][nextC] === WALL
      ) break;
      nrow = nextR; ncol = nextC;
      last = { row: nrow, col: ncol };
      if(grid[nrow][ncol] === GOAL) break; // allow stopping directly at goal
    }
    // Only move if changed
    if(nrow !== row || ncol !== col){
      setSteps(s => s+1);
      setPlayer({ row: nrow, col: ncol });
      // Check goal
      if (grid[nrow][ncol] === GOAL) {
        setWin(true);
        // Update LS if better or first win
        if (typeof window !== "undefined") {
          let b = window.localStorage.getItem(LS_BEST_KEY);
          if (!b || Number(steps+1) < Number(b)) {
            window.localStorage.setItem(LS_BEST_KEY, steps+1);
            setBest(steps+1);
          }
        }
      }
    }
  }

  // Keyboard controls
  useEffect(() => {
    function handleKey(e) {
      if(win && (e.key === "Enter" || e.key === " " || e.key === "Escape")){
        navigate("/games");
        return;
      }
      if(e.key === "ArrowUp") {slide("up");e.preventDefault();}
      else if(e.key === "ArrowDown") {slide("down");e.preventDefault();}
      else if(e.key === "ArrowLeft") {slide("left");e.preventDefault();}
      else if(e.key === "ArrowRight") {slide("right");e.preventDefault();}
      else if(e.key === "r" || e.key === "R") { resetLevel(); }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [slide, win, navigate, resetLevel]);

  // For tap/click and swipe on mobile
  function handleCellClick(r, c) {
    // If tap on different row/col trigger slide in that axis, like a puzzle game
    if(win) return;
    if(r === player.row){
      if(c < player.col) slide("left");
      else if(c > player.col) slide("right");
    } else if(c === player.col) {
      if(r < player.row) slide("up");
      else if(r > player.row) slide("down");
    }
  }
  // For mobile: simple swipe support
  const touchRef = React.useRef();
  function handleTouchStart(e){
    if(!e.touches[0]) return;
    touchRef.current = {x: e.touches[0].clientX, y: e.touches[0].clientY};
  }
  function handleTouchEnd(e){
    if(win) return;
    if(!touchRef.current || !e.changedTouches[0]) return;
    const dx = e.changedTouches[0].clientX - touchRef.current.x;
    const dy = e.changedTouches[0].clientY - touchRef.current.y;
    if(Math.abs(dx) > Math.abs(dy)){
      if(dx > 18) slide("right");
      else if(dx < -18) slide("left");
    } else {
      if(dy > 18) slide("down");
      else if(dy < -18) slide("up");
    }
  }

  // --- Render
  return (
    <div className="ice-slide-root">
      <div className="ice-slide-bg-blur"></div>
      <main className="ice-slide-main"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        >
        <header className="ice-slide-header">
          <h2 className="ice-slide-title">
            <span className="ice-slide-emoji" aria-hidden="true">{PLAYER_EMOJI}</span>
            Ice Slide Puzzle
          </h2>
          <div className="ice-slide-pillrow">
            <Pill label="Steps" value={steps} accent />
            <Pill label="Best" value={best !== null ? best : "—"} />
            <button className="ice-slide-btn restart" onClick={resetLevel} tabIndex={0}><span aria-hidden="true">↻</span> Restart</button>
          </div>
        </header>

        <div className="ice-slide-board"
            style={{
              gridTemplateColumns: `repeat(${grid[0].length}, 1fr)`,
              gridTemplateRows: `repeat(${grid.length}, 1fr)`,
            }}
            aria-label="Ice Slide grid"
          >
          {grid.map((row, r) =>
            row.map((cell, c) => {
              let content = "";
              let extraCls = "";
              if(r === player.row && c === player.col){
                content = PLAYER_EMOJI;
                extraCls = "ice-player";
              } else if(cell === WALL) content = WALL_EMOJI;
              else if(cell === GOAL) content = GOAL_EMOJI;
              else content = EMPTY_EMOJI;

              return (
                <button
                  key={r + "-" + c}
                  className={`ice-slide-cell ${extraCls}`}
                  tabIndex={0}
                  aria-label={
                    (r === player.row && c === player.col) ? "Player" :
                    cell === WALL ? "Wall" : cell === GOAL ? "Goal" : "Empty"
                  }
                  onClick={() => handleCellClick(r, c)}
                  disabled={win}
                >
                  {content}
                </button>
              );
            })
          )}
        </div>
        {/* Instructions/Win UI */}
        {!win ? (
          <div className="ice-slide-tip">
            <b>Goal:</b> Slide 🧊 to the target 🎯 in as few moves as possible.<br />
            Use arrow keys, swipe, or tap a row/col to move!<br />
            <span className="ice-slide-shortcuts">Shortcuts: <kbd>←↑↓→</kbd> to slide, <kbd>R</kbd> restart.</span>
          </div>
        ) : (
          <div className="ice-slide-modal">
            <div className="ice-slide-win-emoji" aria-hidden="true">🎯</div>
            <div className="ice-slide-win-title">
              Puzzle Solved!
            </div>
            <div className="ice-slide-modal-row">
              <span className="ice-slide-modal-label">Steps:</span>
              <span className="ice-slide-modal-value">{steps}</span>
            </div>
            <div className="ice-slide-modal-row">
              <span className="ice-slide-modal-label">Best:</span>
              <span className="ice-slide-modal-value">{best}</span>
            </div>
            <button className="ice-slide-btn modal-playagain" onClick={resetLevel} autoFocus tabIndex={0}>Replay</button>
            <button
              className="ice-slide-btn modal-backgames"
              onClick={() => navigate("/games")}
              tabIndex={0}
            >← Back to Games</button>
            <div className="ice-slide-tip bottom">Tip: Try to solve with even fewer moves!</div>
          </div>
        )}
      </main>
    </div>
  );
}

// Styled pill
function Pill({ label, value, accent }) {
  return (
    <span className={`ice-slide-pill${accent ? " accent" : ""}`}>
      <span className="ice-slide-pill-label">{label}</span>
      <span className="ice-slide-pill-value">{value}</span>
    </span>
  );
}

export default IceSlidePuzzlePage;
