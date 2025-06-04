import React, { useRef, useState } from "react";
import "./TypingChallengePage.css";
import { useNavigate } from "react-router-dom";

// Fixed challenge sentence for now (may be updated in future)
const FIXED_SENTENCE = "The quick brown fox jumps over the lazy dog.";

// Key for best WPM in localStorage
const LS_BEST_KEY = "mmarcade-typing-bestwpm";

// PUBLIC_INTERFACE
/**
 * TypingChallengePage: Sentence-based typing challenge with fixed sentence flow.
 * - Sentence appears prominently, read-only in a non-editable box.
 * - Typing input below; start button enables input+timer, submit stops both and shows results.
 * - WPM and accuracy are calculated. Best WPM is stored in localStorage.
 * - Flow and controls are matched to requirements (no randomization of sentence).
 */
function TypingChallengePage() {
  // States for game flow
  const [gameState, setGameState] = useState("idle"); // idle | running | finished
  const [userInput, setUserInput] = useState("");
  const [startTime, setStartTime] = useState(null); // ms
  const [endTime, setEndTime] = useState(null);     // ms
  const [wpm, setWpm] = useState(null);
  const [accuracy, setAccuracy] = useState(null);
  const [resultMsg, setResultMsg] = useState("");
  const [bestWpm, setBestWpm] = useState(loadBestWPM());

  const inputRef = useRef();
  const navigate = useNavigate();

  // Helper: Load and store best WPM
  function loadBestWPM() {
    if (typeof window === "undefined") return null;
    try {
      const v = window.localStorage.getItem(LS_BEST_KEY);
      if (v !== null && !isNaN(parseFloat(v))) {
        return parseFloat(v);
      }
    } catch {}
    return null;
  }
  function saveBestWPM(wpmVal) {
    if (typeof window === "undefined") return;
    if (isNaN(wpmVal)) return;
    if (!bestWpm || wpmVal > bestWpm) {
      window.localStorage.setItem(LS_BEST_KEY, wpmVal);
      setBestWpm(wpmVal);
    }
  }

  // Begin a new game session
  function handleStart() {
    setGameState("running");
    setUserInput("");
    setStartTime(performance.now());
    setEndTime(null);
    setWpm(null);
    setAccuracy(null);
    setResultMsg("");
    setTimeout(() => {
      if (inputRef.current) inputRef.current.focus();
    }, 30);
  }

  // Handle typing changes
  function handleChange(e) {
    if (gameState !== "running") return;
    const value = e.target.value;

    // Disallow input if game not running or over sentence length
    if (value.length > FIXED_SENTENCE.length) return;
    setUserInput(value);

    // Optional: Auto-submit if exact match (not required by brief, only submit by button)
  }

  // Submit: stop timer/input, calculate stats, show result
  function handleSubmit() {
    if (gameState !== "running") return;
    const finishTime = performance.now();
    setGameState("finished");
    setEndTime(finishTime);

    // WPM and accuracy
    const seconds = Math.max(1, (finishTime - startTime) / 1000.0);
    const charsTyped = userInput.length;
    const words = charsTyped / 5;
    const wpmVal = Math.round((words / (seconds / 60)) * 100) / 100;

    let correct = 0;
    for (let i = 0; i < FIXED_SENTENCE.length; ++i) {
      if (userInput[i] === FIXED_SENTENCE[i]) correct++;
    }
    const accuracyVal =
      FIXED_SENTENCE.length === 0
        ? 1
        : Math.max(0, correct) / FIXED_SENTENCE.length;

    setWpm(wpmVal);
    setAccuracy(accuracyVal);

    // Save best if improved
    saveBestWPM(wpmVal);

    // Set fun message
    setResultMsg(getResultMessage(wpmVal, accuracyVal));

    // Blur input for accessibility/discouragement
    if (inputRef.current) {
      inputRef.current.blur();
    }
  }

  // Reset session to play again
  function handlePlayAgain() {
    setUserInput("");
    setGameState("idle");
    setStartTime(null);
    setEndTime(null);
    setWpm(null);
    setAccuracy(null);
    setResultMsg("");
    setTimeout(() => {
      if (inputRef.current) inputRef.current.value = "";
    }, 0);
  }

  // Keyboard support ("Enter" submits if running)
  function onKeyDown(e) {
    if (gameState === "running" && e.key === "Enter") {
      handleSubmit();
    }
  }

  // Format accuracy percent
  function fmtAcc(acc) {
    return acc === null ? "-" : Math.round(acc * 1000) / 10 + "%";
  }

  // Rating message based on WPM & accuracy
  function getResultMessage(wpm, acc) {
    if (acc < 0.8) return "Keep practicing for better accuracy!";
    if (wpm >= 70 && acc > 0.98) return "Typing Master! 🚀";
    if (wpm >= 45 && acc >= 0.95) return "Great Job! 🏆";
    if (wpm >= 30 && acc >= 0.90) return "Good effort! 👍";
    if (wpm >= 15 && acc >= 0.80) return "Keep it up!";
    return "Try again and boost your skills!";
  }

  // Render sentence (read-only) - coloring per char (optional for later)
  function renderSentenceBox() {
    return (
      <div className="typing-sentence-zone" aria-label="Typing challenge sentence, read only">
        <div className="typing-sentence" style={{ fontWeight: 700 }}>
          {FIXED_SENTENCE}
        </div>
      </div>
    );
  }

  return (
    <div className="typing-root">
      {/* Decorative backgrounds */}
      <div className="typing-blur1"></div>
      <div className="typing-blur2"></div>
      <main className="typing-main-card">
        <header className="typing-header">
          <h2 className="typing-title">
            <span className="typing-emoji" aria-hidden="true">⌨️</span> Typing Challenge
          </h2>
          <p className="typing-instructions">
            Type the sentence below as quickly and accurately as possible.<br />
            Your Words Per Minute (WPM) and accuracy will be measured. Good luck!
          </p>
        </header>

        {/* Display fixed sentence */}
        {renderSentenceBox()}

        {/* Typing input (only enabled after start, until submit) */}
        <input
          ref={inputRef}
          className="typing-input"
          type="text"
          disabled={gameState !== "running"}
          value={userInput}
          onChange={handleChange}
          spellCheck="false"
          maxLength={FIXED_SENTENCE.length}
          tabIndex={0}
          aria-label="Typing input"
          placeholder={gameState === "idle" ? "Press Start to begin" : ""}
          onKeyDown={onKeyDown}
          autoFocus={gameState === "running"}
        />

        {/* Controls: Start/Submit/Play Again */}
        <div className="typing-btn-row">
          {gameState === "idle" && (
            <button className="typing-btn start" onClick={handleStart} tabIndex={0}>
              Start
            </button>
          )}
          {gameState === "running" && (
            <button
              className="typing-btn submit"
              onClick={handleSubmit}
              tabIndex={0}
              disabled={userInput.length === 0}
            >
              Submit
            </button>
          )}
          {gameState === "finished" && (
            <button className="typing-btn playagain" onClick={handlePlayAgain} tabIndex={0}>
              <span aria-hidden="true">↺</span> Play Again
            </button>
          )}
        </div>

        {/* Results */}
        <section className="typing-results" aria-live="polite">
          {gameState === "finished" && (
            <>
              <div className="typing-result-main">
                <span className="tr-label">WPM:</span>
                <span className="tr-value wpm">{wpm}</span>
                <span className="tr-label"> | Accuracy:</span>
                <span className="tr-value acc">{fmtAcc(accuracy)}</span>
              </div>
              <div className="typing-result-msg">{resultMsg}</div>
              <div className="typing-best-row">
                <span className="tb-label">Your Best WPM:</span>
                <span className="tb-value">
                  {bestWpm !== null ? Math.round(bestWpm * 100) / 100 : "-"}
                </span>
              </div>
            </>
          )}
        </section>

        {/* Return nav */}
        <button
          className="typing-back-btn"
          onClick={() => navigate("/games")}
          tabIndex={0}
        >
          ← Back to Games
        </button>
      </main>
    </div>
  );
}

export default TypingChallengePage;
