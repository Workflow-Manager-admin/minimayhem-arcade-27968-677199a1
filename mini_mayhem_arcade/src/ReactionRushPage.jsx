import React, { useState, useRef, useEffect } from "react";
import "./ReactionRushPage.css";
import { useNavigate } from "react-router-dom";

/**
 * PUBLIC_INTERFACE
 * ReactionRushPage - Play a Reaction Speed game: click/tap as fast as possible when screen flashes.
 */
function ReactionRushPage() {
  const [gameState, setGameState] = useState("init"); // init | waiting | ready | result
  const [waitTime, setWaitTime] = useState(0);
  const [startTime, setStartTime] = useState(null);
  const [reactionTime, setReactionTime] = useState(null);
  const [tooSoon, setTooSoon] = useState(false);
  const [lastScore, setLastScore] = useState(null);

  const timeoutRef = useRef(null);
  const navigate = useNavigate();

  // On mount, get last result from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const last = window.localStorage.getItem("reaction_time_last");
      if (last && !isNaN(parseInt(last, 10))) setLastScore(parseInt(last, 10));
    }
  }, []);

  // Start game: wait random period, then turn "ready"
  function beginGame() {
    setGameState("waiting");
    setTooSoon(false);
    const min = 1600, max = 3400; // 1.6s to 3.4s
    const ms = Math.floor(Math.random() * (max - min)) + min;
    setWaitTime(ms);
    timeoutRef.current = setTimeout(() => {
      setStartTime(performance.now());
      setGameState("ready");
    }, ms);
  }

  // User clicks too soon
  function onPrematureClick() {
    clearTimeout(timeoutRef.current);
    setTooSoon(true);
    setGameState("init");
  }

  // User reacts (ideal case)
  function onReact() {
    if (gameState === "ready" && startTime) {
      const rt = Math.round(performance.now() - startTime);
      setReactionTime(rt);
      setGameState("result");
      setLastScore(rt);
      // Store in localStorage for leaderboard/snapshot
      try {
        if (typeof window !== "undefined") {
          window.localStorage.setItem("reaction_time_last", rt);
        }
      } catch (e) { /* silent fail */ }
    }
  }

  // Reset for replay
  function resetGame() {
    setGameState("init");
    setReactionTime(null);
    setTooSoon(false);
    setWaitTime(0);
    setStartTime(null);
    // Does not clear lastScore
  }

  // Accessibility: Allow Space/Enter to act as click on main zone
  function keyHandler(e) {
    if (gameState === "init" && (e.key === " " || e.key === "Enter")) {
      beginGame();
    }
    if (gameState === "waiting" && (e.key === " " || e.key === "Enter")) {
      onPrematureClick();
    }
    if (gameState === "ready" && (e.key === " " || e.key === "Enter")) {
      onReact();
    }
    if (gameState === "result" && (e.key === " " || e.key === "Enter")) {
      resetGame();
    }
  }
  useEffect(() => {
    window.addEventListener("keydown", keyHandler);
    return () => window.removeEventListener("keydown", keyHandler);
    // eslint-disable-next-line
  }, [gameState, startTime]);

  // Remove timer if unmounted or on replay
  useEffect(() => () => clearTimeout(timeoutRef.current), []);

  // Theme for page: determines color for game box
  const getGameZoneClass = () => {
    if (gameState === "init") return "zone-init";
    if (gameState === "result") return "zone-result";
    if (gameState === "waiting") return "zone-waiting";
    if (gameState === "ready") return "zone-ready";
    return "";
  };

  function formatMs(ms) {
    if (ms == null) return "--";
    if (ms > 1200) return `${(ms / 1000).toFixed(3)}s`;
    return ms + " ms";
  }

  return (
    <div className="rrush-root">
      {/* Decorative blurs */}
      <div className="rrush-bg-shape1"></div>
      <div className="rrush-bg-shape2"></div>
      <section className="rrush-main-content">
        <header className="rrush-header">
          <h2 className="rrush-title">
            <span className="rrush-icon" role="img" aria-label="Lightning Bolt">⚡</span>
            Reaction Rush
          </h2>
          <div className="rrush-desc">Test your reflexes! When the color flashes, hit anywhere as quickly as you can. Lowest time wins.</div>
        </header>
        <div
          className={`rrush-game-zone ${getGameZoneClass()}`}
          role="button"
          aria-label={
            gameState === "init" ? "Start the Reaction Rush game"
              : gameState === "waiting" ? "Get ready. Wait for color change"
              : gameState === "ready" ? "React now! Tap or press space"
              : gameState === "result" ? "Game finished. Press for new round"
              : ""
          }
          tabIndex={0}
          onClick={() => {
            if (gameState === "init") beginGame();
            else if (gameState === "waiting") onPrematureClick();
            else if (gameState === "ready") onReact();
            else if (gameState === "result") resetGame();
          }}
        >
          {/* Game zone messages */}
          {(() => {
            if (gameState === "init")
              return (
                <div className="rrush-center-stack">
                  <div className="rrush-main-msg">Ready?</div>
                  <button className="rrush-btn" tabIndex={0}>Start</button>
                  {lastScore !== null && (
                    <div className="rrush-lastscore">
                      Last: <span className="val">{formatMs(lastScore)}</span>
                    </div>
                  )}
                </div>
              );
            if (gameState === "waiting")
              return (
                <div className="rrush-center-stack">
                  <div className="rrush-main-msg">Wait for it...</div>
                  <div className="rrush-tip">Tap <span role="img" aria-label="hand">✋</span> <b>when it flashes!</b></div>
                  <div className="rrush-tip small">(Don&apos;t click early!)</div>
                </div>
              );
            if (gameState === "ready")
              return (
                <div className="rrush-center-stack">
                  <div className="rrush-main-msg now">NOW!</div>
                  <div className="rrush-tip">Tap! <span role="img" aria-label="scroll">👆</span></div>
                </div>
              );
            if (gameState === "result")
              return (
                <div className="rrush-center-stack">
                  <div className="rrush-main-msg result-title">
                    {tooSoon
                      ? "Too Soon! 😬"
                      : "Your Time:"
                    }
                  </div>
                  <div className="rrush-result">
                    {tooSoon
                      ? <span className="rrush-bad">Don't click before it flashes!</span>
                      : <span className="rrush-ms">{formatMs(reactionTime)}</span>
                    }
                  </div>
                  {/* PERFORMANCE MESSAGE */}
                  {!tooSoon && typeof reactionTime === "number" && (
                    <div className="rrush-tip" style={{ marginBottom: "8px" }}>
                      {reactionTime < 150
                        ? "Lightning Reflexes!"
                        : reactionTime <= 300
                          ? "Good!"
                          : "Too Slow!"
                      }
                    </div>
                  )}
                  <button className="rrush-btn" tabIndex={0}>Play Again</button>
                  {lastScore !== null && !tooSoon && (
                    <div className="rrush-lastscore">
                      Last: <span className="val">{formatMs(lastScore)}</span>
                    </div>
                  )}
                </div>
              );
            return null;
          })()}
        </div>
        {/* Bottom controls */}
        <div className="rrush-footer-row">
          <button
            className="rrush-nav-btn"
            onClick={() => navigate("/games")}
            aria-label="Back to Games"
            tabIndex={0}
          >
            ← Back to Games
          </button>
        </div>
      </section>
    </div>
  );
}

export default ReactionRushPage;
