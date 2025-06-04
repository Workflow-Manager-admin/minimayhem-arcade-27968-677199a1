import React, { useEffect, useRef, useState } from "react";
import "./WordTypingChallengePage.css";
import { useNavigate } from "react-router-dom";

// ======== SENTENCE BANK ========
const SENTENCES = [
  "Brightly colored parrots squawked loudly in the rainforest.",
  "The mysterious door creaked open in the moonlit hallway.",
  "To master typing, practice with speed but also precision.",
  "She solved the puzzle using only her sharp intuition.",
  "Friendly robots danced and beeped at the science fair.",
  "A drizzle sparkled on the glass as morning arrived.",
  "Jumping monkeys startled the explorers near the river.",
  "Reading often strengthens vocabulary and sharpens the mind.",
  "Majestic mountains peaked above the swirling, misty clouds.",
  "The quickest foxes dart under silent, starry skies.",
];

// Settings
const ROUND_COUNT = 5;
const INITIAL_TIMER = 15; // seconds per sentence
const STORAGE_PREFIX = "mmarcade-wordtyping-";
const THEME_KEY = "mmarcade-theme";

// Score breakdown
const BASE_SCORE = 100;
const PERFECT_BONUS = 100;
const FAST_BONUS = 60;
const TYPOS_PENALTY = 30;
// Scoreboard keys
const BEST_SCORE_KEY = STORAGE_PREFIX + "bestscore";
const BEST_STREAK_KEY = STORAGE_PREFIX + "beststreak";

function getTheme() {
  if (typeof window === "undefined") return "light";
  const theme =
    window.localStorage.getItem(THEME_KEY) ||
    (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  return theme;
}

// PUBLIC_INTERFACE
/**
 * Word Typing Challenge: multi-round, random-sentence typing game.
 * - Timed rounds. Final score = composite (speed, typos, perfects).
 * - Error-highlighting, animated feedback, accessible by keyboard and screen reader.
 * - Scoreboard with localStorage bests, streaks, and a theme switch.
 */
function WordTypingChallengePage() {
  const [theme, setTheme] = useState(getTheme());
  const [playing, setPlaying] = useState(false);
  const [sentences, setSentences] = useState([]);
  const [round, setRound] = useState(0);
  const [timer, setTimer] = useState(INITIAL_TIMER);
  const [userInput, setUserInput] = useState("");
  const [feedback, setFeedback] = useState(null); // e.g. { status: "perfect", msg }
  const [score, setScore] = useState(0);
  const [typoCount, setTypoCount] = useState(0);
  const [perfectStreak, setPerfectStreak] = useState(0);
  const [roundScores, setRoundScores] = useState([]);
  const [totalPerfect, setTotalPerfect] = useState(0);

  // For local bests/streak
  const [bestScore, setBestScore] = useState(
    Number(window.localStorage.getItem(BEST_SCORE_KEY)) || 0
  );
  const [bestStreak, setBestStreak] = useState(
    Number(window.localStorage.getItem(BEST_STREAK_KEY)) || 0
  );

  const [scoreboardOpen, setScoreboardOpen] = useState(false);

  const [tooltip, setTooltip] = useState("");
  const [gameOver, setGameOver] = useState(false);

  const timerRef = useRef();
  const inputRef = useRef();
  const navigate = useNavigate();

  // Focus management: always focus input on new round
  useEffect(() => {
    if (playing && inputRef.current) inputRef.current.focus();
  }, [round, playing]);

  // Timer handling per round
  useEffect(() => {
    if (!playing || gameOver) return;
    if (timer <= 0) {
      handleTimeout();
      return;
    }
    timerRef.current = setTimeout(() => setTimer(timer - 1), 1000);
    return () => clearTimeout(timerRef.current);
    // eslint-disable-next-line
  }, [timer, playing, gameOver]);

  // Theme application
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    window.localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  // New game init
  function startGame() {
    // Fresh unique random sentences
    let available = [...SENTENCES].sort(() => Math.random() - 0.5);
    if (available.length >= ROUND_COUNT) {
      available = available.slice(0, ROUND_COUNT);
    }
    setSentences(available);
    setRound(0);
    setScore(0);
    setFeedback(null);
    setTimer(INITIAL_TIMER);
    setUserInput("");
    setTypoCount(0);
    setPerfectStreak(0);
    setRoundScores([]);
    setTotalPerfect(0);
    setGameOver(false);
    setTooltip("");
    setPlaying(true);
  }

  function handleInputChange(e) {
    let val = e.target.value;
    // Do not allow input longer than sentence
    if (val.length > currentSentence().length) return;
    setUserInput(val);

    // Optional: Live preview typo highlight (accessible variant)
    if (val.length > 0) {
      let caret = val.length - 1;
      if (val[caret] !== currentSentence()[caret]) {
        setTooltip("Typo detected!");
        setTimeout(() => setTooltip(""), 900);
      }
    }
  }

  function handleKeyDown(e) {
    // Enter: check/submit
    if (e.key === "Enter" && playing && !gameOver) {
      handleSubmit();
    }
  }

  function currentSentence() {
    return sentences[round] || "";
  }

  function handleSubmit() {
    if (gameOver || !playing) return;

    const toType = currentSentence();
    const trimmed = userInput.trimEnd();
    const timeUsed = INITIAL_TIMER - timer;
    let typos = 0;
    for (let i = 0; i < toType.length; ++i) {
      if ((trimmed[i] || "") !== (toType[i] || "")) typos++;
    }
    setTypoCount(typos);

    let roundScore = BASE_SCORE;
    let isPerfect = false, isHighSpeed = false;
    let feedbackMsg = "";

    // Scoring
    if (typos === 0 && trimmed.length === toType.length && timeUsed > 0) {
      roundScore += PERFECT_BONUS;
      isPerfect = true;
      feedbackMsg = "Perfect! No typos – bonus!";
    } else if (typos > 0 && trimmed.length === toType.length) {
      roundScore -= TYPOS_PENALTY * typos;
      feedbackMsg = `Typos (${typos}) detected.`;
    } else if (trimmed.length < toType.length) {
      feedbackMsg = "Incomplete – more to type!";
      roundScore -= 40;
    }

    // Fast bonus: finished in < half the time and <=1 typo
    if (timeUsed <= INITIAL_TIMER / 2 && typos < 2 && trimmed.length === toType.length) {
      roundScore += FAST_BONUS;
      isHighSpeed = true;
      if (!isPerfect) feedbackMsg += " Speed bonus!";
    }

    // Clamp to nonnegative
    roundScore = Math.max(roundScore, 0);

    setScore((prev) => prev + roundScore);
    setRoundScores((prev) => [...prev, { round: round + 1, score: roundScore, typos, time: timeUsed, perfect: isPerfect, highspeed: isHighSpeed }]);
    if (isPerfect) {
      setPerfectStreak((s) => s + 1);
      setTotalPerfect((s) => s + 1);
      setFeedback({ status: "perfect", msg: feedbackMsg });
    } else if (isHighSpeed) {
      setPerfectStreak(0);
      setFeedback({ status: "fast", msg: feedbackMsg });
    } else if (typos > 0) {
      setPerfectStreak(0);
      setFeedback({ status: "typo", msg: feedbackMsg });
    } else {
      setPerfectStreak(0);
      setFeedback({ status: "neutral", msg: feedbackMsg });
    }
    setTooltip("");

    // Animate success/error (class on input)
    triggerInputAnimation(isPerfect ? "perfect" : typos ? "typo" : (isHighSpeed ? "fast" : "neutral"));

    // Next round or finish after short delay
    setTimeout(() => {
      if (round < sentences.length - 1) {
        setRound((r) => r + 1);
        setUserInput("");
        setTimer(INITIAL_TIMER);
        setTypoCount(0);
        setFeedback(null);
      } else {
        finishGame();
      }
    }, 870);
  }

  function handleTimeout() {
    // User ran out of time: mark as fail
    setFeedback({ status: "timeout", msg: "⏰ Time's up! Try again next round." });
    setPerfectStreak(0);
    setTypoCount(currentSentence().length);
    setRoundScores((prev) => [
      ...prev,
      { round: round + 1, score: 0, typos: currentSentence().length, time: INITIAL_TIMER, perfect: false, highspeed: false, timeout: true }
    ]);
    triggerInputAnimation("timeout");
    setTimeout(() => {
      if (round < sentences.length - 1) {
        setRound((r) => r + 1);
        setUserInput("");
        setTimer(INITIAL_TIMER);
        setTypoCount(0);
        setFeedback(null);
      } else {
        finishGame();
      }
    }, 940);
  }

  // Animation trigger (add/remove input style classes)
  function triggerInputAnimation(type) {
    if (!inputRef.current) return;
    const el = inputRef.current;
    el.classList.remove("wttype-perfect", "wttype-fast", "wttype-typo", "wttype-timeout");
    if (type === "perfect") el.classList.add("wttype-perfect");
    if (type === "typo") el.classList.add("wttype-typo");
    if (type === "fast") el.classList.add("wttype-fast");
    if (type === "timeout") el.classList.add("wttype-timeout");
    setTimeout(() => {
      el.classList.remove("wttype-perfect", "wttype-fast", "wttype-typo", "wttype-timeout");
    }, 750);
  }

  // ================= SCORE/LOCAL STORAGE ================
  function finishGame() {
    setGameOver(true);
    setPlaying(false);

    // Persist best score/streak if improved
    const prevScore = Number(window.localStorage.getItem(BEST_SCORE_KEY)) || 0;
    if (score > prevScore) {
      window.localStorage.setItem(BEST_SCORE_KEY, score);
      setBestScore(score);
    }
    if (perfectStreak > bestStreak) {
      window.localStorage.setItem(BEST_STREAK_KEY, perfectStreak);
      setBestStreak(perfectStreak);
    }
    setScoreboardOpen(true);
  }

  function fmtTime(secs) {
    return secs + "s";
  }

  function handleThemeToggle() {
    setTheme(t => t === "dark" ? "light" : "dark");
  }

  // ========== Rendering functions ==========

  // Highlight errors in sentence display
  function renderSentenceBox() {
    const text = currentSentence();
    const typed = userInput;
    let parts = [];
    for (let i = 0; i < text.length; ++i) {
      const correct = typed[i] === text[i];
      let isCaret = typed.length === i;
      parts.push(
        <span
          key={i}
          className={
            correct
              ? "wttyped-correct"
              : i < typed.length
              ? "wttyped-wrong"
              : "wttyped-rest"
          }
        >
          {text[i]}
          {isCaret && <span className="wttyped-caret" aria-hidden="true"></span>}
        </span>
      );
    }
    return <div className="wttype-sentence-field" aria-label="Target sentence for typing">{parts}</div>;
  }

  function renderFeedback() {
    if (!feedback) return null;
    let className = "wttype-feedback";
    if (feedback.status === "perfect") className += " perfect";
    else if (feedback.status === "typo") className += " typo";
    else if (feedback.status === "fast") className += " fast";
    else if (feedback.status === "timeout") className += " timeout";
    return (
      <div className={className} role="status" aria-live="assertive">
        {feedback.msg}
      </div>
    );
  }

  function renderScoreboardModal() {
    if (!scoreboardOpen) return null;
    return (
      <div className="wttype-modal-backdrop open">
        <div className="wttype-modal-content" tabIndex={-1} role="dialog" aria-modal="true">
          <span className="wttype-modal-icon" aria-hidden="true">🏁</span>
          <h3 className="wttype-modal-title">Round Results</h3>
          <div className="wttype-modal-finalscore">
            Score: <span className="score">{score}</span>
          </div>
          <div className="wttype-modal-results">
            <ul>
              {roundScores.map((r, i) => (
                <li key={i}>
                  <b>#{i+1}:</b> {r.timeout ? <i className="timeout">timeout</i> : r.typos === 0 ? "Perfect ✅" : `${r.typos} typo${r.typos>1?"s":""}`}
                  {" · "}
                  <span>+{r.score}</span>
                  {r.highspeed && !r.perfect && <span className="bonus">⏩</span>}
                </li>
              ))}
            </ul>
          </div>
          <div className="wttype-record-row">
            <span className="label">Best Score:</span>{" "}
            <span className="wttype-bestscore">{Math.max(score, bestScore)}</span>
            {" | "}
            <span className="label">Perfect Streak:</span>{" "}
            <span className="wttype-beststreak">{Math.max(perfectStreak, bestStreak)}</span>
          </div>
          <button
            className="wttype-btn wttype-playagain-btn"
            onClick={() => {
              setScoreboardOpen(false);
              setGameOver(false);
              startGame();
            }}
            autoFocus
          >
            Play Again
          </button>
          <button className="wttype-btn wttype-goback-btn" onClick={() => navigate("/games")}>← Back to Games</button>
        </div>
      </div>
    );
  }

  // Main render
  return (
    <div className="wttype-root">
      {/* BG Decorations */}
      <div className="wttype-blur1"></div>
      <div className="wttype-blur2"></div>
      {/* Modal for results/scoreboard */}
      {renderScoreboardModal()}
      <main className="wttype-card">
        <header className="wttype-header">
          <h2 className="wttype-title"><span aria-hidden="true">📑</span> Word Typing Challenge</h2>
          <div className="wttype-theme-row">
            <button
              className="wttype-theme-toggle"
              aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
              tabIndex={0}
              onClick={handleThemeToggle}
            >
              {theme === "dark"
                ? <span aria-hidden="true">🌙</span>
                : <span aria-hidden="true">☀️</span>
              }
              <span className="theme-label">{theme === "dark" ? "Dark" : "Light"} mode</span>
            </button>
          </div>
        </header>
        <section className="wttype-mainzone" aria-label="Word Typing Challenge Panel">
          {!playing && !gameOver && (
            <div className="wttype-welcome">
              <h3>How fast and perfect can you type?</h3>
              <ul className="wttype-rules">
                <li>Type {ROUND_COUNT} randomized sentences as quickly and accurately as you can.</li>
                <li>Each round: <b>{INITIAL_TIMER}s</b> to finish. Bonus for perfection, speed, and streaks.</li>
                <li>Errors are <mark>highlighted</mark>; fast finish = bonus!</li>
                <li>Best scores and streaks are saved.<br/>Try to beat your <b>personal record</b>!</li>
                <li>Theme toggle top right (☀️/🌙), full keyboard and screen reader support.</li>
              </ul>
              <button className="wttype-btn wttype-start-btn" onClick={startGame} tabIndex={0}>
                Start Challenge
              </button>
              <button className="wttype-btn wttype-goback-btn" onClick={() => navigate("/games")}>← Back to Games</button>
              <div className="wttype-bestboard">
                <strong>Best Score:</strong> <span>{bestScore}</span>{" | "}
                <strong>Perfect Streak:</strong> <span>{bestStreak}</span>
              </div>
            </div>
          )}
          {playing && (
            <>
              <div className="wttype-statrow">
                <span className="wttype-pill round"><span className="sr-only">Round</span>🏁 {round+1}/{ROUND_COUNT}</span>
                <span className="wttype-pill timer" aria-label="Seconds left">⏰ {timer}s</span>
                <span className="wttype-pill score"><span className="sr-only">Score</span>🏆 {score}</span>
                <span className="wttype-pill streak" title="Perfect streak">🔥 {perfectStreak}</span>
              </div>
              <div className="wttype-sentence-zone">
                {renderSentenceBox()}
              </div>
              <input
                ref={inputRef}
                className="wttype-input"
                type="text"
                value={userInput}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                autoFocus
                disabled={gameOver}
                maxLength={currentSentence().length}
                aria-label="Type the sentence here"
                spellCheck="false"
              />
              {tooltip && <div className="wttype-tooltip" role="alert">{tooltip}</div>}
              {renderFeedback()}
              <div className="wttype-btns-row">
                <button
                  className="wttype-btn wttype-submit-btn"
                  onClick={handleSubmit}
                  tabIndex={0}
                  disabled={userInput.length === 0 || gameOver}
                  aria-label="Submit this round"
                >Submit</button>
                <button
                  className="wttype-btn wttype-giveup-btn"
                  onClick={finishGame}
                  tabIndex={0}
                  disabled={gameOver}
                >Finish Now</button>
                <button className="wttype-btn wttype-goback-btn" onClick={() => navigate("/games")}>← Exit</button>
              </div>
            </>
          )}
        </section>
        <footer className="wttype-footer">
          <strong>Word Typing Challenge</strong> · Scores and history are saved to your device.
        </footer>
      </main>
    </div>
  );
}

export default WordTypingChallengePage;
