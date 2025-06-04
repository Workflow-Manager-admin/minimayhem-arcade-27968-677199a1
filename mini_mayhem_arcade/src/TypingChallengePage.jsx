import React, { useRef, useState, useEffect } from "react";
import "./TypingChallengePage.css";
import { useNavigate } from "react-router-dom";

// Set of sample sentences (about 90-110 chars for fair typing length, clear + varied chars)
const CHALLENGE_SENTENCES = [
  "The quick brown fox jumps over the lazy dog, practicing typing skills is fun and rewarding.",
  "MiniMayhem Arcade brings vibrant games that exercise memory, speed, accuracy, and wit—challenge yourself daily.",
  "Typing quickly and accurately is a superpower in the modern world; boost your skills for school and work.",
  "Challenge accepted! See how fast and accurate you can type this sentence without any mistakes or corrections.",
  "Speed, focus, and practice will make you a typing champion—keep going and watch your words per minute soar!"
];

function getRandomSentence() {
  // Pick a random sentence each visit/round
  return CHALLENGE_SENTENCES[
    Math.floor(Math.random() * CHALLENGE_SENTENCES.length)
  ];
}

// Calculates WPM (Words Per Minute)
function calculateWPM(charsTyped, seconds) {
  // Standard 1 word = 5 chars, avoid 0 division
  if (seconds === 0) return 0;
  const words = charsTyped / 5;
  return Math.round((words / (seconds / 60)) * 100) / 100;
}

// Calculates accuracy ratio (0 to 1)
function calculateAccuracy(target, input) {
  let correct = 0;
  for (let i = 0; i < input.length; ++i) {
    if (input[i] === target[i]) correct++;
  }
  return target.length === 0 ? 1 : Math.max(0, correct) / target.length;
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

// Store best WPM for Typing Challenge in localStorage
const LS_BEST_KEY = "mmarcade-typing-bestwpm";

function loadBestWPM() {
  if (typeof window === "undefined") return null;
  let best = null;
  try {
    const v = window.localStorage.getItem(LS_BEST_KEY);
    if (v !== null && !isNaN(parseFloat(v)))
      best = parseFloat(v);
  } catch {}
  return best;
}

function saveBestWPM(wpm) {
  if (typeof window !== "undefined" && !isNaN(wpm)) {
    const prev = loadBestWPM();
    if (!prev || wpm > prev) {
      window.localStorage.setItem(LS_BEST_KEY, wpm);
    }
  }
}

/**
 * PUBLIC_INTERFACE
 * TypingChallengePage: Sentence-based typing speed/accuracy challenge.
 * - Start, type the prompt, submit/finish
 * - Shows accuracy, WPM, and saves best WPM locally
 * - Play Again button resets new sentence/challenge
 * - Back to games for navigation
 * - Light/dark theme; visually energetic, per UI plan.
 */
function TypingChallengePage() {
  // Game state tracking
  const [sentence, setSentence] = useState("");
  const [userInput, setUserInput] = useState("");
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [endTime, setEndTime] = useState(null);

  // Derived stats state
  const [wpm, setWpm] = useState(0);
  const [accuracy, setAccuracy] = useState(1);
  const [resultMsg, setResultMsg] = useState("");
  const [bestWpm, setBestWpm] = useState(loadBestWPM());
  const [playCount, setPlayCount] = useState(0); // force re-randomization

  const inputRef = useRef(null);
  const navigate = useNavigate();

  // On mount or play again, generate a new sentence
  useEffect(() => {
    setSentence(getRandomSentence());
    setUserInput("");
    setStarted(false);
    setFinished(false);
    setStartTime(null);
    setEndTime(null);
    setWpm(0);
    setAccuracy(1);
    setResultMsg("");
  }, [playCount]);

  // On finish, compute results
  useEffect(() => {
    if (finished && startTime && endTime) {
      // Compute WPM and accuracy
      const timeSec = Math.max(1, (endTime - startTime) / 1000); // never 0
      const acc = calculateAccuracy(sentence, userInput);
      const wpmVal = calculateWPM(userInput.length, timeSec);
      setAccuracy(acc);
      setWpm(wpmVal);
      setResultMsg(getResultMessage(wpmVal, acc));
      // Save best if improved
      if (!bestWpm || wpmVal > bestWpm) {
        saveBestWPM(wpmVal);
        setBestWpm(wpmVal);
      }
    }
  // eslint-disable-next-line
  }, [finished, endTime]);

  // Keyboard Enter = Submit if done typing
  function onKeyDown(e) {
    if (e.key === "Enter" && !finished) {
      // Only submit if fully typed the sentence
      if (userInput.length >= sentence.length) {
        handleSubmit();
      }
    }
  }

  function handleChange(e) {
    if (finished) return; // lock after finish
    const val = e.target.value;
    // Only start timer on first input
    if (!started && val.length === 1) {
      setStarted(true);
      setStartTime(performance.now());
    }
    // Limit max length to sentence
    if (val.length > sentence.length) return;
    setUserInput(val);
    // Auto-submit if matches exactly
    if (val === sentence) {
      handleSubmit(performance.now());
    }
  }

  function handleStart() {
    setStarted(false);
    setUserInput("");
    setFinished(false);
    setStartTime(null);
    setEndTime(null);
    setResultMsg("");
    if (inputRef.current) inputRef.current.focus();
  }

  function handleSubmit(forceTime) {
    if (finished) return;
    setFinished(true);
    // Use provided end time, else now
    setEndTime(forceTime || performance.now());
    // Blur input to discourage continued typing
    if (inputRef.current) inputRef.current.blur();
  }

  function handlePlayAgain() {
    setPlayCount((c) => c + 1);
    if (inputRef.current) setTimeout(() => inputRef.current.focus(), 50);
  }

  // Visual word-match coloring (character-by-character)
  function colorizeText(target, input) {
    return (
      <span>
        {target.split("").map((ch, idx) => {
          let style = {};
          if (idx < input.length) {
            style = input[idx] === ch
              ? { color: "var(--typing-match)" }
              : { color: "var(--typing-error)", textDecoration: "underline wavy" };
          }
          return (
            <span key={idx} style={style}>{ch}</span>
          );
        })}
      </span>
    );
  }

  // Format accuracy percent
  function fmtAcc(acc) {
    return Math.round(acc * 1000) / 10 + "%";
  }

  return (
    <div className="typing-root">
      {/* Floating decorative backgrounds */}
      <div className="typing-blur1"></div>
      <div className="typing-blur2"></div>
      <main className="typing-main-card">
        <header className="typing-header">
          <h2 className="typing-title">
            <span className="typing-emoji" aria-hidden="true">⌨️</span> Typing Challenge
          </h2>
          <p className="typing-instructions">
            Type the sentence below as quickly and accurately as possible.<br/>
            Your Words Per Minute (WPM) and accuracy will be measured. Good luck!
          </p>
        </header>
        {/* Sentence area */}
        <div className="typing-sentence-zone">
          <div
            className="typing-sentence"
            aria-label="Typing challenge sentence"
          >
            {colorizeText(sentence, userInput)}
          </div>
          {/* Controlled input */}
          <input
            ref={inputRef}
            className="typing-input"
            type="text"
            value={userInput}
            onChange={handleChange}
            disabled={finished}
            spellCheck="false"
            autoFocus
            maxLength={sentence.length}
            placeholder="Start typing here..."
            onKeyDown={onKeyDown}
            aria-label="Typing input"
          />
        </div>

        {/* Controls */}
        <div className="typing-btn-row">
          {!started && !finished && (
            <button className="typing-btn start" onClick={handleStart} tabIndex={0}>
              Start
            </button>
          )}
          {started && !finished && (
            <button className="typing-btn submit"
              onClick={handleSubmit}
              tabIndex={0}
              disabled={userInput.length < sentence.length}
            >
              Submit
            </button>
          )}
          {finished && (
            <button className="typing-btn playagain" onClick={handlePlayAgain} tabIndex={0}>
              <span aria-hidden="true">↺</span> Play Again
            </button>
          )}
        </div>

        {/* Results */}
        <section className="typing-results" aria-live="polite">
          {finished && (
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
                  {bestWpm ? Math.round(bestWpm * 100) / 100 : "-"}
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
