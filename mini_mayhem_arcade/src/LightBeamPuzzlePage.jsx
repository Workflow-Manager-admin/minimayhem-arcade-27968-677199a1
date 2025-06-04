import React, { useState, useCallback, useEffect, useRef } from "react";
import "./LightBeamPuzzlePage.css";

// ==== Light Beam Puzzle Definitions ==== //

/**
 * BOARD CELLS:
 * - 'E' = Emitter (light source, emits in specified dir)
 * - 'R' = Receiver (goal, must receive light in correct dir)
 * - "/" = Mirror diagonal /
 * - "\\" = Mirror diagonal \
 * - " " = Empty cell
 */

// Default board: can expand to support multiple levels
const LEVELS = [
  {
    // Example: 7x7 with one mirror solution
    size: 7,
    // Emitter emits right from (3,0). Receiver at (3,6) expects light from left.
    emitter: { row: 3, col: 0, dir: "right" },
    receiver: { row: 3, col: 6, dir: "left" },
    mirrors: [
      // Initial mirror positions with their orientation ("slash" or "backslash")
      // Can be fixed or movable depending on level
      { row: 1, col: 3, type: "/" },
      { row: 5, col: 5, type: "\\" }
    ],
    // Movable mirrors player can place/rotate
    movableMirrors: [
      { row: 2, col: 4, type: null }, // null = empty, player can place a mirror here
      { row: 4, col: 2, type: null }
    ],
    beamGlow: "#00ffff",
    hint: "You must rotate mirrors or place them to guide the laser to the receiver!"
  },
  // More levels can be added here
];

// Direction vectors
const DIRS = {
  up:    { dr: -1, dc: 0 },
  down:  { dr: 1, dc: 0 },
  left:  { dr: 0, dc: -1 },
  right: { dr: 0, dc: 1 }
};
const DIR_KEYS = ["up", "down", "left", "right"];
const OPPOSITE = { up: "down", down: "up", left: "right", right: "left" };

// Returns new direction after mirror reflection
function reflect(dir, mirror) {
  // mirror: "/" or "\\"
  if (mirror === "/") {
    switch (dir) {
      case "up":    return "right";
      case "right": return "up";
      case "down":  return "left";
      case "left":  return "down";
      default:      return dir;
    }
  } else if (mirror === "\\") {
    switch (dir) {
      case "up":    return "left";
      case "left":  return "up";
      case "down":  return "right";
      case "right": return "down";
      default:      return dir;
    }
  }
  return dir;
}

// --- Util: build initial board from level info --- //
function buildInitialBoard(level) {
  const board = Array.from({ length: level.size }, (_, r) =>
    Array.from({ length: level.size }, (_, c) => ({
      type: " ",   // " ", "/", "\\", "E", "R"
      rotatable: false,
      fixed: false
    }))
  );

  // Place emitter
  const { row: er, col: ec } = level.emitter;
  board[er][ec] = { type: "E", rotatable: false, fixed: true };
  // Place receiver
  const { row: rr, col: rc } = level.receiver;
  board[rr][rc] = { type: "R", rotatable: false, fixed: true };

  // Place mirrors (fixed)
  for (const m of level.mirrors || []) {
    if (m.row >= 0 && m.col >= 0 && m.row < level.size && m.col < level.size) {
      board[m.row][m.col] = {
        type: m.type,
        rotatable: false,
        fixed: true
      };
    }
  }
  // Allow player-controlled movable mirrors
  for (const mm of level.movableMirrors || []) {
    board[mm.row][mm.col] = {
      type: mm.type || " ",  // null -> empty to start
      rotatable: true,
      fixed: false
    };
  }
  return board;
}

// --- Util: Compute laser path given board, emitter, and mirror state --- //
function traceLaserPath(board, emitter, maxLength = 100) {
  // Returns array of points for glowing SVG path [ [row,col], ... ]
  let { row, col, dir } = emitter;
  let path = [[row, col]];
  let currDir = dir;
  let foundReceiver = false;
  let hitReceiverCoord = null;
  let hitCount = 0;
  for (let n = 0; n < maxLength; ++n) {
    // Move in current dir
    row += DIRS[currDir].dr;
    col += DIRS[currDir].dc;
    if (
      row < 0 || col < 0 ||
      row >= board.length || col >= board.length
    ) break;
    path.push([row, col]);
    const cell = board[row][col];
    if (cell.type === "/" || cell.type === "\\") {
      currDir = reflect(currDir, cell.type);
    } else if (cell.type === "R") {
      // Check: did the laser enter receiver from correct direction?
      // Check if direction matches receiver.dir from level
      foundReceiver = true;
      hitReceiverCoord = [row, col];
      break;
    } else if (cell.type === "E") {
      // prevent looping at emitter
      break;
    }
    // Prevent infinite loop if a bug
    hitCount++;
    if (hitCount > maxLength) break;
  }
  return { path, foundReceiver, hitReceiverCoord, lastDir: currDir };
}

// --- Util: Best score persistence --- //
const BEST_SCORE_KEY = "mmarcade-lightbeam-bestscore";

// PUBLIC_INTERFACE
function LightBeamPuzzlePage() {
  const [level, setLevel] = useState(0);
  const [board, setBoard] = useState(() => buildInitialBoard(LEVELS[0]));
  // Copy of player-movable mirrors (for undo/redo in future)
  const [moves, setMoves] = useState(0);
  const [hintOpen, setHintOpen] = useState(false);
  const [animateId, setAnimateId] = useState(0); // Change for animation trigger
  const [showSolved, setShowSolved] = useState(false);
  const [bestMoves, setBestMoves] = useState(() =>
    getBestScore(BEST_SCORE_KEY, level)
  );

  // Animate: recalculate path after every move
  const levelData = LEVELS[level];
  const trace = traceLaserPath(
    board,
    levelData.emitter
  );

  // Win detection: Is the receiver hit in correct direction?
  const receiverMatched =
    trace.foundReceiver &&
    trace.hitReceiverCoord &&
    (() => {
      const { receiver } = levelData;
      return (
        trace.hitReceiverCoord[0] === receiver.row &&
        trace.hitReceiverCoord[1] === receiver.col &&
        OPPOSITE[levelData.receiver.dir] === trace.lastDir // Must enter from required direction
      );
    })();

  // On win, set best score if record
  useEffect(() => {
    if (receiverMatched) {
      setShowSolved(true);
      if (typeof window !== "undefined") {
        let prev = getBestScore(BEST_SCORE_KEY, level);
        if (prev == null || moves < prev) {
          window.localStorage.setItem(
            `${BEST_SCORE_KEY}-${level}`,
            JSON.stringify(moves)
          );
          setBestMoves(moves);
        }
      }
    }
    // eslint-disable-next-line
  }, [receiverMatched, moves, level]);

  // On load, restore bestMoves (in case level changed)
  useEffect(() => {
    setBestMoves(getBestScore(BEST_SCORE_KEY, level));
  }, [level]);

  // --- User Actions: Mirror rotation and placement --- //
  function handleCellClick(row, col) {
    if (showSolved) return;
    const cell = board[row][col];
    // Only movable, rotatable mirrors or empty movable spots allowed
    if (!cell.rotatable || cell.fixed) return;
    const updated = board.map((r) => r.map((c) => ({ ...c })));
    if (cell.type === " ") {
      // Place a "/" mirror
      updated[row][col].type = "/";
      setBoard(updated);
      setMoves(m => m + 1);
      setAnimateId(a => a + 1);
      return;
    }
    // If on a mirror, rotate: "/" <-> "\"
    if (cell.type === "/" || cell.type === "\\") {
      updated[row][col].type = cell.type === "/" ? "\\" : "/";
      setBoard(updated);
      setMoves(m => m + 1);
      setAnimateId(a => a + 1);
    }
  }

  // Restart button: reset mirrors/moves
  function handleRestart() {
    setBoard(buildInitialBoard(levelData));
    setMoves(0);
    setShowSolved(false);
    setHintOpen(false);
    setAnimateId(a => a + 1);
  }

  // Next level (future enhancement, single level for now)
  function handleNextLevel() {
    setLevel(l => (l + 1) % LEVELS.length);
    setBoard(buildInitialBoard(LEVELS[(level + 1) % LEVELS.length]));
    setMoves(0);
    setShowSolved(false);
    setHintOpen(false);
    setAnimateId(a => a + 1);
  }

  // Get best moves (localStorage)
  function getScoreDisplay(val) {
    if (val == null || isNaN(val)) return "-";
    return val;
  }

  // For accessibility: R = restart, H = hint
  useEffect(() => {
    function handler(e) {
      if (e.key === "r" || e.key === "R") handleRestart();
      if (e.key === "h" || e.key === "H") setHintOpen(h => !h);
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line
  }, []);

  // --- Render: --- //
  return (
    <div className="lbp-root">
      <section className="lbp-main-area">
        <header className="lbp-header">
          <h2 className="lbp-title">
            <span role="img" aria-label="Laser">🔦</span> Light Beam Puzzle
          </h2>
          <div className="lbp-panel-row">
            <div className="lbp-panel">
              <b>Level:</b> {level + 1}
            </div>
            <div className="lbp-panel">
              <b>Moves:</b> {moves}
            </div>
            <div className="lbp-panel">
              <b>Best:</b> {getScoreDisplay(bestMoves)}
            </div>
            <button className="lbp-btn lbp-hint-btn" onClick={() => setHintOpen(h => !h)}>
              💡 Hint
            </button>
            <button className="lbp-btn lbp-restart-btn" onClick={handleRestart}>
              ↻ Restart
            </button>
          </div>
        </header>
        {/* Board zone */}
        <div className="lbp-boardzone-outer">
          <div
            className="lbp-boardzone"
            style={{
              gridTemplateColumns: `repeat(${levelData.size}, 1fr)`,
              gridTemplateRows: `repeat(${levelData.size}, 1fr)`
            }}
            role="grid"
            aria-label="Laser puzzle grid"
            tabIndex={0}
          >
            {/* Grid */}
            {board.map((row, r) =>
              row.map((cell, c) => {
                let cellClass = "lbp-cell";
                if (cell.type === "/") cellClass += " lbp-mirror";
                if (cell.type === "\\") cellClass += " lbp-mirror";
                if (cell.type === "E") cellClass += " lbp-emitter";
                if (cell.type === "R") cellClass += " lbp-receiver";
                if (cell.rotatable) cellClass += " lbp-cell-movable";
                if (cell.type === " " && cell.rotatable) cellClass += " lbp-movable-empty";
                // highlight laser path
                let beamActive = trace.path.some(([pr, pc]) => pr === r && pc === c);
                if (beamActive) cellClass += " lbp-cell-onbeam";
                // Solved: mark receiver
                if (
                  cell.type === "R" &&
                  showSolved &&
                  trace.hitReceiverCoord &&
                  r === trace.hitReceiverCoord[0] &&
                  c === trace.hitReceiverCoord[1]
                )
                  cellClass += " lbp-cell-received";
                return (
                  <div
                    className={cellClass}
                    key={`${r}-${c}`}
                    tabIndex={cell.rotatable ? 0 : -1}
                    aria-label={
                      cell.type === "E"
                        ? "Emitter"
                        : cell.type === "R"
                        ? "Receiver"
                        : cell.type === "/"
                        ? "Mirror /"
                        : cell.type === "\\"
                        ? "Mirror \\"
                        : cell.rotatable
                        ? "Place or rotate mirror"
                        : "Empty"
                    }
                    onClick={() => handleCellClick(r, c)}
                    onKeyDown={e => {
                      if (
                        (e.key === "Enter" || e.key === " ") &&
                        cell.rotatable
                      ) {
                        handleCellClick(r, c);
                      }
                    }}
                  >
                    {cell.type === "/"
                      ? <span className="lbp-mirror-icon">/</span>
                      : cell.type === "\\"
                      ? <span className="lbp-mirror-icon">{"\\"}</span>
                      : cell.type === "E"
                      ? (
                          <span className="lbp-emit-icon" style={{
                            color: levelData.beamGlow
                          }}>●</span>
                        )
                      : cell.type === "R"
                      ? (
                          <span className="lbp-recv-icon" style={{
                            color: showSolved
                              ? "#e0ff4f"
                              : "var(--lbp-receiver-normal)"
                          }}>◆</span>
                        )
                      : cell.type === " " && cell.rotatable
                      ? <span className="lbp-mirror-hintspot"></span>
                      : ""}
                  </div>
                );
              })
            )}
            {/* SVG: Animated laser beam line */}
            <LaserBeamOverlay
              path={trace.path}
              gridSize={levelData.size}
              active={true}
              solved={receiverMatched}
              beamGlow={levelData.beamGlow}
              animateKey={animateId}
            />
          </div>
        </div>
        {/* Info/Hint/Overlay */}
        {hintOpen && (
          <div className="lbp-hint-popup" onClick={() => setHintOpen(false)}>
            <div className="lbp-hint-inner" tabIndex={0}>
              <div className="lbp-hint-title">Hint</div>
              <div className="lbp-hint-content">{levelData.hint || "Try rotating or placing mirrors to guide the laser to the receiver."}</div>
              <button className="lbp-btn lbp-hint-close" onClick={() => setHintOpen(false)}>Got it</button>
            </div>
          </div>
        )}
        {/* Solved Modal */}
        {showSolved && (
          <div className="lbp-modal-overlay">
            <div className="lbp-modal">
              <div className="lbp-modal-title">🎉 Puzzle Solved!</div>
              <div className="lbp-modal-stats">
                <b>Moves:</b> {moves} {bestMoves && moves <= bestMoves ? " (New best!)" : ""}
              </div>
              <button className="lbp-btn lbp-modal-restart" onClick={handleRestart}>Play Again</button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

// PUBLIC_INTERFACE
// Laser overlay component draws animated glowing path
function LaserBeamOverlay({ path, gridSize, active, solved, beamGlow = "#00ffff", animateKey }) {
  const svgRef = useRef(null);
  // Animate laser: animate a gradient or dash path
  // Calculate cell size and path coordinates
  const cellPct = 100 / gridSize;
  const padPct = cellPct * 0.13;

  if (!path || path.length < 2) return null;
  // Calculate points for SVG polyline (center of each cell)
  const points = path.map(([r, c]) => {
    const x = c * cellPct + cellPct / 2;
    const y = r * cellPct + cellPct / 2;
    return `${x},${y}`;
  });

  // Glowing effect: SVG filter + repeating dash animation
  return (
    <svg
      className={"lbp-laser-svg"}
      ref={svgRef}
      key={animateKey}
      viewBox={`0 0 100 100`}
      preserveAspectRatio="none"
      style={{
        position: "absolute",
        left: 0, top: 0,
        width: "100%", height: "100%",
        pointerEvents: "none"
      }}
      aria-hidden="true"
    >
      <defs>
        {/* Outer blue/cyan glow filter */}
        <filter id="lbp-beam-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2.2" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <linearGradient id="lbp-beam-grad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={beamGlow} stopOpacity="0.65" />
          <stop offset="45%" stopColor={beamGlow} stopOpacity="0.99" />
          <stop offset="99%" stopColor={"#fffbe7"} stopOpacity="0.84" />
        </linearGradient>
      </defs>
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke="url(#lbp-beam-grad)"
        strokeWidth="2.8"
        strokeLinecap="round"
        filter="url(#lbp-beam-glow)"
        style={{
          strokeDasharray: 300,
          strokeDashoffset: 0,
          animation: active
            ? "lbp-beam-anim 0.7s cubic-bezier(.67,.32,1,1.13) 0s 1"
            : "none"
        }}
      />
      {/* Inner white streak */}
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke="#ffffff"
        strokeWidth="1.0"
        strokeLinecap="round"
        opacity="0.58"
        filter="url(#lbp-beam-glow)"
      />
    </svg>
  );
}

// Best moves for level from localStorage
function getBestScore(key, level) {
  if (typeof window === "undefined") return null;
  let v = window.localStorage.getItem(`${key}-${level}`);
  if (!v) return null;
  try {
    const d = JSON.parse(v);
    return !isNaN(d) ? d : null;
  } catch {
    return null;
  }
}

export default LightBeamPuzzlePage;
