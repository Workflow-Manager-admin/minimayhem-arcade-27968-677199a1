import React, { useState } from "react";
import "./ScoreboardPage.css";

// -- Arcade game definitions for Scoreboard cards --
const GAMES = [
  {
    key: "blockgame",
    title: "Block Game",
    emoji: "🔷",
    bestKey: "mmarcade-blockgame-bestscore",
    recentKey: "mmarcade-blockgame-recents",
    formatting: (val) => (typeof val === "number" ? val : "-"),
    lastPlayedKey: "mmarcade-blockgame-recent-date"
  },
  {
    key: "memory",
    title: "Memory Game",
    emoji: "🧠",
    bestKey: "mmarcade-memgame-highscore",
    recentKey: "mmarcade-memgame-recent", // array of {moves, time, date}
    formatting: (val) =>
      val && typeof val === "object" && !isNaN(val.moves) && !isNaN(val.time)
        ? `${val.moves} moves, ${formatTime(val.time)}`
        : "-",
  },
  {
    key: "reaction",
    title: "Reaction Speed",
    emoji: "⚡",
    bestKey: "reactionGameScore", // ms number (lower is better)
    recentKey: "reaction-recent-scores",
    formatting: (val) =>
      typeof val === "number"
        ? val > 1200
          ? (val / 1000).toFixed(3) + "s"
          : val + " ms"
        : "-",
  },
  {
    key: "typing",
    title: "Typing Challenge",
    emoji: "⌨️",
    bestKey: "mmarcade-typing-bestwpm",
    recentKey: "mmarcade-typing-recent", // array
    formatting: (val) =>
      typeof val === "number" ? val + " wpm" : "-",
  },
  {
    key: "quickmath",
    title: "Quick Math",
    emoji: "➗",
    bestKey: "quickMathScore",
    recentKey: "quickmath-recent",
    formatting: (val) =>
      typeof val === "number" ? val + " pts" : "-",
  },
  {
    key: "slidingtile",
    title: "Sliding Tile Puzzle",
    emoji: "🔲",
    bestKey: "mmarcade-slidingtile-best-4",
    recentKey: "mmarcade-slidingtile-recent-4",
    formatting: (val) =>
      val && typeof val === "object" && !isNaN(val.moves) && !isNaN(val.time)
        ? `${val.moves} moves, ${formatTime(val.time)}`
        : "-",
  },
  {
    key: "sudoku",
    title: "Sudoku",
    emoji: "🔢",
    bestKey: "sudokuBestTime",
    recentKey: "sudoku-recent",
    formatting: (val) =>
      typeof val === "number" ? formatTime(val) : "-",
  },
];

// Formatter for memory game and sliding tile: seconds → M:SS
function formatTime(time) {
  if (typeof time !== "number" || isNaN(time) || time < 0) return "-";
  const m = Math.floor(time / 60);
  const s = time % 60;
  return m + ":" + (s < 10 ? "0" : "") + s;
}

function getThemeMode() {
  if (typeof window === "undefined") return "light";
  return document.documentElement.getAttribute("data-theme") === "dark"
    ? "dark"
    : "light";
}

// Load best & recents for all games
function getScores() {
  let scores = {};
  GAMES.forEach((g) => {
    let best = null;
    let recent = [];
    let lastPlayedDate = null;
    if (typeof window !== "undefined") {
      // Best scores, parse as needed.
      try {
        if (g.bestKey.includes("highscore") || g.bestKey.includes("best-4")) {
          // Best object format: {moves:<>,time:<>}
          const v = window.localStorage.getItem(g.bestKey);
          best = v ? JSON.parse(v) : null;
        } else {
          const v = window.localStorage.getItem(g.bestKey);
          best =
            v !== null
              ? isNaN(v)
                ? JSON.parse(v)
                : parseFloat(v)
              : null;
        }
        // Recent logic: store as JSON arrays or fallback to last best/last
        if (g.recentKey && window.localStorage.getItem(g.recentKey)) {
          try {
            const arr = JSON.parse(window.localStorage.getItem(g.recentKey));
            if (Array.isArray(arr)) recent = arr;
            else if (typeof arr === "object") recent = [arr];
            else if (typeof arr === "number") recent = [arr];
          } catch {
            const raw = window.localStorage.getItem(g.recentKey);
            if (raw && !isNaN(raw)) recent = [parseFloat(raw)];
            else if (raw) recent = [raw];
          }
        } else if (
          g.key === "reaction" &&
          window.localStorage.getItem(g.bestKey)
        ) {
          recent = [parseFloat(window.localStorage.getItem(g.bestKey))];
        } else if (g.key === "blockgame" && window.localStorage.getItem(g.bestKey)) {
          recent = [parseFloat(window.localStorage.getItem(g.bestKey))];
        }
        // Played date for blockgame, optional
        if (g.lastPlayedKey && window.localStorage.getItem(g.lastPlayedKey)) {
          lastPlayedDate = window.localStorage.getItem(g.lastPlayedKey);
        }
      } catch (e) {}
    }
    scores[g.key] = { best, recent, lastPlayedDate };
  });
  return scores;
}

// PUBLIC_INTERFACE
function ScoreboardPage() {
  const [scores, setScores] = useState(getScores());
  const [resetState, setResetState] = useState("idle"); // idle | confirm | done
  const [theme, setTheme] = useState(getThemeMode());

  // Respond to theme changes (necessary for correct palette on mode switch)
  React.useEffect(() => {
    function handleTheme() {
      setTheme(getThemeMode());
      setScores(getScores());
    }
    window.addEventListener("storage", handleTheme);
    const mo = new MutationObserver(handleTheme);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => {
      window.removeEventListener("storage", handleTheme);
      mo.disconnect();
    };
  }, []);

  // Reset logic (all score keys for all games)
  function handleReset() {
    if (resetState === "confirm") {
      GAMES.forEach((g) => {
        if (g.bestKey) window.localStorage.removeItem(g.bestKey);
        if (g.recentKey) window.localStorage.removeItem(g.recentKey);
        if (g.lastPlayedKey) window.localStorage.removeItem(g.lastPlayedKey);
      });
      setScores(getScores());
      setResetState("done");
      setTimeout(() => setResetState("idle"), 1400);
    } else {
      setResetState("confirm");
    }
  }
  function handleCancelReset() {
    setResetState("idle");
  }

  return (
    <div className="arcade-scoreboard-page">
      <div className="sb-title-row">
        <h1 className="sb-main-title">
          <span aria-label="Trophy" role="img">
            🏆
          </span>{" "}
          Scoreboard
        </h1>
      </div>
      <main className="sb-main-content">
        <div className="sb-card-grid-wrap">
          <div className="sb-card-grid" role="list">
            {GAMES.map((g) => {
              const data = scores[g.key] || {};
              return (
                <ScoreCard
                  key={g.key}
                  title={g.title}
                  emoji={g.emoji}
                  best={data.best}
                  recent={data.recent}
                  formatting={g.formatting}
                  lastPlayedDate={data.lastPlayedDate}
                  theme={theme}
                />
              );
            })}
          </div>
        </div>
      </main>
      <ScoreboardResetButton
        state={resetState}
        onReset={handleReset}
        onCancel={handleCancelReset}
      />
    </div>
  );
}

// -- Individual Score Card --
function ScoreCard({ title, emoji, best, recent, formatting, lastPlayedDate, theme }) {
  // Header color per theme
  return (
    <section className={`sb-card`} role="listitem" tabIndex={0}>
      <header className="sb-card-header">
        <span className="sb-game-emoji" aria-hidden="true">
          {emoji}
        </span>
        <span className="sb-game-title">{title}</span>
      </header>
      <div className="sb-best-row">
        <span className="sb-label">Best</span>
        <span className="sb-best-score">
          {formatting(best)}
        </span>
      </div>
      <div className="sb-last5-title">Last 5</div>
      <ul className="sb-recent-list">
        {recent && recent.length > 0 ? (
          recent
            .slice(-5)
            .reverse()
            .map((val, i) => (
              <li key={i} className="sb-recent-item">
                <span className="sb-recent-score">{formatting(val)}</span>
                {val && val.date && (
                  <span className="sb-recent-date">
                    {formatFriendlyDate(val.date)}
                  </span>
                )}
              </li>
            ))
        ) : (
          <li className="sb-recent-item sb-no-recent">—</li>
        )}
      </ul>
      {lastPlayedDate && (
        <div className="sb-date-row">
          <span className="sb-label">Played: </span>
          <span className="sb-date-val">{formatFriendlyDate(lastPlayedDate)}</span>
        </div>
      )}
    </section>
  );
}

// Format ISO/string date → Friendly (YYYY-MM-DD or locale)
function formatFriendlyDate(date) {
  if (!date) return "";
  // Accept timestamp, ISO or Date object
  try {
    const d =
      typeof date === "number"
        ? new Date(date)
        : typeof date === "string"
        ? new Date(date)
        : date;
    if (!isNaN(d)) {
      return d.toLocaleDateString(undefined, {
        year: "2-digit",
        month: "short",
        day: "2-digit",
      });
    }
    return "";
  } catch {
    return "";
  }
}

// Reset All Scores Button
function ScoreboardResetButton({ state, onReset, onCancel }) {
  return (
    <div className="sb-reset-row">
      {state === "confirm" ? (
        <span className="sb-reset-confirm">
          Reset all scores?{" "}
          <button
            type="button"
            className="sb-reset-btn dangerous"
            onClick={onReset}
          >
            Yes, Reset
          </button>
          <button
            type="button"
            className="sb-reset-btn"
            onClick={onCancel}
          >
            Cancel
          </button>
        </span>
      ) : state === "done" ? (
        <span className="sb-reset-done">Scores reset!</span>
      ) : (
        <button
          type="button"
          className="sb-reset-btn"
          onClick={onReset}
        >
          Reset All Scores
        </button>
      )}
    </div>
  );
}

export default ScoreboardPage;
