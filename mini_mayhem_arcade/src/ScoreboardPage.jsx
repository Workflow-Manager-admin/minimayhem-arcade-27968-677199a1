import React, { useState, useEffect } from "react";
import "./ScoreboardPage.css";
import { Link, useNavigate } from "react-router-dom";

// Score keys and game metadata
const GAMES = [
  {
    id: "block",
    name: "Block Game",
    icon: "🔷",
    accent: "#00FFD7",
    getBest: () => {
      let val = window.localStorage.getItem("mmarcade-blockgame-bestscore");
      if (val && !isNaN(Number(val))) return Number(val);
      return null;
    },
    getRecent: () => {
      let val = window.localStorage.getItem("mmarcade-blockgame-history");
      try {
        if (val) return JSON.parse(val);
      } catch {}
      return [];
    }
  },
  {
    id: "memory",
    name: "Memory Game",
    icon: "🧠",
    accent: "#00B0E0",
    getBest: () => {
      let json = window.localStorage.getItem("mmarcade-memgame-highscore");
      try {
        if (json) {
          const { moves, time } = JSON.parse(json);
          return { moves, time };
        }
      } catch {}
      return null;
    },
    getRecent: () => {
      let json = window.localStorage.getItem("mmarcade-memgame-scorelist");
      try {
        if (json) return JSON.parse(json);
      } catch {}
      // Fallback to most recent score v1:
      let last = window.localStorage.getItem("mmarcade-memgame-lastscore");
      if (last) {
        try {
          return [JSON.parse(last)];
        } catch {}
      }
      return [];
    }
  },
  {
    id: "reaction",
    name: "Reaction Speed",
    icon: "⚡",
    accent: "#FACA15",
    getBest: () => {
      let best = window.localStorage.getItem("reactionGameBest");
      if (best && !isNaN(Number(best))) return Number(best);
      // Fallback: check last score
      let last = window.localStorage.getItem("reactionGameScore");
      if (last && !isNaN(Number(last))) return Number(last);
      return null;
    },
    getRecent: () => {
      let list = window.localStorage.getItem("reactionGameHistory");
      try {
        if (list) return JSON.parse(list);
      } catch {}
      // Fallback: check last score
      let last = window.localStorage.getItem("reactionGameScore");
      if (last && !isNaN(Number(last))) return [Number(last)];
      return [];
    }
  },
  {
    id: "typing",
    name: "Typing Challenge",
    icon: "⌨️",
    accent: "#4F46E5",
    getBest: () => {
      let val = window.localStorage.getItem("mmarcade-typing-bestwpm");
      if (val && !isNaN(Number(val))) return Math.round(parseFloat(val) * 100) / 100;
      return null;
    },
    getRecent: () => {
      let list = window.localStorage.getItem("mmarcade-typing-wpmlist");
      try {
        if (list) return JSON.parse(list);
      } catch {}
      let last = window.localStorage.getItem("mmarcade-typing-lastwpm");
      if (last && !isNaN(Number(last))) return [Math.round(parseFloat(last) * 100) / 100];
      return [];
    }
  },
  {
    id: "slidingtile",
    name: "Sliding Tile Puzzle",
    icon: "🔲",
    accent: "#68adc4",
    getBest: () => {
      // Consider best for 4x4 only for this
      let json = window.localStorage.getItem("mmarcade-slidingtile-best-4");
      try {
        if (json) {
          const { moves, time } = JSON.parse(json);
          return { moves, time };
        }
      } catch {}
      return null;
    },
    getRecent: () => {
      // Optionally get last 5 win stats (moves,time); if not available, fallback to last win
      let list = window.localStorage.getItem("mmarcade-slidingtile-history");
      try {
        if (list) return JSON.parse(list);
      } catch {}
      let last = window.localStorage.getItem("mmarcade-slidingtile-best-4");
      if (last) {
        try {
          return [JSON.parse(last)];
        } catch {}
      }
      return [];
    }
  },
  {
    id: "sudoku",
    name: "Sudoku",
    icon: "🔢",
    accent: "#68adc4",
    getBest: () => {
      let t = window.localStorage.getItem("sudokuBestTime");
      if (t && !isNaN(Number(t))) return Number(t);
      return null;
    },
    getRecent: () => {
      let list = window.localStorage.getItem("sudokuHistory");
      try {
        if (list) return JSON.parse(list);
      } catch {}
      let last = window.localStorage.getItem("sudokuBestTime");
      if (last && !isNaN(Number(last))) return [Number(last)];
      return [];
    }
  },
];

// Utility: Format time in seconds to mm:ss
function fmtTime(sec) {
  if (typeof sec !== "number" || isNaN(sec)) return "-";
  const m = Math.floor(sec / 60), s = sec % 60;
  return `${m}:${s < 10 ? "0" : ""}${s}`;
}

// Utility: Format Reaction (ms or s)
function fmtReaction(ms) {
  if (typeof ms !== "number" || isNaN(ms)) return "-";
  if (ms > 1200) return (ms / 1000).toFixed(3) + "s";
  return ms + " ms";
}

// Utility: Format date (ISO8601 or ms epoch)
function fmtDate(d) {
  if (!d) return "";
  try {
    let dateObj = typeof d === "string" && !/^\d+$/.test(d)
      ? new Date(d)
      : new Date(Number(d));
    if (isNaN(dateObj.getTime())) return "";
    return dateObj.toLocaleDateString() + " " + dateObj.toLocaleTimeString([], {hour: "2-digit", minute: "2-digit"});
  } catch {
    return "";
  }
}

function getDarkMode() {
  return document.documentElement.getAttribute("data-theme") === "dark";
}

// Main Scoreboard Page
// PUBLIC_INTERFACE
function ScoreboardPage() {
  // State for all scores (to support live update on reset)
  const [scores, setScores] = useState([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [justReset, setJustReset] = useState(false);

  const navigate = useNavigate();

  // Load all best/recent scores on mount (and when triggered)
  useEffect(() => {
    setScores(
      GAMES.map(game => ({
        id: game.id,
        name: game.name,
        icon: game.icon,
        accent: game.accent,
        best: game.getBest ? game.getBest() : null,
        recent: game.getRecent ? game.getRecent() : [],
      }))
    );
  }, [justReset]);

  // Handle clear all scores
  function handleResetAllScores() {
    // Wipe only keys used by games; don't clear all localStorage (leave settings/theme)
    const keys = [
      // Block Game
      "mmarcade-blockgame-bestscore", "mmarcade-blockgame-history",
      // Memory Game
      "mmarcade-memgame-highscore", "mmarcade-memgame-scorelist", "mmarcade-memgame-lastscore",
      // Reaction Game
      "reactionGameScore", "reactionGameBest", "reactionGameHistory", "reaction_time_last",
      // Typing Challenge
      "mmarcade-typing-bestwpm", "mmarcade-typing-lastwpm", "mmarcade-typing-wpmlist",
      // Sliding Tile
      "mmarcade-slidingtile-best-4", "mmarcade-slidingtile-best-5", "mmarcade-slidingtile-best-6",
      "mmarcade-slidingtile-history",
      // Sudoku
      "sudokuBestTime", "sudokuHistory"
    ];
    for (const k of keys) window.localStorage.removeItem(k);
    setConfirmOpen(false);
    setJustReset(j => !j);
  }

  // Open confirm dialog
  function openConfirm() {
    setConfirmOpen(true);
  }
  function closeConfirm() {
    setConfirmOpen(false);
  }

  return (
    <div className={`scoreboard-root${getDarkMode() ? " dark" : ""}`}>
      <div className="sb-container">
        <header className="sb-header">
          <h1 className="sb-title">
            <span className="sb-icon" role="img" aria-label="Leaderboard">🏆</span>
            Scoreboard
          </h1>
          <p className="sb-desc">
            Your personal bests and score history.<br />
            Scores are saved privately in your browser – no logins, just fun!
          </p>
        </header>
        <section className="sb-controls-row">
          <button className="sb-reset-btn" onClick={openConfirm}>
            Reset All Scores
          </button>
          <Link to="/games" className="sb-nav-btn">
            ← Back to Arcade
          </Link>
        </section>
        <section className="sb-main-grid">
          {scores.map((s) =>
            <ScoreCard
              key={s.id}
              name={s.name}
              icon={s.icon}
              accent={s.accent}
              best={s.best}
              recent={s.recent}
              gameId={s.id}
            />
          )}
        </section>
        <footer className="sb-footer">
          &copy; {new Date().getFullYear()} MiniMayhem Arcade ·
          <a href="/about" className="sb-footer-link">About</a> ·
          <a href="/help" className="sb-footer-link">Help</a>
        </footer>
        {confirmOpen && (
          <ConfirmDialog
            onClose={closeConfirm}
            onConfirm={handleResetAllScores}
          />
        )}
      </div>
    </div>
  );
}

// Card for one game's scores
function ScoreCard({ name, icon, accent, best, recent, gameId }) {
  // Pick display for best and recent, depending on game
  function BestDisplay() {
    if (gameId === "block")
      return best !== null ? <span>{best}</span> : <span className="sb-fade">No record</span>;
    if (gameId === "memory")
      return best && typeof best === "object"
        ? <span>{best.moves} moves, {fmtTime(best.time)}</span>
        : <span className="sb-fade">No record</span>;
    if (gameId === "reaction")
      return best !== null ? <span>{fmtReaction(best)}</span> : <span className="sb-fade">No record</span>;
    if (gameId === "typing")
      return best !== null ? <span>{best} WPM</span> : <span className="sb-fade">No record</span>;
    if (gameId === "slidingtile")
      return best && typeof best === "object"
        ? <span>{best.moves} moves, {fmtTime(best.time)}</span>
        : <span className="sb-fade">No win yet</span>;
    if (gameId === "sudoku")
      return best !== null ? <span>{fmtTime(best)}</span> : <span className="sb-fade">No record</span>;
    return <span className="sb-fade">No score</span>;
  }
  function RecentList() {
    if (!recent || !recent.length)
      return <li className="sb-fade">No game history yet</li>;
    return (
      recent.slice(0, 5).map((score, idx) => {
        // Memory and Sliding: {moves, time[, date]}
        if (gameId === "memory" || gameId === "slidingtile") {
          if (typeof score === "object") {
            const moves = score.moves, time = score.time, dt = score.date;
            return (
              <li key={idx}>
                {moves} moves, {fmtTime(time)}
                {dt && <span className="sb-date"> – {fmtDate(dt)}</span>}
              </li>
            );
          }
        }
        // Typing: WPM, optional date
        if (gameId === "typing") {
          if (typeof score === "object" && score.wpm) {
            return (
              <li key={idx}>
                {score.wpm} WPM
                {score.date && <span className="sb-date"> – {fmtDate(score.date)}</span>}
              </li>
            );
          }
          if (typeof score === "number")
            return <li key={idx}>{score} WPM</li>;
        }
        // Reaction: ms/second, optional date
        if (gameId === "reaction") {
          if (typeof score === "object" && score.score) {
            return (
              <li key={idx}>
                {fmtReaction(score.score)}
                {score.date && <span className="sb-date"> – {fmtDate(score.date)}</span>}
              </li>
            );
          }
          if (typeof score === "number")
            return <li key={idx}>{fmtReaction(score)}</li>;
        }
        // Sudoku: format time
        if (gameId === "sudoku") {
          if (typeof score === "object" && score.time)
            return <li key={idx}>{fmtTime(score.time)}{score.date && <span className="sb-date"> – {fmtDate(score.date)}</span>}</li>;
          if (typeof score === "number")
            return <li key={idx}>{fmtTime(score)}</li>;
        }
        // Block Game: number only
        if (gameId === "block") {
          if (typeof score === "object" && score.score)
            return <li key={idx}>{score.score}{score.date && <span className="sb-date"> – {fmtDate(score.date)}</span>}</li>;
          if (typeof score === "number")
            return <li key={idx}>{score}</li>;
        }
        // Default
        return <li key={idx}>{String(score)}</li>;
      })
    );
  }

  return (
    <div className="sb-card" style={{ "--sb-card-accent": accent }}>
      <div className="sb-card-header">
        <span className="sb-game-icon" aria-hidden="true">{icon}</span>
        <span className="sb-game-title">{name}</span>
      </div>
      <div className="sb-sep-row">
        <span className="sb-card-label">Best</span>
        <span className="sb-card-label">Last 5</span>
      </div>
      <div className="sb-card-main">
        <div className="sb-card-best">
          <BestDisplay />
        </div>
        <ul className="sb-card-recent">
          <RecentList />
        </ul>
      </div>
    </div>
  );
}

// Modal confirmation dialog for reset
function ConfirmDialog({ onClose, onConfirm }) {
  // Trap focus inside dialog for a11y
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);
  return (
    <div className="sb-modal-backdrop" tabIndex={-1}>
      <div className="sb-modal" role="dialog" aria-modal="true">
        <div className="sb-modal-icon" role="img" aria-label="Warning">⚠️</div>
        <div className="sb-modal-title">Reset All Scores?</div>
        <div className="sb-modal-desc">
          This will delete all personal bests and local scores for every game.<br />
          <b>This action cannot be undone.</b>
        </div>
        <div className="sb-modal-row">
          <button className="sb-modal-btn danger" onClick={onConfirm} autoFocus>
            Yes, Reset All
          </button>
          <button className="sb-modal-btn" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default ScoreboardPage;
