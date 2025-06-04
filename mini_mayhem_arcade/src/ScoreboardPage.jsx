import React, { useEffect, useState, useRef } from "react";
import "./ScoreboardPage.css";

/*
 * PUBLIC_INTERFACE
 * ScoreboardPage: Displays a visually rich arcade scoreboard per provided palette and grid requirements.
 * - Arcade heading
 * - 3xN responsive grid using .scoreboard-card-grid
 * - Cards: .scoreboard-card (emoji, title, best, last 5 scores optionally w/date)
 * - Reset All Scores button (accent colors, confirmation modal)
 * - All palette, transitions, shadow, hover rules via CSS only
 * - No game score or logic changed from current app logic
 */

// -- Config: List of games with localStorage keys, label, emoji, and how to display raw scores --
const GAME_CONFIG = [
  {
    name: "Block Game",
    emoji: "🔷",
    bestKey: "mmarcade-blockgame-bestscore",
    recentKey: "mmarcade-blockgame-scores",
    makeScoreDisplay: score => (typeof score === "number" ? score : "-"),
  },
  {
    name: "Memory Game",
    emoji: "🧠",
    bestKey: "mmarcade-memgame-highscore",
    recentKey: "mmarcade-memgame-histories",
    makeScoreDisplay: s =>
      s && typeof s === "object" && (s.moves || s.time)
        ? `${s.moves} moves, ${fmtTime(s.time)}`
        : "-",
  },
  {
    name: "Reaction Speed",
    emoji: "⚡",
    bestKey: "reactionGameScore",
    recentKey: "reactionGameHistories",
    makeScoreDisplay: ms =>
      typeof ms === "number"
        ? ms > 1200
          ? `${(ms / 1000).toFixed(3)}s`
          : `${ms} ms`
        : "-",
  },
  {
    name: "Typing Challenge",
    emoji: "⌨️",
    bestKey: "mmarcade-typing-bestwpm",
    recentKey: "mmarcade-typing-wpmhistory",
    makeScoreDisplay: wpm =>
      typeof wpm === "number" && !isNaN(wpm)
        ? wpm.toFixed(2) + " WPM"
        : "-",
  },
  {
    name: "Sliding Tile Puzzle",
    emoji: "🔲",
    bestKey: "mmarcade-slidingtile-best-4",
    recentKey: "mmarcade-slidingtile-histories-4",
    makeScoreDisplay: s =>
      s && typeof s === "object" && (s.moves || s.time)
        ? `${s.moves} moves, ${fmtTime(s.time)}`
        : "-",
  },
  {
    name: "Sudoku",
    emoji: "🔢",
    bestKey: "sudokuBestTime",
    recentKey: "sudokuHistories",
    makeScoreDisplay: t =>
      typeof t === "number" && !isNaN(t)
        ? fmtTime(t)
        : "-",
  },
];

// Utility: format seconds as mm:ss
function fmtTime(seconds) {
  if (typeof seconds !== "number") return "-";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s < 10 ? "0" : ""}${s}`;
}

// Utility: format date string or Date for card display
function fmtDate(d) {
  if (!d) return "";
  try {
    const o = typeof d === "string" ? new Date(d) : d;
    if (isNaN(o.getTime())) return "";
    return o.toLocaleDateString(undefined, { year: "2-digit", month: "short", day: "2-digit" });
  } catch {
    return "";
  }
}

// Helper to get score and history from localStorage
function loadScoreData(cfg) {
  let best = null;
  let recent = [];
  try {
    if (typeof window !== "undefined") {
      // Best
      let bestRaw = window.localStorage.getItem(cfg.bestKey);
      if (bestRaw) {
        if (typeof cfg.makeScoreDisplay === "function" && (cfg.bestKey.includes("highscore") || cfg.bestKey.includes("best-4"))) {
          best = JSON.parse(bestRaw);
        } else if (cfg.bestKey === "mmarcade-typing-bestwpm") {
          best = parseFloat(bestRaw);
        } else {
          best = parseInt(bestRaw, 10);
        }
      }
      // Recent scores (array most recent last)
      let recKey = cfg.recentKey;
      if (recKey) {
        let raw = window.localStorage.getItem(recKey);
        if (raw) {
          let data = [];
          try { data = JSON.parse(raw); } catch {}
          if (!Array.isArray(data)) data = [];
          recent = data.slice(-5);
        }
      }
    }
  } catch {}
  return {
    best,
    recent: Array.isArray(recent) && recent.length ? [...recent].reverse() : (best !== null && best !== undefined ? [best] : []),
  };
}

// Resets all scores and histories for all games
function resetAllScores() {
  if (typeof window === "undefined") return;
  GAME_CONFIG.forEach(cfg => {
    try {
      window.localStorage.removeItem(cfg.bestKey);
      if (cfg.recentKey) window.localStorage.removeItem(cfg.recentKey);
    } catch {}
  });
  // Remove legacy/extra keys if ever changed in versions
  try {
    window.localStorage.removeItem("quickMathScore");
    window.localStorage.removeItem("mmarcade-blockgame-scores");
    window.localStorage.removeItem("reaction_time_last");
    window.localStorage.removeItem("mmarcade-memgame-lastscore");
    window.localStorage.removeItem("mmarcade-typing-wpmhistory");
    window.localStorage.removeItem("sudokuHistories");
    window.localStorage.removeItem("mmarcade-slidingtile-histories-4");
  } catch {}
}

// PUBLIC_INTERFACE
function ScoreboardPage() {
  const [scores, setScores] = useState([]);
  const [showResetModal, setShowResetModal] = useState(false);
  const gridRef = useRef();

  // On mount/load or after reset, load all game data
  useEffect(() => {
    const loaded = GAME_CONFIG.map(cfg => ({
      ...cfg,
      ...loadScoreData(cfg),
    }));
    setScores(loaded);
    // Animate fade-in
    if (gridRef.current) gridRef.current.classList.remove("fade-in");
    setTimeout(() => {
      if (gridRef.current) gridRef.current.classList.add("fade-in");
    }, 60);
  }, [showResetModal]);

  // Reset and re-run data after confirmation
  function handleResetConfirm() {
    resetAllScores();
    setShowResetModal(false);
    // Will reload via useEffect
  }

  return (
    <div className="scoreboard-root">
      <h1 className="scoreboard-heading" tabIndex={0} aria-label="Arcade Scoreboard">
        🏆 Scoreboard
      </h1>

      <div
        className="scoreboard-card-grid"
        ref={gridRef}
        aria-label="Game scores grid"
        role="list"
      >
        {scores.map((g, idx) => (
          <section className="scoreboard-card" tabIndex={0} key={g.name}>
            <div className="scoreboard-game-title">
              <span className="scoreboard-game-emoji" aria-hidden="true">
                {g.emoji}
              </span>
              {g.name}
            </div>
            <div className="scoreboard-best-label">Best</div>
            <span className="scoreboard-best-score">{g.makeScoreDisplay(g.best)}</span>
            {g.recent && g.recent.length > 0 && Array.isArray(g.recent) && (
              <ul className="scoreboard-recent-list" aria-label="Last 5 scores">
                {g.recent.slice(0, 5).map((val, i) => (
                  <li className="scoreboard-recent-score" key={i}>
                    {typeof val === "object" && val !== null && "moves" in val && "time" in val
                      ? `${val.moves} moves, ${fmtTime(val.time)}`
                      : typeof val === "number" && g.name === "Reaction Speed"
                        ? (val > 1200 ? `${(val / 1000).toFixed(3)}s` : `${val} ms`)
                        : typeof val === "number" && g.name === "Typing Challenge"
                          ? `${val.toFixed(2)} WPM`
                          : typeof val === "number" && g.name === "Sudoku"
                            ? fmtTime(val)
                            : val
                    }
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
      <div className="scoreboard-reset-row">
        <button
          className="scoreboard-reset-btn"
          onClick={() => setShowResetModal(true)}
          aria-label="Reset all scores"
        >
          Reset All Scores
        </button>
      </div>
      {showResetModal && (
        <div className="scoreboard-reset-modal-backdrop" role="dialog">
          <div className="scoreboard-reset-modal-content">
            <div className="scoreboard-reset-modal-title">
              Reset all scores? This cannot be undone.
            </div>
            <div className="scoreboard-reset-modal-buttons">
              <button
                className="scoreboard-reset-cancel"
                onClick={() => setShowResetModal(false)}
                autoFocus
              >
                Cancel
              </button>
              <button
                className="scoreboard-reset-confirm"
                onClick={handleResetConfirm}
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ScoreboardPage;
