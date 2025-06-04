import React, { useEffect, useState } from "react";
import "./ScoreboardPage.css";

/*
 * PUBLIC_INTERFACE
 * ScoreboardPage: Displays a visually rich arcade scoreboard.
 * - Large, bold arcade heading centered at top.
 * - 3x2 grid of score cards: each card for a game (name+emoji, best, last 5, and last played, all from localStorage).
 * - Reset All Scores button at grid bottom (with confirmation, styled).
 * - Responsive and styled with previous palette.
 */

// Config: List of arcade games and their storage keys/labels
const GAME_CONFIG = [
  {
    name: "Block Game",
    emoji: "🔷",
    bestKey: "mmarcade-blockgame-bestscore",
    recentKey: "mmarcade-blockgame-scores",
    dateKey: "mmarcade-blockgame-lastdate",
    makeScoreDisplay: score => score,
    makeExtra: () => "",
  },
  {
    name: "Memory Game",
    emoji: "🧠",
    bestKey: "mmarcade-memgame-highscore",
    recentKey: "mmarcade-memgame-histories",
    dateKey: "mmarcade-memgame-lastdate",
    makeScoreDisplay: (s) =>
      s && typeof s === "object" && (s.moves || s.time)
        ? (`${s.moves} moves, ${fmtTime(s.time)}`)
        : "-",
    makeExtra: (s) =>
      s && typeof s === "object" && (s.moves || s.time)
        ? `${s.moves} moves, ${fmtTime(s.time)}`
        : "",
  },
  {
    name: "Reaction Speed",
    emoji: "⚡",
    bestKey: "reactionGameScore",
    recentKey: "reactionGameHistories",
    dateKey: "reactionGameLastDate",
    makeScoreDisplay: ms =>
      ms
        ? (ms > 1200 ? `${(ms / 1000).toFixed(3)}s` : `${ms} ms`)
        : "-",
    makeExtra: () => "",
  },
  {
    name: "Typing Challenge",
    emoji: "⌨️",
    bestKey: "mmarcade-typing-bestwpm",
    recentKey: "mmarcade-typing-wpmhistory",
    dateKey: "mmarcade-typing-lastdate",
    makeScoreDisplay: (wpm) =>
      typeof wpm === "number" && !isNaN(wpm)
        ? wpm.toFixed(2) + " WPM"
        : "-",
    makeExtra: () => "",
  },
  {
    name: "Sudoku",
    emoji: "🔢",
    bestKey: "sudokuBestTime",
    recentKey: "sudokuHistories",
    dateKey: "sudokuLastDate",
    makeScoreDisplay: (t) =>
      typeof t === "number" && !isNaN(t)
        ? fmtTime(t)
        : "-",
    makeExtra: () => "",
  },
  {
    name: "Sliding Tile Puzzle",
    emoji: "🔲",
    bestKey: "mmarcade-slidingtile-best-4",
    recentKey: "mmarcade-slidingtile-histories-4",
    dateKey: "mmarcade-slidingtile-lastdate-4",
    makeScoreDisplay: (s) =>
      s && typeof s === "object" && (s.moves || s.time)
        ? `${s.moves} moves, ${fmtTime(s.time)}`
        : "-",
    makeExtra: (s) =>
      s && typeof s === "object" && (s.moves || s.time)
        ? `${s.moves} moves, ${fmtTime(s.time)}`
        : "",
  },
];

// Best effort date formatting (YYYY-MM-DD or HH:MM)
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

function fmtTime(seconds) {
  if (typeof seconds !== "number") return "-";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s < 10 ? "0" : ""}${s}`;
}

// Helper: load best score and last N from localStorage
function loadScoreData(cfg) {
  let best = null;
  let recent = [];
  let lastDate = null;
  try {
    if (typeof window !== "undefined") {
      // Best
      let bestRaw = window.localStorage.getItem(cfg.bestKey);
      if (bestRaw) {
        if (cfg.bestKey === "mmarcade-memgame-highscore" ||
            cfg.bestKey === "mmarcade-slidingtile-best-4") {
          best = JSON.parse(bestRaw);
        } else if (cfg.bestKey === "mmarcade-typing-bestwpm") {
          best = parseFloat(bestRaw);
        } else if (cfg.bestKey === "sudokuBestTime" ||
                   cfg.bestKey === "mmarcade-blockgame-bestscore" ||
                   cfg.bestKey === "reactionGameScore") {
          best = parseInt(bestRaw, 10);
        }
      }
      // Recent (may be a JSON array, or missing)
      let recKey = cfg.recentKey;
      if (recKey) {
        let raw = window.localStorage.getItem(recKey);
        if (raw) {
          if (cfg.bestKey === "mmarcade-memgame-highscore" ||
              cfg.bestKey === "mmarcade-slidingtile-best-4") {
            // Array of {moves, time, date}
            recent = JSON.parse(raw);
            if (!Array.isArray(recent)) recent = [];
          } else if (cfg.bestKey === "mmarcade-typing-bestwpm") {
            // Array of WPM numbers
            recent = JSON.parse(raw);
          } else if (cfg.bestKey === "sudokuBestTime" ||
                     cfg.bestKey === "mmarcade-blockgame-bestscore" ||
                     cfg.bestKey === "reactionGameScore") {
            // Array of numbers (ms/sec)
            recent = JSON.parse(raw);
          }
        }
      }
      // Date (optional)
      const dateKey = cfg.dateKey;
      if (dateKey) {
        let dRaw = window.localStorage.getItem(dateKey);
        if (dRaw) {
          lastDate = dRaw;
        }
      }
    }
  } catch {}
  // If no explicit history and best exists, push as single record.
  return {
    best,
    recent: (recent && Array.isArray(recent) && recent.length)
      ? recent.slice(-5).reverse()
      : (best !== null && best !== undefined) ? [best] : [],
    lastDate,
  };
}

/* Reset All Scores - clears all known keys */
function resetAllScores() {
  if (typeof window === "undefined") return;
  GAME_CONFIG.forEach(cfg => {
    try {
      window.localStorage.removeItem(cfg.bestKey);
      if (cfg.recentKey) window.localStorage.removeItem(cfg.recentKey);
      if (cfg.dateKey) window.localStorage.removeItem(cfg.dateKey);
    } catch {}
  });
  // Some legacy keys (for past version compatibility)
  try {
    window.localStorage.removeItem("quickMathScore");
    window.localStorage.removeItem("mmarcade-blockgame-scores");
    window.localStorage.removeItem("reaction_time_last");
    window.localStorage.removeItem("mmarcade-memgame-lastscore");
    window.localStorage.removeItem("mmarcade-memgame-histories");
    window.localStorage.removeItem("mmarcade-typing-wpmhistory");
    window.localStorage.removeItem("sudokuHistories");
    window.localStorage.removeItem("mmarcade-slidingtile-histories-4");
    // Add more as needed for broader wipe
  } catch {}
}

// PUBLIC_INTERFACE
function ScoreboardPage() {
  const [scores, setScores] = useState([]);
  const [resetPending, setResetPending] = useState(false);

  // On mount/load, pull all game data from localStorage
  useEffect(() => {
    const s = GAME_CONFIG.map(cfg => ({
      ...cfg,
      ...loadScoreData(cfg),
    }));
    setScores(s);
  }, [resetPending]);

  // Confirm then reset
  function handleResetAll() {
    if (!resetPending) {
      setResetPending(true);
      setTimeout(() => setResetPending(false), 3000);
      return;
    }
    resetAllScores();
    setResetPending(false);
    // Refresh
    setScores(GAME_CONFIG.map(cfg => ({
      ...cfg,
      ...loadScoreData(cfg),
    })));
  }

  return (
    <div className="scoreboard-root">
      <div className="scoreboard-container">
        <header>
          <h1 className="scoreboard-heading">
            <span role="img" aria-label="trophy">🏆</span>
            Scoreboard
            <span role="img" aria-label="arcade">🎮</span>
          </h1>
          <div className="scoreboard-subhead">
            Your personal bests—locally saved!
          </div>
        </header>
        <section aria-label="Score Cards" className="scoreboard-grid">
          {scores.map((g, i) => (
            <ScoreCard
              key={g.name}
              name={g.name}
              emoji={g.emoji}
              best={g.best}
              recent={g.recent}
              bestKey={g.bestKey}
              makeScoreDisplay={g.makeScoreDisplay}
              lastDate={g.lastDate}
              idx={i}
            />
          ))}
        </section>
        <div className="scoreboard-reset-row">
          <button
            className={`scoreboard-reset-btn${resetPending ? " confirm" : ""}`}
            onClick={handleResetAll}
            aria-label="Reset all scores"
          >
            {resetPending
              ? "Click again to confirm reset"
              : "Reset All Scores"}
          </button>
          <span className="scoreboard-reset-caption">
            This will clear high scores and histories for all games on this device.
          </span>
        </div>
      </div>
    </div>
  );
}

// Card for one game's scores
function ScoreCard({
  name, emoji, best, recent, makeScoreDisplay, lastDate,
}) {
  return (
    <article className="scorecard">
      <div className="scorecard-header">
        <span className="scorecard-emoji" aria-label={name}>
          {emoji}
        </span>
        <span className="scorecard-name">{name}</span>
      </div>
      <div className="scorecard-row">
        <span className="scorecard-label">Best:</span>
        <span className="scorecard-best">{makeScoreDisplay(best)}</span>
      </div>
      <div className="scorecard-row">
        <span className="scorecard-label">Recent:</span>
        <span className="scorecard-recent">
          {
            Array.isArray(recent) && recent.length > 0
              ? recent
                .map(s => typeof s === "object"
                  ? (s.moves !== undefined && s.time !== undefined
                      ? `${s.moves}m/${fmtTime(s.time)}`
                      : JSON.stringify(s))
                  : (typeof s === "number"
                      ? (name === "Reaction Speed"
                          ? (s > 1200 ? `${(s / 1000).toFixed(3)}s` : `${s}ms`)
                          : s)
                      : s))
                .join(", ")
              : "-"
          }
        </span>
      </div>
      <div className="scorecard-row">
        <span className="scorecard-label">Last Played:</span>
        <span className="scorecard-date">
          {lastDate ? fmtDate(lastDate) : "-"}
        </span>
      </div>
    </article>
  );
}

export default ScoreboardPage;
