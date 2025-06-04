import React, { useState, useEffect, useRef } from "react";
import "./ScoreboardPage.css";
import { useNavigate } from "react-router-dom";

// PUBLIC_INTERFACE
// ScoreboardPage: 3x2 card grid, each card = game name + emoji, best score, last 5 scores, Reset All Scores button at bottom.
// No Light Beam or inactive games. Fully styled, accessible, works in dark/light.

const GAMES = [
  {
    key: "block",
    name: "Block Game",
    emoji: "🔷",
    bestKey: "mmarcade-blockgame-bestscore",
    recentsKey: "mmarcade-blockgame-recents",
    bestLabel: "Best Score",
    getBest: val =>
      typeof val === "number" && !isNaN(val) ? val : "No score yet",
    formatRecent: val =>
      typeof val === "number" && !isNaN(val) ? `${val}` : "-",
  },
  {
    key: "memory",
    name: "Memory Game",
    emoji: "🧠",
    bestKey: "mmarcade-memgame-highscore",
    recentsKey: "mmarcade-memgame-recent",
    bestLabel: "Best (Moves, Time)",
    getBest: val =>
      val && typeof val.moves === "number"
        ? `${val.moves} moves, ${formatTime(val.time)}`
        : "No win yet",
    formatRecent: val =>
      val && typeof val.moves === "number"
        ? `${val.moves} moves, ${formatTime(val.time)}`
        : "-",
  },
  {
    key: "reaction",
    name: "Reaction Speed",
    emoji: "⚡",
    bestKey: "reactionGameScore", // legacy (int ms)
    recentsKey: "reactionGameRecents",
    bestLabel: "Best Time",
    getBest: val =>
      typeof val === "number" && !isNaN(val)
        ? val > 1200
          ? (val / 1000).toFixed(3) + "s"
          : val + " ms"
        : "No score yet",
    formatRecent: val =>
      typeof val === "number" && !isNaN(val)
        ? val > 1200
          ? (val / 1000).toFixed(3) + "s"
          : val + " ms"
        : "-",
  },
  {
    key: "typing",
    name: "Typing Challenge",
    emoji: "⌨️",
    bestKey: "mmarcade-typing-bestwpm",
    recentsKey: "mmarcade-typing-wpm-recents",
    bestLabel: "Best WPM",
    getBest: val =>
      typeof val === "number" && !isNaN(val) ? `${val} WPM` : "No score yet",
    formatRecent: val =>
      typeof val === "number" && !isNaN(val) ? `${val} WPM` : "-",
  },
  {
    key: "wordTyping",
    name: "Word Typing Challenge",
    emoji: "📝",
    bestKey: "mmarcade-word-typing-bestscore",
    recentsKey: "mmarcade-word-typing-recents",
    bestLabel: "Best Points",
    getBest: val =>
      typeof val === "number" && !isNaN(val) ? `${val} pts` : "No score yet",
    formatRecent: val =>
      typeof val === "number" && !isNaN(val) ? `${val} pts` : "-",
  },
  {
    key: "sliding",
    name: "Sliding Tile Puzzle",
    emoji: "🔲",
    bestKey: "mmarcade-slidingtile-best-4",
    recentsKey: "mmarcade-slidingtile-recent-4",
    bestLabel: "Best (Moves, Time)",
    getBest: val =>
      val && typeof val.moves === "number"
        ? `${val.moves} moves, ${formatTime(val.time)}`
        : "No win yet",
    formatRecent: val =>
      val && typeof val.moves === "number"
        ? `${val.moves} moves, ${formatTime(val.time)}`
        : "-",
  },
];

// Time formatter for memory/sliding: mm:ss
function formatTime(sec) {
  if (typeof sec !== "number" || isNaN(sec)) return "-";
  let m = Math.floor(sec / 60);
  let s = sec % 60;
  return `${m}:${s < 10 ? "0" : ""}${s}`;
}

// PUBLIC_INTERFACE
function ScoreboardPage() {
  const [gameResults, setGameResults] = useState({});
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetFeedback, setResetFeedback] = useState("");
  const navigate = useNavigate();
  const resetBtnRef = useRef();

  // On mount/load, fetch all scores and recent arrays for all games
  useEffect(() => {
    function fetchForAllGames() {
      const results = {};
      for (const g of GAMES) {
        let best = null;
        let recentsArr = [];
        // Best
        try {
          let raw = window.localStorage.getItem(g.bestKey);
          if (
            g.key === "memory" ||
            g.key === "sliding"
          ) {
            best = raw ? JSON.parse(raw) : null;
          } else if (
            g.key === "typing" ||
            g.key === "wordTyping"
          ) {
            best = raw !== null && !isNaN(Number(raw)) ? Number(raw) : null;
          } else if (g.key === "block" || g.key === "reaction") {
            best = raw !== null && !isNaN(parseInt(raw, 10))
              ? parseInt(raw, 10)
              : null;
          } else {
            best = raw; // fallback
          }
        } catch {
          best = null;
        }
        // Recents
        try {
          let recentsRaw = window.localStorage.getItem(g.recentsKey) || "[]";
          let rec = [];
          if (
            g.key === "memory" ||
            g.key === "sliding"
          ) {
            rec = JSON.parse(recentsRaw);
            if (!Array.isArray(rec)) rec = [];
          } else if (g.key === "typing" || g.key === "wordTyping" || g.key === "block" || g.key === "reaction") {
            rec = JSON.parse(recentsRaw);
            if (!Array.isArray(rec)) rec = [];
          }
          // If no recents logic: fallback to legacy/last
          if (rec.length === 0) {
            // Try to get 'legacy last score'
            if (g.key === "memory") {
              try {
                let last = window.localStorage.getItem("mmarcade-memgame-lastscore");
                if (last) {
                  const o = JSON.parse(last);
                  rec = o && typeof o.moves === "number" ? [o] : [];
                }
              } catch {}
            } else if (g.key === "sliding") {
              try {
                let last = window.localStorage.getItem("mmarcade-slidingtile-best-4");
                if (last) {
                  const o = JSON.parse(last);
                  rec = o && typeof o.moves === "number" ? [o] : [];
                }
              } catch {}
            } else if (g.key === "reaction") {
              let last = window.localStorage.getItem("reaction_time_last");
              if (last !== null && !isNaN(parseInt(last, 10))) {
                rec = [parseInt(last, 10)];
              }
            } else if (g.key === "block") {
              let last = window.localStorage.getItem("mmarcade-blockgame-bestscore");
              if (last !== null && !isNaN(parseInt(last, 10))) {
                rec = [parseInt(last, 10)];
              }
            } else if (g.key === "typing") {
              let last = window.localStorage.getItem("mmarcade-typing-bestwpm");
              if (last !== null && !isNaN(Number(last))) {
                rec = [Number(last)];
              }
            } else if (g.key === "wordTyping") {
              let last = window.localStorage.getItem("mmarcade-word-typing-bestscore");
              if (last !== null && !isNaN(Number(last))) {
                rec = [Number(last)];
              }
            }
          }
        // limit to latest 5
        recentsArr = rec.slice(-5).reverse();
        } catch {
          recentsArr = [];
        }
        results[g.key] = { best, recents: recentsArr };
      }
      return results;
    }
    setGameResults(fetchForAllGames());
  }, [resetFeedback, showResetModal]);

  // Modal: Reset all scores
  function openResetModal() {
    setShowResetModal(true);
    setTimeout(() => {
      try {
        document.getElementById("scoreboard-reset-confirm")?.focus();
      } catch {}
    }, 35);
  }
  function closeResetModal() {
    setShowResetModal(false);
    setTimeout(() => {
      if (resetBtnRef.current) resetBtnRef.current.focus();
    }, 40);
  }
  function handleResetScores() {
    try {
      // Remove all best + recents for the 6 games
      for (const g of GAMES) {
        window.localStorage.removeItem(g.bestKey);
        window.localStorage.removeItem(g.recentsKey);
        // Remove alternate last/legacy keys
        if (g.key === "memory") {
          window.localStorage.removeItem("mmarcade-memgame-lastscore");
        }
        if (g.key === "sliding") {
          window.localStorage.removeItem("mmarcade-slidingtile-best-4");
        }
        if (g.key === "reaction") {
          window.localStorage.removeItem("reaction_time_last");
        }
        if (g.key === "block") {
          window.localStorage.removeItem("mmarcade-blockgame-bestscore");
        }
        if (g.key === "typing") {
          window.localStorage.removeItem("mmarcade-typing-bestwpm");
        }
        if (g.key === "wordTyping") {
          window.localStorage.removeItem("mmarcade-word-typing-bestscore");
        }
      }
      setResetFeedback("Scores reset!");
    } catch {
      setResetFeedback("Error resetting.");
    }
    setShowResetModal(false);
    setTimeout(() => setResetFeedback(""), 1700);
  }

  useEffect(() => {
    if (showResetModal) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
  }, [showResetModal]);

  // PUBLIC_INTERFACE
  // ScoreCard component for each card
  function ScoreCard({ game, result }) {
    return (
      <div className="scoreboard-card" tabIndex={0} aria-label={`${game.name} scores`}>
        <div className="scoreboard-game-title">
          <span className="scoreboard-game-emoji" aria-hidden="true">{game.emoji}</span>
          {game.name}
        </div>
        <div className="scoreboard-best-label">{game.bestLabel}:</div>
        <span className="scoreboard-best-score">{game.getBest(result.best)}</span>
        <div className="scoreboard-recent-label" style={{margin: "8px 0 3px 0", color: "var(--text-secondary)", fontWeight: 500}}>Last 5 Scores:</div>
        <ul className="scoreboard-recent-list">
          {(result.recents && result.recents.length)
            ? result.recents.map((r, i) => (
                <li key={i} className="scoreboard-recent-score">
                  {game.formatRecent(r)}
                </li>
              ))
            : <li className="scoreboard-recent-score" style={{fontStyle: "italic", opacity: 0.67}}>No recent scores</li>
          }
        </ul>
      </div>
    );
  }

  return (
    <div className="scoreboard-root">
      <main className="scoreboard-main">
        <h1 className="scoreboard-heading" tabIndex={0}>
          <span role="img" aria-label="Trophy">🏆</span> Your Scoreboard
        </h1>
        <div className="scoreboard-card-grid" tabIndex={-1}>
          {GAMES.map((g, i) => (
            <ScoreCard key={g.key} game={g} result={gameResults[g.key] || {}} />
          ))}
        </div>
        <div className="scoreboard-reset-row">
          <button
            ref={resetBtnRef}
            className="scoreboard-reset-btn"
            onClick={openResetModal}
            aria-label="Reset all scores"
          >
            Reset All Scores
          </button>
        </div>
        {resetFeedback && (
          <div className="scoreboard-reset-message" style={{
            textAlign: "center",
            fontWeight: 700,
            color: "#e57373",
            marginTop: "0.4em"
          }}>
            {resetFeedback}
          </div>
        )}
        <button
          className="scoreboard-back-btn"
          onClick={() => navigate("/games")}
          style={{marginBottom: 36, marginTop: 6}}
        >
          ← Back to Games
        </button>
      </main>
      {showResetModal && (
        <div className="scoreboard-reset-modal-backdrop" tabIndex={-1} aria-modal="true" role="dialog">
          <div className="scoreboard-reset-modal-content">
            <div className="scoreboard-reset-modal-title">
              Reset All Scores?
            </div>
            <div>Are you sure you want to clear all best scores and recents for all games? This can't be undone.</div>
            <div className="scoreboard-reset-modal-buttons">
              <button
                id="scoreboard-reset-cancel"
                className="scoreboard-reset-cancel"
                onClick={closeResetModal}
              >
                Cancel
              </button>
              <button
                id="scoreboard-reset-confirm"
                className="scoreboard-reset-confirm"
                onClick={handleResetScores}
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
