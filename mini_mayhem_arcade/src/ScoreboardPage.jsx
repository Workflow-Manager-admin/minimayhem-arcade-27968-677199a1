import React, { useEffect, useState } from "react";
import "./App.css";
import "./GamesPage.css"; // Use game card styles for grid
import "./ScoreboardPage.css";

/*
  PUBLIC_INTERFACE
  ScoreboardPage: Displays a 3x2 grid of cards for each active game.
  Each card shows game emoji, game name, best score, last 5 scores, and a Reset All Scores button at bottom.
  Scores are retrieved from localStorage per-game. Only enabled games are shown.
*/

const GAMES = [
  {
    key: "memory",
    name: "Memory Game",
    emoji: "🧠",
    lsBest: "mmarcade-memgame-highscore",
    lsRecent: "mmarcade-memgame-history",
    formatBest: (val) => val && typeof val.moves === "number" && typeof val.time === "number"
      ? `${val.moves} moves, ${formatTime(val.time)}`
      : "—",
    formatScore: (s) => (s && typeof s.moves === "number" && typeof s.time === "number"
      ? `${s.moves} moves, ${formatTime(s.time)}`
      : s && typeof s === "object" && s !== null
        ? JSON.stringify(s)
        : typeof s === "string"
        ? s
        : "—"),
    defaultBest: "—",
    defaultList: [],
    iconColor: "#00B0E0"
  },
  {
    key: "reaction",
    name: "Reaction Speed",
    emoji: "⚡",
    lsBest: "reactionGameScore",
    lsRecent: "reactionGameScoreList",
    formatBest: (val) =>
      (typeof val === "number" && !isNaN(val))
        ? (val > 1200 ? (val / 1000).toFixed(3) + "s" : `${val} ms`)
        : "—",
    formatScore: (s) =>
      typeof s === "number"
        ? (s > 1200 ? (s / 1000).toFixed(3) + "s" : `${s} ms`)
        : "—",
    defaultBest: "—",
    defaultList: [],
    iconColor: "#FFD301"
  },
  {
    key: "typing",
    name: "Typing Challenge",
    emoji: "⌨️",
    lsBest: "mmarcade-typing-bestwpm",
    lsRecent: "mmarcade-typing-history",
    formatBest: (val) =>
      typeof val === "number" && !isNaN(val) ? `${val} WPM` : "—",
    formatScore: (s) =>
      typeof s === "number" && !isNaN(s) ? `${s} WPM` : "—",
    defaultBest: "—",
    defaultList: [],
    iconColor: "#fa537b"
  },
  {
    key: "quickmath",
    name: "Quick Math",
    emoji: "➗",
    lsBest: "quickMathScore",
    lsRecent: "quickMathScoreList",
    formatBest: (val) =>
      typeof val === "number" && !isNaN(val) ? `${val} pts` : "—",
    formatScore: (s) =>
      typeof s === "number" && !isNaN(s) ? `${s} pts` : "—",
    defaultBest: "—",
    defaultList: [],
    iconColor: "#437fe8"
  },
  {
    key: "blockgame",
    name: "Block Game",
    emoji: "🔷",
    lsBest: "mmarcade-blockgame-bestscore",
    lsRecent: "mmarcade-blockgame-history",
    formatBest: (val) =>
      typeof val === "number" && !isNaN(val) ? `${val} pts` : "—",
    formatScore: (s) =>
      typeof s === "number" && !isNaN(s) ? `${s} pts` : "—",
    defaultBest: "—",
    defaultList: [],
    iconColor: "#00FFD7"
  },
  {
    key: "randomfun",
    name: "Random Fun",
    emoji: "🎲",
    lsBest: "mmarcade-random-bestscore",
    lsRecent: "mmarcade-random-history",
    formatBest: (val) => (val !== undefined && val !== null ? val : "—"),
    formatScore: (s) => (s !== undefined && s !== null ? s : "—"),
    defaultBest: "—",
    defaultList: [],
    iconColor: "#ef7b09"
  },
];

// Helper to format seconds as mm:ss
function formatTime(sec) {
  if (typeof sec !== "number" || isNaN(sec)) return "—";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s < 10 ? "0" : ""}${s}`;
}

// Return localStorage results for a game. Each game tracks best + history (array), fallback to []/—.
function getGameScores(game) {
  // Best Score
  let best = game.defaultBest;
  let last5 = game.defaultList;
  if (typeof window !== "undefined") {
    // Retrieve best (various formats)
    try {
      const bestRaw = window.localStorage.getItem(game.lsBest);
      if (bestRaw !== null) {
        if (game.key === "memory" && bestRaw) {
          best = JSON.parse(bestRaw);
        } else if (game.key === "reaction") {
          best = parseInt(bestRaw, 10);
        } else if (["quickmath", "blockgame"].includes(game.key)) {
          best = parseInt(bestRaw, 10);
        } else if (game.key === "randomfun" && bestRaw) {
          best = bestRaw;
        } else if (game.key === "typing") {
          best = parseFloat(bestRaw);
        }
      }
    } catch {}

    // Retrieve last5 (as array; fallback to [])
    try {
      const recentsRaw = window.localStorage.getItem(game.lsRecent);
      if (recentsRaw !== null) {
        // If array as stringified JSON array
        let parsed = JSON.parse(recentsRaw);
        if (Array.isArray(parsed)) {
          last5 = parsed.slice(-5).reverse();
        }
      } else {
        // Some games store only last value (not array)
        if (game.key === "reaction") {
          const v = window.localStorage.getItem("reaction_time_last");
          if (v !== null && !isNaN(parseInt(v, 10))) {
            last5 = [parseInt(v, 10)];
          }
        } else if (game.key === "memory") {
          // Try to show last played
          const v = window.localStorage.getItem("mmarcade-memgame-lastscore");
          if (v) {
            last5 = [JSON.parse(v)];
          }
        }
      }
    } catch {}
  }
  return {
    best,
    last5,
  };
}

// Remove all scores for all games from localStorage, for a "global reset" feature.
function resetAllScores() {
  if (typeof window === "undefined") return;
  GAMES.forEach((g) => {
    try {
      window.localStorage.removeItem(g.lsBest);
      window.localStorage.removeItem(g.lsRecent);
      // Remove alternate keys if present
      if (g.key === "memory") window.localStorage.removeItem("mmarcade-memgame-lastscore");
      if (g.key === "reaction") window.localStorage.removeItem("reaction_time_last");
    } catch {}
  });
}

// PUBLIC_INTERFACE
function ScoreboardPage() {
  // state: array of {game, best, last5}
  const [scores, setScores] = useState([]);

  // On mount and on reset force update from localStorage
  useEffect(() => {
    const data = GAMES.map((game) => ({
      ...game,
      ...getGameScores(game),
    }));
    setScores(data);
  }, []);

  // Handle reset all
  function handleResetAll() {
    // Confirm reset (optional: remove for minimal interaction)
    // eslint-disable-next-line no-restricted-globals
    if (window.confirm("Are you sure you want to reset ALL high scores and history?")) {
      resetAllScores();
      // Re-fetch for every card
      const data = GAMES.map((game) => ({
        ...game,
        ...getGameScores(game),
      }));
      setScores(data);
    }
  }

  return (
    <main className="container scoreboard-page-root" style={{ paddingTop: 96, paddingBottom: 38, minHeight: "100vh" }}>
      <h1 style={{
        fontWeight: 900,
        fontSize: "2.3rem",
        textAlign: "center",
        marginBottom: 30,
        letterSpacing: "-1.5px",
        color: "var(--games-accent, #68adc4)",
        textShadow: "0 3px 18px #68adc438"
      }}>
        🎮 Arcade Scoreboard
      </h1>
      <section className="scoreboard-grid-section" aria-label="Scoreboard cards">
        <div
          className="scoreboard-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gridTemplateRows: "repeat(2, 1fr)",
            gap: "40px 22px",
            maxWidth: 920,
            margin: "0 auto 48px auto",
          }}
        >
          {scores.map((g, idx) => (
            <ScoreCard
              key={g.key}
              name={g.name}
              emoji={g.emoji}
              iconColor={g.iconColor}
              best={g.formatBest(g.best)}
              last5={g.last5}
              formatScore={g.formatScore}
            />
          ))}
        </div>
      </section>
      <div style={{
        display: "flex",
        justifyContent: "center",
        marginTop: 20
      }}>
        <button
          className="btn btn-large"
          style={{
            fontWeight: 700,
            fontSize: "1.13rem",
            background: "#ed2828",
            borderRadius: 6,
            padding: "13px 34px",
            boxShadow: "0 2px 16px #f9585859",
            color: "#fff",
          }}
          onClick={handleResetAll}
        >
          Reset All Scores
        </button>
      </div>
    </main>
  );
}

// Card for each game's scoreboard info
function ScoreCard({ name, emoji, best, last5, formatScore, iconColor }) {
  return (
    <article
      className="scoreboard-card"
      tabIndex={0}
      style={{
        background: "var(--games-card-bg, #fff)",
        border: "1.2px solid var(--games-card-border, #e3e8f088)",
        borderRadius: 20,
        boxShadow: "0 7px 29px #22214e18, 0 2px 9px #4f46e515",
        padding: "29px 17px 23px 17px",
        minHeight: 225,
        display: "flex",
        flexDirection: "column",
        alignItems: "center"
      }}
      aria-label={`Scores for ${name}`}
    >
      <span
        className="scoreboard-card-emoji"
        style={{
          fontSize: "2.8rem",
          marginBottom: 9,
          userSelect: "none",
          textShadow: iconColor ? `0 2px 12px ${iconColor}70` : "0 2px 8px #9997"
        }}
        aria-hidden="true"
      >
        {emoji}
      </span>
      <div
        className="scoreboard-card-title"
        style={{
          fontWeight: 800,
          fontSize: "1.17rem",
          color: "var(--games-accent, #68adc4)"
        }}
      >
        {name}
      </div>
      <div style={{
        fontWeight: 600,
        color: "#495bb3",
        marginTop: 7,
        letterSpacing: "0.01em"
      }}>
        Best: <span style={{ fontWeight: 900 }}>{best}</span>
      </div>
      <div style={{ marginTop: 11, width: "100%" }}>
        <div style={{
          fontSize: "0.99rem",
          color: "#7a779e",
          fontWeight: 500,
          marginBottom: 3,
          letterSpacing: "0.01em"
        }}>
          Last 5 Scores:
        </div>
        {last5 && last5.length ? (
          <ol style={{ paddingLeft: 17, margin: "0 0 0 0", color: "#20214b", fontWeight: 600 }}>
            {last5.slice(0, 5).map((s, i) => (
              <li key={i} style={{ marginBottom: 1, color: "#33337f", fontWeight: 700, fontSize: "1em" }}>
                {formatScore(s)}
              </li>
            ))}
          </ol>
        ) : (
          <div style={{ color: "#b5b9c7", marginTop: 4 }}>No recent scores</div>
        )}
      </div>
    </article>
  );
}

export default ScoreboardPage;
