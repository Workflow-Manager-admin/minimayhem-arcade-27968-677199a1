import React from "react";
import "./LandingPage.css";

// Accent color for buttons etc
const ACCENT = "#4f46e5";

// Mini-game data for cards
const gameFeatures = [
  {
    name: "Memory Game",
    emoji: "🧠",
    desc: "Test your memory! Repeat challenging color, sound or number patterns to win.",
  },
  {
    name: "Reaction Speed",
    emoji: "⚡",
    desc: "How fast are you? Tap when you see the cue and race against the clock.",
  },
  {
    name: "Typing Challenge",
    emoji: "⌨️",
    desc: "Boost your typing skills. Type words & sentences fast and with precision!",
  },
  {
    name: "Quick Math",
    emoji: "➗",
    desc: "Mental math madness! Solve rapid-fire math questions before time's up.",
  },
  {
    name: "Random Fun",
    emoji: "🎲",
    desc: "Expect surprises! Fun & unpredictable minigames for laughs and variety.",
  },
];

// How to Play Steps
const howToSteps = [
  {
    title: "Pick a Game",
    icon: "🎮",
    desc: "Choose one of the five fun mini-games, each designed to challenge a different skill.",
  },
  {
    title: "Read Instructions",
    icon: "👀",
    desc: "Each game starts with quick instructions—so you know exactly how to play and score.",
  },
  {
    title: "Play & Score",
    icon: "🏆",
    desc: "Give it your best shot! Scores are saved locally. Can you top your personal best?",
  },
  {
    title: "Brag & Retry!",
    icon: "📈",
    desc: "Improve every time, show off to friends, and work your way up the leaderboard.",
  },
];

// PUBLIC_INTERFACE
function LandingPage() {
  return (
    <div className="mmarcade-landing-root">
      {/* Hero Section */}
      <section className="mmarcade-hero">
        <div className="hero-overlay"></div>
        <div className="hero-content">
          <span className="arcade-icon" aria-hidden="true">🎮</span>
          <h1 className="hero-title"><span className="color-accent">MiniMayhem</span> Arcade</h1>
          <p className="hero-tagline">
            The ultimate home for quick, fun, skill-testing mini-games.<br />
            <span className="fade">Memory, Speed, Typing, Math & more!</span>
          </p>
          <a href="/games" className="accent-btn large shadow hero-cta">Start Playing</a>
        </div>
      </section>

      {/* About section */}
      <section className="mmarcade-about-container">
        <div className="about-content">
          <h2 className="about-title">
            <span className="color-accent">Why</span> MiniMayhem Arcade?
          </h2>
          <p>
            <strong>MiniMayhem Arcade</strong> is a vibrant playground packed with addictive mini-games that challenge your mind, reflexes, and wit! Every session is fresh, and your high scores live right in your browser—no sign-ups, just pure fun. Compete with yourself or friends and see how far your skills can go. Ready to join the mayhem?
          </p>
        </div>
      </section>

      {/* Features / Cards for each game */}
      <section className="mmarcade-features" aria-labelledby="features-heading">
        <h2 className="features-heading" id="features-heading">
          <span className="color-accent">5</span> Unique Mini-Games
        </h2>
        <div className="feature-card-grid">
          {gameFeatures.map((game) => (
            <div className="feature-card" key={game.name}>
              <span className="feature-icon" aria-hidden="true">{game.emoji}</span>
              <h3 className="feature-title">{game.name}</h3>
              <p className="feature-desc">{game.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How To Play section */}
      <section className="mmarcade-howto">
        <h2 className="howto-title">How to Play</h2>
        <ul className="howto-steps" aria-label="How to play steps">
          {howToSteps.map((step, i) => (
            <li className="howto-step-card" key={step.title}>
              <div className="howto-icon">{step.icon}</div>
              <h3 className="howto-step-title">{step.title}</h3>
              <span className="howto-step-desc">{step.desc}</span>
              {i !== howToSteps.length - 1 && <span className="howto-arrow" aria-hidden="true">➔</span>}
            </li>
          ))}
        </ul>
      </section>

      {/* Footer */}
      <footer className="mmarcade-footer">
        <div>
          &copy; {new Date().getFullYear()} <span className="color-accent-2">MiniMayhem Arcade</span> ·
          <a href="/about" className="footer-link">About</a> ·
          <a href="/help" className="footer-link">Help</a>
        </div>
        <div className="footer-note">Made for fun · Scores are private on your device</div>
      </footer>
    </div>
  );
}

export default LandingPage;
