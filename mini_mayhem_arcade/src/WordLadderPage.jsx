import React, { useState, useEffect, useRef } from "react";
import "./WordLadderPage.css";
import { useNavigate } from "react-router-dom";

// --- HARDCODED WORD LADDER CHALLENGE ---
// Hard-level uses longer, less common words, with a chain requiring “clever” intermediate words and a real dictionary check.
const WORD_LADDER_HARD = {
  start: "table",
  target: "chair",
  // Acceptable hard dictionary words (for single-letter change validation)
  wordList: [
    "table", "cable", "cage", "cake", "chafe", "chase", "chain", "chair", "cahir", "chail",
    "cable", "cabal", "cavil", "cager", "chide", "chie", "chile", "chile", "chire", "cheir",
    "caird", "caird", "cairn", "chaim", "chalk", "child", "chalk", "chair",
    "tables", "cables", "taper", "taper", "tabel", "taber", "caber", "cahir",
    "taler", "tairn", "chile", "chair",
    // It can be extended but should NOT accept arbitrary non-words - core logic will validate.
  ],
  hints: [
    "Both 'table' and 'chair' are types of furniture.",
    "Try thinking of similar sounding words.",
    "Change only one letter each step and make sure it's a real word!",
    "A possible chain: table → cable → cairn → chain → chair"
  ]
};

// A quick dictionary for extra validation (in a real-world we'd use a public API)
const ENGLISH_WORDS = new Set([
  "table", "cable", "cage", "cake", "chafe", "chase", "chain", "chair", "child", "chalk", "cabal", "taper", "caber", "cager", "chalk", "caird", "cairn", "taler", "cahir",
  "abel", "bake", "cake", "care", "dare", "hair", "hail", "pair", "rail", "tail", 
  "ache", "chat", "chai", "chain", "chair", "chile", "chafe", "cavil", "tabel",
  "cage", "cable", "taber", "taper", "cager"
]);

const LS_KEY = "mmarcade-wordladder-hard-latest";
const LS_BEST_KEY = "mmarcade-wordladder-hard-best";

// PUBLIC_INTERFACE
/**
 * WordLadderPage - Hard difficulty word ladder game (table → chair)
 * - Only one letter can be changed per move, and result must be a valid English word.
 * - Shows chain, invalid feedback, step counter, hint, restart. Persist latest/best locally.
 */
function WordLadderPage() {
  const [chain, setChain] = useState([WORD_LADDER_HARD.start]);
  const [currentInput, setCurrentInput] = useState("");
  const [feedback, setFeedback] = useState("");
  const [steps, setSteps] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [hintIdx, setHintIdx] = useState(0);
  const [bestSteps, setBestSteps] = useState(null);

  const inputRef = useRef();
  const navigate = useNavigate();

  // Load any progress and best score
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const latest = window.localStorage.getItem(LS_KEY);
        if (latest) {
          const obj = JSON.parse(latest);
          if (
            Array.isArray(obj.chain) &&
            obj.chain.length > 0 &&
            obj.chain[0] === WORD_LADDER_HARD.start
          ) {
            setChain(obj.chain);
            setSteps(obj.chain.length - 1);
            if (obj.completed) setCompleted(true);
          }
        }
        const best = window.localStorage.getItem(LS_BEST_KEY);
        if (best && !isNaN(Number(best))) setBestSteps(Number(best));
      } catch (e) {}
    }
  }, []);
  // Save progress to localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(
        LS_KEY,
        JSON.stringify({
          chain,
          completed,
          timestamp: Date.now(),
        })
      );
      // Update best if completed
      if (completed) {
        if (
          bestSteps === null ||
          steps < bestSteps
        ) {
          window.localStorage.setItem(LS_BEST_KEY, String(steps));
          setBestSteps(steps);
        }
      }
    }
    // eslint-disable-next-line
  }, [chain, completed, steps]);

  // Returns true if a is exactly one letter different from b and the same length
  function isSingleLetterChange(a, b) {
    if (a.length !== b.length) return false;
    let diff = 0;
    for (let i = 0; i < a.length; ++i) if (a[i] !== b[i]) diff++;
    return diff === 1;
  }

  // Accept input word
  function handleSubmit(e) {
    e.preventDefault();
    const word = currentInput.trim().toLowerCase();
    if (!word || word.length !== chain[chain.length - 1].length) {
      setFeedback("Must be a 5-letter word.");
      return;
    }
    // Same as previous
    if (word === chain[chain.length - 1]) {
      setFeedback("Change a letter to progress the ladder.");
      return;
    }
    // Already in chain
    if (chain.includes(word)) {
      setFeedback("You already used this word.");
      return;
    }
    // Only one letter changed
    if (!isSingleLetterChange(word, chain[chain.length - 1])) {
      setFeedback("Only one letter can be changed!");
      return;
    }
    // Must be a valid word
    if (
      !ENGLISH_WORDS.has(word) &&
      !WORD_LADDER_HARD.wordList.includes(word)
    ) {
      setFeedback("That's not a valid English word...");
      return;
    }
    // Accept!
    setChain([...chain, word]);
    setSteps(steps + 1);
    setCurrentInput("");
    setFeedback("");
    // Finished?
    if (word === WORD_LADDER_HARD.target) {
      setCompleted(true);
    }
  }

  function handleRestart() {
    setChain([WORD_LADDER_HARD.start]);
    setCompleted(false);
    setSteps(0);
    setCurrentInput("");
    setFeedback("");
    setShowHint(false);
    setHintIdx(0);
    // Do not reset best score!
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(LS_KEY);
    }
    setTimeout(() => {
      try {
        // Refocus input after UI resets
        if (inputRef.current) inputRef.current.focus();
      } catch {}
    }, 100);
  }

  function handleHint() {
    setShowHint(true);
    setHintIdx(Math.floor(Math.random() * WORD_LADDER_HARD.hints.length));
  }

  // Keydown: Enter to submit, Escape to restart, H for hint
  useEffect(() => {
    const handler = (e) => {
      if (
        e.key === "Enter" &&
        !completed &&
        document.activeElement === inputRef.current
      ) {
        handleSubmit(e);
      }
      if (e.key === "r" || e.key === "R") {
        handleRestart();
      }
      if (e.key === "h" || e.key === "H") {
        handleHint();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line
  }, [currentInput, completed, chain, steps, hintIdx]);

  function handleInput(e) {
    let val = e.target.value.replace(/[^a-zA-Z]/g, "");
    if (val.length > WORD_LADDER_HARD.start.length) {
      val = val.slice(0, WORD_LADDER_HARD.start.length);
    }
    setCurrentInput(val);
    setFeedback("");
  }

  // Animated success message
  function renderCompleteBanner() {
    if (!completed) return null;
    return (
      <div className="wl-success-banner" role="alert">
        <span className="wl-trophy">🏆</span>
        <div className="wl-win-main">
          <div className="wl-win-title">Congratulations!</div>
          <div className="wl-win-desc">
            You built a word ladder from <b>{WORD_LADDER_HARD.start}</b> to <b>{WORD_LADDER_HARD.target}</b> in <b>{steps}</b> steps.
            <br />
            {bestSteps !== null && steps === bestSteps
              ? <span>🎉 New best score!</span>
              : bestSteps !== null ? <span>Your best: <b>{bestSteps}</b> steps</span> : null}
          </div>
          <button className="wl-btn wl-btn-large replay" onClick={handleRestart}>
            ↻ Play Again
          </button>
          <button className="wl-btn wl-btn-secondary" onClick={() => navigate("/games")}>
            ← Back to Games
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="wl-root">
      {/* Decorative floaters */}
      <div className="wl-blur1"></div>
      <div className="wl-blur2"></div>
      <main className="wl-main">
        <header className="wl-header">
          <h2 className="wl-title">
            <span className="wl-title-icon" aria-hidden="true">🔗</span>
            Word Ladder (Hard)
          </h2>
          <span className="wl-desc">
            Go from <b>{WORD_LADDER_HARD.start.toUpperCase()}</b> to <b>{WORD_LADDER_HARD.target.toUpperCase()}</b>.<br />
            In each step, change only <b>ONE letter</b> to form a valid English word. Try to get there in as few steps as possible!
          </span>
        </header>
        <div className="wl-gamebox">
          <div className="wl-chain-label">
            Chain ({chain.length}): <span className="wl-chain-start">{WORD_LADDER_HARD.start}</span> → <span className="wl-chain-target">{WORD_LADDER_HARD.target}</span>
          </div>
          <div className="wl-chain-list-zone" aria-label="Word chain so far">
            {chain.map((word, idx) => (
              <span
                key={word + idx}
                className={
                  "wl-chain-word" +
                  (idx === 0
                    ? " wl-chain-start"
                    : idx === chain.length - 1
                    ? " wl-chain-last"
                    : "")
                }
              >
                {word}
                {idx !== chain.length - 1 && <span className="wl-arrow">→</span>}
              </span>
            ))}
          </div>
          {!completed && (
            <form className="wl-form" onSubmit={handleSubmit} autoComplete="off">
              <input
                className="wl-input"
                type="text"
                ref={inputRef}
                value={currentInput}
                onChange={handleInput}
                disabled={completed}
                placeholder={"Next word"}
                maxLength={WORD_LADDER_HARD.start.length}
                aria-label="Enter a new word changing only one letter"
                autoFocus
              />
              <button className="wl-btn" type="submit">
                ➡️
              </button>
            </form>
          )}
          {feedback && (
            <div className="wl-feedback" role="alert">
              {feedback}
            </div>
          )}
          <div className="wl-meta">
            <span className="wl-step-pill">
              Steps: <b>{steps}</b>
            </span>
            {bestSteps !== null && (
              <span className="wl-step-pill">
                Best: <b>{bestSteps}</b>
              </span>
            )}
            <button
              className="wl-btn wl-btn-secondary"
              onClick={handleRestart}
              aria-label="Restart word ladder"
              tabIndex={0}
              style={{ marginLeft: "1.5em" }}
            >
              ↻ Restart
            </button>
            <button
              className="wl-btn wl-btn-secondary"
              onClick={handleHint}
              aria-label="Show hint"
              tabIndex={0}
              style={{ marginLeft: "0.8em" }}
            >
              💡 Hint
            </button>
          </div>
          {showHint && (
            <div className="wl-hint">
              <span className="wl-hint-label">Hint:</span> {WORD_LADDER_HARD.hints[hintIdx]}
            </div>
          )}
        </div>
      </main>
      {renderCompleteBanner()}
    </div>
  );
}

export default WordLadderPage;
