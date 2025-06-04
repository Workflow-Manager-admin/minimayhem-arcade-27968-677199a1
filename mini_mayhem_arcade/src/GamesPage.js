import React, { useEffect, useRef } from "react";
import "./GamesPage.css";
import Navbar from "./Navbar";
import { Link } from "react-router-dom";

/*
 * PUBLIC_INTERFACE
 * GamesPage: Arcade dashboard featuring mini-game cards, featured game, and score snapshot.
 * - Responsive grid, smooth fadeIn animation, light/dark theme support.
 * - Cards include icon, title, desc, 'Play Now', and optional tag.
 * - Can enable/disable featured/score widgets via flags below.
 */

const FEATURE_GAME_ENABLED = true;
const SCORE_SNAPSHOT_ENABLED = true;

/* --- GAMES array: add Snake Game (HARD) with /games/snake routing --- */
const GAMES = [
  {
    name: "Memory Game",
    icon: "🧠",
    tagline: "Sharpen your memory! Repeat sequences of colors, sounds, or patterns.",
    tag: "Classic",
    color: "#00B0E0",
    playPath: "/games/memory"
  },
  {
    name: "Reaction Speed",
    icon: "⚡",
    tagline: "How fast can you react? Tap the right moment, beat your record!",
    tag: "Fast",
    color: "#FACA15",
    playPath: "/games/reaction"
  },
  {
    name: "Typing Challenge",
    icon: "⌨️",
    tagline: "Type words quickly and accurately. Boost your typing power!",
    tag: "Skill",
    color: "#4F46E5",
    playPath: "/games/typing"
  },
  // --- Insert Snake Game Card Here ---
  {
    name: "Snake",
    icon: "🐍",
    tagline: "Classic arcade action! Guide the snake to eat food, avoid walls and your own tail. See how long you can survive and break your best score.",
    tag: "Arcade",
    color: "#23c738",
    playPath: "/games/snake"
  },
  {
    name: "Sudoku",
    icon: "🔢",
    tagline: "Fill the 9x9 grid so every row, column, and box has 1-9. Choose difficulty, undo, and beat your best time!",
    tag: "Puzzle",
    color: "#68adc4",
    playPath: "/games/sudoku"
  },
  {
    name: "Sliding Tile Puzzle",
    icon: "🔲",
    tagline: "Arrange the tiles in order by sliding them. Supports hard (5x5) and larger grids. Undo, restart—fewest moves and time wins!",
    tag: "Hard",
    color: "#68adc4",
    playPath: "/games/sliding-tile"
  }
];

// Make Sliding Tile Puzzle the featured game
const FEATURED_GAME = {
  name: "Sliding Tile Puzzle",
  icon: "🔲",
  desc:
    "Arrange all the tiles in order by sliding them into the empty space. Now includes 5x5 grid (hard)! Fewer moves and less time mean a better score. Restart, undo, change size, and race your best!",
  action: "/games/sliding-tile"
};

/**
 * Get local high scores for display in scoreboard widget.
 * Now includes Sliding Tile Puzzle best steps/time.
 * Adds Snake game with best and last run scores from localStorage.
 */
function getLocalHighScores() {
  let memoryGameScore = null;
  let reactionGameScore = null;
  let typingBestWpm = null;
  let sudokuBestTime = null;
  let slidingBestMoves = null;
  let slidingBestTime = null;
  let snakeBestScore = null;
  let snakeLastScore = null;

  if (typeof window !== "undefined") {
    try {
      const memScoreRaw = window.localStorage.getItem("mmarcade-memgame-lastscore");
      if (memScoreRaw) {
        const { moves, time } = JSON.parse(memScoreRaw);
        if (typeof moves === "number" && typeof time === "number") {
          memoryGameScore = { moves, time };
        }
      }
    } catch (e) { }
    try {
      const reactScoreRaw = window.localStorage.getItem("reactionGameScore");
      if (reactScoreRaw !== null && !isNaN(parseInt(reactScoreRaw, 10))) {
        reactionGameScore = parseInt(reactScoreRaw, 10);
      }
    } catch (e) { }
    try {
      const typingRaw = window.localStorage.getItem("mmarcade-typing-bestwpm");
      if (typingRaw !== null && !isNaN(parseFloat(typingRaw))) {
        typingBestWpm = Math.round(parseFloat(typingRaw) * 100) / 100;
      }
    } catch (e) { }
    try {
      const sudokuRaw = window.localStorage.getItem("sudokuBestTime");
      if (sudokuRaw !== null && !isNaN(parseInt(sudokuRaw, 10))) {
        sudokuBestTime = parseInt(sudokuRaw, 10);
      }
    } catch (e) {}
    try {
      const slidingMoves = window.localStorage.getItem("mmarcade-slidingtile-bestmoves");
      if (slidingMoves !== null && !isNaN(parseInt(slidingMoves, 10))) {
        slidingBestMoves = parseInt(slidingMoves, 10);
      }
    } catch (e) {}
    try {
      const slidingTime = window.localStorage.getItem("mmarcade-slidingtile-besttime");
      if (slidingTime !== null && !isNaN(parseInt(slidingTime, 10))) {
        slidingBestTime = parseInt(slidingTime, 10);
      }
    } catch (e) {}

    // Add Snake scores:
    try {
      // Best score for snake: "snakeGameBestScore"
      const sbest = window.localStorage.getItem("snakeGameBestScore");
      if (sbest !== null && !isNaN(parseInt(sbest, 10))) {
        snakeBestScore = parseInt(sbest, 10);
      }
    } catch (e) {}
    try {
      // Last run score for snake: "snakeGameLastScore"
      const slast = window.localStorage.getItem("snakeGameLastScore");
      if (slast !== null && !isNaN(parseInt(slast, 10))) {
        snakeLastScore = parseInt(slast, 10);
      }
    } catch (e) {}
  }

  let memoryDisplay;
  if (memoryGameScore) {
    const m = Math.floor(memoryGameScore.time / 60);
    const s = memoryGameScore.time % 60;
    const timeStr = `${m}:${s < 10 ? "0" : ""}${s}`;
    memoryDisplay = `${memoryGameScore.moves} moves, ${timeStr}`;
  } else {
    memoryDisplay = "No score yet";
  }

  let reactionDisplay;
  if (typeof reactionGameScore === "number" && !isNaN(reactionGameScore)) {
    if (reactionGameScore > 1200) {
      reactionDisplay = (reactionGameScore / 1000).toFixed(3) + "s";
    } else {
      reactionDisplay = reactionGameScore + " ms";
    }
  } else {
    reactionDisplay = "No score yet";
  }

  let typingDisplay;
  if (typeof typingBestWpm === "number" && !isNaN(typingBestWpm)) {
    typingDisplay = typingBestWpm;
  } else {
    typingDisplay = "No score yet";
  }

  // --- Snake Game Score Displays ---
  let snakeDisplayBest = (typeof snakeBestScore === "number" && !isNaN(snakeBestScore))
    ? `${snakeBestScore}`
    : "No best yet";
  let snakeDisplayLast = (typeof snakeLastScore === "number" && !isNaN(snakeLastScore))
    ? `${snakeLastScore}`
    : "No recent run";

  let sudokuDisplay;
  if (typeof sudokuBestTime === "number" && !isNaN(sudokuBestTime)) {
    const m = Math.floor(sudokuBestTime / 60);
    const s = sudokuBestTime % 60;
    sudokuDisplay = `${m}:${s < 10 ? "0" : ""}${s}`;
  } else {
    sudokuDisplay = "No score yet";
  }

  let slidingDisplay = (typeof slidingBestMoves === "number" && typeof slidingBestTime === "number")
    ? `${slidingBestMoves} moves, ${Math.floor(slidingBestTime / 60)}:${(slidingBestTime % 60).toString().padStart(2, "0")}`
    : "No win yet";

  // Score snapshot with best & last for Snake
  return [
    { game: "Memory Game", score: memoryDisplay },
    { game: "Reaction Speed", score: reactionDisplay },
    { game: "Typing Challenge", score: typingDisplay },
    { game: "Snake – Best", score: snakeDisplayBest },
    { game: "Snake – Last Run", score: snakeDisplayLast },
    { game: "Sliding Tile Puzzle", score: slidingDisplay },
    { game: "Sudoku", score: sudokuDisplay }
  ];
}

// PUBLIC_INTERFACE
function GamesPage() {
  // Animation: fade in grid on mount
  const gridRef = useRef();
  useEffect(() => {
    if (gridRef.current) {
      gridRef.current.classList.add("fade-in");
    }
  }, []);
  return (
    <div className="games-page-root">
      <main className="games-main-content">
        {FEATURE_GAME_ENABLED && (
          <FeaturedGameBanner game={FEATURED_GAME} />
        )}

        <section className="games-page-header" aria-label="Games arcade title">
          <h1 className="games-title">
            <span role="img" aria-label="Arcade">🕹️</span> Mini Game Arcade
          </h1>
          <p className="games-subtitle">
            Challenge yourself with fun mini-games. Practice, play, and beat your best!
          </p>
        </section>

        {SCORE_SNAPSHOT_ENABLED && (
          <ScoreSnapshot scores={getLocalHighScores()} />
        )}

        <section className="games-card-gallery-section" aria-labelledby="games-gallery-title">
          <h2 className="sr-only" id="games-gallery-title">Available Mini-Games</h2>
          <div className="games-card-grid" ref={gridRef}>
            {GAMES.map((g, i) => {
              let playPath = g.playPath || `/games/${slugify(g.name)}`;
              return (
                <GameCard
                  key={g.name}
                  icon={g.icon}
                  title={g.name}
                  desc={g.tagline}
                  color={g.color}
                  tag={g.tag}
                  playPath={playPath}
                  style={{ animationDelay: (0.08 * i) + "s" }}
                />
              );
            })}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

// --- Subcomponents ---

// PUBLIC_INTERFACE
function FeaturedGameBanner({ game }) {
  return (
    <aside className="featured-game-banner">
      <div className="featured-badge">🌟 Game of the Day</div>
      <div className="featured-game-content">
        <div className="featured-icon" aria-hidden="true">{game.icon}</div>
        <div className="featured-text-area">
          <div className="featured-title">{game.name}</div>
          <div className="featured-desc">{game.desc}</div>
        </div>
        {game.action && game.action.startsWith("/")
          ? (
            <Link
              to={game.action}
              className="featured-play-btn"
              aria-label={`Play ${game.name}`}
            >
              Play Now
            </Link>
          ) : (
            <a
              href={game.action}
              className="featured-play-btn"
              aria-label={`Play ${game.name}`}
            >
              Play Now
            </a>
          )
        }
      </div>
    </aside>
  );
}

// PUBLIC_INTERFACE
function ScoreSnapshot({ scores }) {
  if (!scores || !scores.length) return null;
  return (
    <section className="score-snapshot-widget" aria-label="Score snapshot">
      <div className="score-snap-title" aria-hidden="true">
        <span role="img" aria-label="trophy">🏆</span> Recent High Scores
      </div>
      <ul className="score-snap-list">
        {scores.map((s, i) => (
          <li className="score-snap-row" key={s.game}>
            <span className="score-snap-game">{s.game}</span>
            <span className="score-snap-score">{s.score}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

// PUBLIC_INTERFACE
function GameCard({ icon, title, desc, color, tag, playPath, style }) {
  return (
    <article className="games-card" style={style} tabIndex={0}>
      <span className="game-icon" aria-hidden="true" style={color ? {
        textShadow: `0 2px 10px ${color}77`
      } : {}}>
        {icon}
      </span>
      <div className="game-card-title-row">
        <span className="game-title">{title}</span>
        {tag && <span className="game-tag">{tag}</span>}
      </div>
      <span className="game-desc">{desc}</span>
      <Link
        to={playPath}
        className="game-play-btn"
        tabIndex={0}
        aria-label={`Play ${title}`}
      >
        Play Now
      </Link>
    </article>
  );
}

function Footer() {
  return (
    <footer className="arcade-footer">
      <div>
        &copy; {new Date().getFullYear()} <span className="footer-logo color-accent">MiniMayhem Arcade</span> ·
        <a href="/about" className="footer-link">About</a> ·
        <a href="/help" className="footer-link">Help</a>
      </div>
      <div className="footer-note">High scores stay on your device · Enjoy and improve!</div>
    </footer>
  );
}

// Util: Make link slug for game path
function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export default GamesPage;
