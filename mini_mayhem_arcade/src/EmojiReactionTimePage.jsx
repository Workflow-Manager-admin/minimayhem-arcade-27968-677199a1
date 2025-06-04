import React, { useEffect, useRef, useState } from "react";
import "./EmojiReactionTimePage.css";
import { useNavigate } from "react-router-dom";

/**
 * PUBLIC_INTERFACE
 * EmojiReactionTimePage - Playful emoji-based reaction time game.
 * - Random target emoji each round
 * - Background: random playful gradient
 * - Cycle through emoji pool every 1s
 * - Click when target shows, measure reaction time, store to localStorage
 * - Random feedback message on result
 */

const EMOJI_POOL = [
  "😀", "😎", "😂", "🤩", "🦄", "🍕", "🚀", "🎉", "🐱", "🐶",
  "🌈", "⚡", "🎮", "👾", "🥑", "🍉", "🦖", "🌟"
];

const BG_GRADIENTS = [
  "linear-gradient(120deg, #a8edea 0%, #fed6e3 100%)",
  "linear-gradient(66deg, #f5d6e6 0%, #c3cfe2 100%)",
  "linear-gradient(99deg, #fbc2eb 0%, #a6c1ee 100%)",
  "linear-gradient(101deg, #fccb90 0%, #d57eea 100%)",
  "linear-gradient(60deg, #e0c3fc 0%, #8ec5fc 100%)",
  "linear-gradient(107deg, #f7971e 0%, #ffd200 100%)",
  "linear-gradient(121deg, #89f7fe 0%, #66a6ff 100%)",
  "linear-gradient(108deg, #fff1eb 0%, #ace0f9 100%)",
  "linear-gradient(120deg, #f6d365 0%, #fda085 100%)"
];

const FEEDBACK = [
  "🔥 Awesome!", "😮 Lightning Speed!", "👏 Fast!", "🕹️ Nice Try!",
  "😄 Great click!", "💪 Try Again!", "🏆 Reflex Master!", "🌟 Quick Fingers!",
  "🤓 Focused!", "😊 Fun!", "🐰 Bunny Fast!", "🎯 On Target!"
];

// Save and retrieve in localStorage under a unique key (for GamesPage)
const LS_KEY = "mmarcade-emoji-reaction-best";

// Helper for sound/vibe (optional: not required by assignment)
// function playSuccessSound() { /* ... */ }

// PUBLIC_INTERFACE
function EmojiReactionTimePage() {
  const [targetEmoji, setTargetEmoji] = useState(null);
  const [currentEmoji, setCurrentEmoji] = useState(null);
  const [cycling, setCycling] = useState(true);
  const [started, setStarted] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [reactionTime, setReactionTime] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [bg, setBg] = useState("");
  const [bestScore, setBestScore] = useState(null);
  const [waitingRestart, setWaitingRestart] = useState(false);

  const intervalRef = useRef();
  const navigate = useNavigate();

  // On mount: choose target, random background, load best reaction time if present
  useEffect(() => {
    // Pick target & bg
    resetGame();
    // Load previous
    if (typeof window !== "undefined") {
      const prev = window.localStorage.getItem(LS_KEY);
      if (prev && !isNaN(parseInt(prev, 10))) {
        setBestScore(parseInt(prev, 10));
      }
    }
    // eslint-disable-next-line
  }, []);

  // Emojis cycle every 1s randomly
  useEffect(() => {
    if (!cycling) {
      clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => {
      // Randomly select new, avoid picking the same as just before
      setCurrentEmoji(prev => {
        let pool = EMOJI_POOL.slice();
        if (prev) pool = pool.filter(e => e !== prev);
        return pool[Math.floor(Math.random() * pool.length)];
      });
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [cycling]);

  // When ready to start after setup, begin at first cycle
  function handleStart() {
    setStarted(true);
    setCycling(true);
    setShowResult(false);
    setReactionTime(null);
    setWaitingRestart(false);
    setFeedback("");
    setStartTime(null);
    // Ensure initial emoji is not equal to starting target
    let first;
    do { first = EMOJI_POOL[Math.floor(Math.random() * EMOJI_POOL.length)]; }
    while (first === targetEmoji);
    setCurrentEmoji(first);
  }

  // When the emoji cycles to the target, begin measuring time
  useEffect(() => {
    if (!started || !cycling) return;
    // If current matches target, set start time (fresh each appearance)
    if (currentEmoji && currentEmoji === targetEmoji) {
      setStartTime(performance.now());
    } else {
      setStartTime(null);
    }
    // eslint-disable-next-line
  }, [currentEmoji, targetEmoji, started, cycling]);

  // When user clicks
  function handleEmojiClick() {
    if (!started || !cycling || showResult || waitingRestart) return;
    if (currentEmoji === targetEmoji) {
      // RIGHT: measure time since current emoji cycle started
      setCycling(false);
      if (startTime) {
        const rt = Math.round(performance.now() - startTime);
        setReactionTime(rt);
        setShowResult(true);
        setFeedback(randomFeedback(rt));
        maybeSaveBest(rt);
      } else {
        // Defensive: fallback to 1s (shouldn't happen)
        setReactionTime(1000);
        setShowResult(true);
        setFeedback("Whoops, try again!");
      }
      setWaitingRestart(true);
    } else {
      // Wrong: feedback only + small timeout, but keep cycling
      setFeedback("⛔ Wrong emoji! Wait for the target.");
      setTimeout(() => setFeedback(""), 880);
    }
  }

  // Feedback message
  function randomFeedback(rt) {
    if (!rt || isNaN(rt)) return FEEDBACK[Math.floor(Math.random() * FEEDBACK.length)];
    if (rt < 220) return "🚀 Blazing!";
    if (rt < 400) return "🌟 Great!";
    if (rt < 650) return "✨ Solid!";
    return FEEDBACK[Math.floor(Math.random() * FEEDBACK.length)];
  }

  // Save best to localStorage if improved, and update GamesPage use
  function maybeSaveBest(rt) {
    if (typeof window === "undefined" || !rt) return;
    try {
      let prev = window.localStorage.getItem(LS_KEY);
      let save = false;
      if (!prev || isNaN(parseInt(prev, 10)) || rt < parseInt(prev, 10)) {
        save = true;
      }
      if (save) {
        window.localStorage.setItem(LS_KEY, rt);
        setBestScore(rt);
      }
      // Also, update GamesPage snapshot (for snapshot widget: use key 'emojiReactionGameScore')
      window.localStorage.setItem("emojiReactionGameScore", rt);
    } catch (e) { /* silent fail */ }
  }

  // Format ms to '345 ms' or '1.004s' for larger times
  function fmtMs(ms) {
    if (typeof ms !== "number" || isNaN(ms)) return "--";
    if (ms > 1200) return (ms / 1000).toFixed(3) + "s";
    return ms + " ms";
  }

  // Reset everything for a whole new round (including new target & bg)
  function resetGame() {
    setCycling(false);
    setStarted(false);
    setShowResult(false);
    setReactionTime(null);
    setWaitingRestart(false);
    setFeedback("");
    setStartTime(null);
    setTargetEmoji(EMOJI_POOL[Math.floor(Math.random() * EMOJI_POOL.length)]);
    setBg(BG_GRADIENTS[Math.floor(Math.random() * BG_GRADIENTS.length)]);
    setCurrentEmoji(null);
    // setTimeout ensures fresh re-render for quick back-to-back replays
    setTimeout(() => { setStarted(false); }, 10);
  }

  // Accessibility: keyboard events (space/enter = tap)
  function handleKeyDown(e) {
    if (waitingRestart && (e.key === " " || e.key === "Enter")) {
      resetGame();
      setTimeout(() => {
        handleStart();
      }, 330);
    } else if (!started && (e.key === " " || e.key === "Enter")) {
      handleStart();
    } else if (started && !showResult && (e.key === " " || e.key === "Enter")) {
      handleEmojiClick();
    }
  }
  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line
  }, [started, showResult, waitingRestart, currentEmoji, targetEmoji]);

  // Main render
  return (
    <div
      className="emoji-react-root"
      style={{ background: bg, minHeight: "100vh" }}
      data-theme-root
    >
      <div className="erx-deco-bg_1"></div>
      <div className="erx-deco-bg_2"></div>
      <main className="emoji-react-main">
        <header className="erx-header">
          <h2 className="erx-title">
            <span className="erx-icon" role="img" aria-label="emoji">😀</span> Emoji Reaction Time
          </h2>
          <div className="erx-desc">
            Click/tap <b>the moment the target emoji appears</b>! Each round is a new emoji and faster is better.<br />
            <span style={{ fontSize: "1.05em", color: "#68adc4" }}>
              Target: <span className="erx-target-emoji" aria-label="target emoji">{targetEmoji}</span>
            </span>
          </div>
        </header>
        <div className="erx-game-area">
          {!started ? (
            <button className="erx-start-btn" onClick={handleStart} tabIndex={0}>
              <span role="img" aria-label="Start">🚦</span> Start
            </button>
          ) : (
            <>
              {/* Emoji cycling */}
              <button
                className={`erx-emoji-btn${(currentEmoji === targetEmoji) ? " erx--target" : ""}`}
                onClick={handleEmojiClick}
                tabIndex={0}
                aria-label={
                  currentEmoji === targetEmoji
                    ? "Click! Target emoji!"
                    : "Emoji, wait for target"
                }
                disabled={showResult}
              >
                <span className="erx-cycling-emoji" style={{ fontSize: "4.1rem" }} aria-live="polite">
                  {currentEmoji}
                </span>
              </button>
              <div className="erx-cycle-caption">
                {currentEmoji === targetEmoji
                  ? "NOW! That's your target!"
                  : "Keep watching..."}
              </div>
            </>
          )}

          {/* End of round/result box */}
          {showResult &&
            <div className="erx-result-box" role="status" aria-live="assertive">
              <span className="erx-res-title">
                {feedback || "Result"}
              </span>
              <br />
              <span className="erx-res-time">
                {fmtMs(reactionTime)}
              </span>
              <br />
              <span className="erx-res-action">
                <button className="erx-restart-btn" onClick={() => { resetGame(); setTimeout(handleStart, 380); }} tabIndex={0}>↻ Play Again</button>
              </span>
              {typeof bestScore === "number" && (
                <div className="erx-best-score-row">
                  <span className="erx-best-label">Your best:</span> <span className="erx-best-score">{fmtMs(bestScore)}</span>
                </div>
              )}
            </div>
          }
          {/* Feedback display (for quick error) */}
          {!!feedback && !showResult &&
            <div className="erx-feedback-msg" aria-live="polite">{feedback}</div>
          }
        </div>
        {/* Return/back (bottom) */}
        <button
          className="erx-back-btn"
          onClick={() => navigate("/games")}
          tabIndex={0}
        >
          ← Back to Games
        </button>
      </main>
    </div>
  );
}

export default EmojiReactionTimePage;
