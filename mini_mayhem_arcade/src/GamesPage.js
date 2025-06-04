import React, { useEffect, useRef } from "react";
import "./GamesPage.css";
import Navbar from "./Navbar";
import { Link } from "react-router-dom";

/*
 * PUBLIC_INTERFACE
 * GamesPage: Arcade dashboard featuring mini-game cards, featured game, and score snapshot.
 * - Responsive grid, smooth fadeIn animation, light/dark theme support.
 * - Cards include icon, title, desc, 'Play Now', and optional tag.
 * - Featured and score widgets can be toggled via flags.
 */

const FEATURE_GAME_ENABLED = true;
const SCORE_SNAPSHOT_ENABLED = true;

/*
 * All Shadow Runner references have been removed.
 * The GAMES array has no Shadow Runner entry, and all logic related to
 * Shadow Runner for cards, score snapshot, or navigation has been removed.
 */
const GAMES = [
  {
    name: "Block Game",
    icon: "🔷",
    tagline: "Fit random neon blocks onto a 10x10 grid. Clear rows or columns for big points! Relaxed block puzzle fun.",
    tag: "New!",
    color: "#00FFD7",
    playPath: "/games/block"
  },
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
    name: "Word Typing Challenge",
    icon: "📝",
    tagline: "Type as many words as you can—speed and accuracy matter! Great for practicing typing.",
    tag: "New!",
    color: "#fb6379",
    playPath: "/games/typing-challenge"
  },
  {
    name: "Light Beam Puzzle",
    icon: "🔦",
    tagline: "Bend the light! Rotate mirrors to guide a laser beam to the receiver. Animated glow, logic, & reflection fun.",
    tag: "NEW",
    color: "#4fd8ff",
    playPath: "/games/light-beam"
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

// Featured Game stays as before; update for future if Light Beam Puzzle is featured.
const FEATURED_GAME = {
  name: "Sliding Tile Puzzle",
  icon: "🔲",
  desc: "Arrange all the tiles in order by sliding them into the empty space. Now includes 5x5 grid (hard)! Fewer moves and less time mean a better score. Restart, undo, change size, and race your best!",
  action: "/games/sliding-tile"
};

/** 
 * Get local high scores for display in scoreboard widget.
 * Shadow Runner completely removed.
 */
function getLocalHighScores() {
  let blockHighScore = null;
  let memoryGameScore = null;
  let reactionGameScore = null;
  let typingBestWpm = null;
  let typingWordChallengeBest = null;
  let sudokuBestTime = null;
  let slidingBestMoves = null;
  let slidingBestTime = null;
  let lightBeamBestScore = null;

  if (typeof window !== "undefined") {
    try {
      const blockScoreRaw = window.localStorage.getItem("mmarcade-blockgame-bestscore");
      if (blockScoreRaw !== null && !isNaN(parseInt(blockScoreRaw, 10))) {
        blockHighScore = parseInt(blockScoreRaw, 10);
      }
    } catch (e) { }
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
    // Word Typing Challenge: Best score
    try {
      const typingChallengeRaw = window.localStorage.getItem("mmarcade-word-typing-bestscore");
      if (typingChallengeRaw !== null && !isNaN(parseInt(typingChallengeRaw, 10))) {
        typingWordChallengeBest = parseInt(typingChallengeRaw, 10);
      }
    } catch (e) { }
    try {
      const sudokuRaw = window.localStorage.getItem("sudokuBestTime");
      if (sudokuRaw !== null && !isNaN(parseInt(sudokuRaw, 10))) {
        sudokuBestTime = parseInt(sudokuRaw, 10);
      }
    } catch (e) {}
    try {
      const slidingBestRaw = window.localStorage.getItem("mmarcade-slidingtile-best-4");
      if (slidingBestRaw) {
        const { moves, time } = JSON.parse(slidingBestRaw);
        if (typeof moves === "number" && typeof time === "number") {
          slidingBestMoves = moves;
          slidingBestTime = time;
        }
      }
    } catch (e) {}
    // Light Beam Puzzle: best score (lower is better, e.g., # moves or time)
    try {
      const lightScoreRaw = window.localStorage.getItem("mmarcade-lightbeam-bestscore");
      if (lightScoreRaw && !isNaN(parseInt(lightScoreRaw, 10))) {
        lightBeamBestScore = parseInt(lightScoreRaw, 10);
      }
    } catch (e) { }
  }

  let blockDisplay = (typeof blockHighScore === "number" && !isNaN(blockHighScore))
    ? blockHighScore
    : "No score yet";

  let memoryDisplay = memoryGameScore
    ? (() => {
        const m = Math.floor(memoryGameScore.time / 60);
        const s = memoryGameScore.time % 60;
        const timeStr = `${m}:${s < 10 ? "0" : ""}${s}`;
        return `${memoryGameScore.moves} moves, ${timeStr}`;
      })()
    : "No score yet";

  let reactionDisplay = (typeof reactionGameScore === "number" && !isNaN(reactionGameScore))
    ? (reactionGameScore > 1200
      ? (reactionGameScore / 1000).toFixed(3) + "s"
      : reactionGameScore + " ms")
    : "No score yet";

  let typingChallengeDisplay =
    typeof typingWordChallengeBest === "number" && !isNaN(typingWordChallengeBest)
      ? `${typingWordChallengeBest} pts`
      : "No score yet";

  let lightBeamDisplay =
    typeof lightBeamBestScore === "number" && !isNaN(lightBeamBestScore)
      ? `${lightBeamBestScore} best`
      : "No win yet";

  let sudokuDisplay = (typeof sudokuBestTime === "number" && !isNaN(sudokuBestTime))
    ? (() => {
        const m = Math.floor(sudokuBestTime / 60);
        const s = sudokuBestTime % 60;
        return `${m}:${s < 10 ? "0" : ""}${s}`;
      })()
    : "No score yet";

  let slidingDisplay =
    typeof slidingBestMoves === "number" && typeof slidingBestTime === "number"
      ? `${slidingBestMoves} moves, ${Math.floor(slidingBestTime / 60)}:${(slidingBestTime % 60).toString().padStart(2, "0")}`
      : "No win yet";

  return [
    { game: "Block Game", score: blockDisplay },
    { game: "Memory Game", score: memoryDisplay },
    { game: "Reaction Speed", score: reactionDisplay },
    { game: "Word Typing Challenge", score: typingChallengeDisplay },
    { game: "Light Beam Puzzle", score: lightBeamDisplay },
    { game: "Sliding Tile Puzzle", score: slidingDisplay },
    { game: "Sudoku", score: sudokuDisplay }
  ];
}

/*
 * Main GamesPage implementation
 */
function GamesPage() {
  // Animation: fade in grid on mount
  const gridRef = useRef();
  useEffect(() => {
    if (gridRef.current) {
      gridRef.current.classList.add("fade-in");
    }
  }, []);

  // Ready for Light Beam Puzzle; all navigation and playPath logic is standard (no Shadow Runner exceptions).
  return (
    <div className="games-page-root">
      <main className="games-main-content">
        {FEATURE_GAME_ENABLED && (
          <FeaturedGameBanner
            game={FEATURED_GAME}
          />
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
            {GAMES.map((g, i) => (
              <GameCard
                key={g.name}
                icon={g.icon}
                title={g.name}
                desc={g.tagline}
                color={g.color}
                tag={g.tag}
                playPath={g.playPath || `/games/${slugify(g.name)}`}
                style={{ animationDelay: (0.08 * i) + "s" }}
              />
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

// --- Subcomponents ---

/**
 * PUBLIC_INTERFACE
 * FeaturedGameBanner: Banner for the featured or "game of the day".
 * Ensures all navigation ("Play Now") is done with <Link> for client-side routing.
 */
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
        {game.action && game.action.startsWith("/") ? (
          <Link
            to={game.action}
            className="featured-play-btn"
            aria-label={`Play ${game.name}`}
          >
            Play Now
          </Link>
        ) : null}
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
