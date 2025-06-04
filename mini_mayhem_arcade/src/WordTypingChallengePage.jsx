import React, { useEffect, useRef, useState } from "react";
import "./WordTypingChallengePage.css";
import { useNavigate } from "react-router-dom";

// PUBLIC_INTERFACE
// List of random sentences for the challenge (moderate length, neutral vocabulary)
const SENTENCES = [
  "The curious cat silently watched the busy street from the window sill.",
  "Sudden rain soaked the runners but couldn't dampen their spirits.",
  "Bright stars flickered in the cold night sky above the quiet village.",
  "A gentle breeze swayed the trees as children laughed in the garden.",
  "Reading every day helps to sharpen the mind and expand knowledge.",
  "Delicious cakes were displayed in the bakery, tempting every passerby.",
  "Technology changes rapidly, making lifelong learning important.",
  "Music filled the air as the orchestra tuned their instruments.",
  "Every challenge is an opportunity to learn and improve oneself.",
  "Creative ideas often emerge when least expected, during quiet moments.",
  "Strong friendships are built on trust, respect, and good communication.",
  "Waves crashed on the shore, leaving trails of foam behind.",
  "The artist mixed vivid colors to paint a lively city scene.",
  "Planning ahead makes journeys smoother and more enjoyable for all.",
  "Working together, small teams can achieve remarkable goals.",
  "Sunlight streamed through the window onto the polished desk.",
  "Kind words and small gestures can brighten someone's whole day.",
  "Adventure awaits those who seek new experiences with courage.",
  "Books open worlds that exist beyond our ordinary lives.",
  "A well-balanced breakfast is a great way to start the morning.",
];

/**
 * Game params: number of rounds, time limit per round (seconds)
 */
const ROUNDS = 5;
const TIME_LIMIT = 25; // time per round in seconds
const LS_KEY = "mmarcade-wordtyping-scoreboard";

function getSentence() {
  // Randomly select a sentence (do not repeat within a session)
  const idx = Math.floor(Math.random() * SENTENCES.length);
  return { text: SENTENCES[idx], idx };
}

// Scoreboard row: { date, score, totalTime, avgAccuracy }
function getScoreboard() {
  if (typeof window === "undefined") return [];
  try {
    const val = window.localStorage.getItem(LS_KEY);
    if (val) {
      return JSON.parse(val);
    }
  } catch {}
  return [];
}

function saveScoreboard(entries) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LS_KEY, JSON.stringify(entries.slice(0, 10)));
  } catch {}
}

// PUBLIC_INTERFACE
/**
 * WordTypingChallengePage
 * Rules:
 * - Each round: show a random sentence (no repeats per session).
 * - Fade in animation for each sentence.
 * - User types sentence in input; errors are highlighted in real time.
 * - Timer counts down per round.
 * - Score: +1 for >95% correct and completed within time, else zero; total score out of ROUNDS.
 * - At end: show score, accuracy, total+avg time, rating, save to scoreboard.
 * - Play Again and View Scoreboard buttons at end.
 * - Theming: respects dark/light mode with custom color palette.
 */
function WordTypingChallengePage() {
  const [pageState, setPageState] = useState("intro"); // intro | running | finished | scoreboard
  const [currentRound, setCurrentRound] = useState(1);
  const [sentenceIdxs, setSentenceIdxs] = useState([]); // indices already used
  const [sentence, setSentence] = useState(getSentence().text);
  const [sentenceIdx, setSentenceIdx] = useState(null);
  const [input, setInput] = useState("");
  const [timer, setTimer] = useState(TIME_LIMIT);
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT);
  const [intervalId, setIntervalId] = useState(null);
  const [roundScores, setRoundScores] = useState([]);
  const [roundAccuracies, setRoundAccuracies] = useState([]);
  const [roundTimes, setRoundTimes] = useState([]);
  const [isFaded, setIsFaded] = useState(false);
  const [highlighted, setHighlighted] = useState([]);
  const [disableInput, setDisableInput] = useState(false);
  const inputRef = useRef();
  const fadeTimerRef = useRef(null);
  const timeRef = useRef(Date.now());
  const navigate = useNavigate();

  // Start new game session
  function startGame() {
    const { text, idx } = getSentenceNoRepeat([]);
    setSentence(text);
    setSentenceIdx(idx);
    setSentenceIdxs([idx]);
    setCurrentRound(1);
    setInput("");
    setTimer(TIME_LIMIT);
    setTimeLeft(TIME_LIMIT);
    setRoundScores([]);
    setRoundAccuracies([]);
    setRoundTimes([]);
    setIsFaded(false);
    setHighlighted([]);
    setDisableInput(false);
    setPageState("running");
    setTimeout(() => {
      fadeInSentence();
      if (inputRef.current) inputRef.current.focus();
    }, 120);
    startRoundTimer();
    timeRef.current = Date.now();
  }

  // Get a sentence index not in usedIdxs
  function getSentenceNoRepeat(usedIdxs) {
    const available = SENTENCES.map((txt, idx) => idx)
      .filter(i => !usedIdxs.includes(i));
    if (available.length === 0) {
      // rare case: reuse pool
      return getSentence();
    }
    const idx = available[Math.floor(Math.random() * available.length)];
    return { text: SENTENCES[idx], idx };
  }

  // Starts (or restarts) the countdown timer for the round
  function startRoundTimer() {
    if (intervalId) clearInterval(intervalId);
    setTimer(TIME_LIMIT);
    setTimeLeft(TIME_LIMIT);
    let t0 = Date.now();
    const id = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(id);
          handleSubmit(false); // time out, auto submit
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    setIntervalId(id);
  }

  // Animate fade-in for sentence box
  function fadeInSentence() {
    setIsFaded(false);
    setTimeout(() => setIsFaded(true), 40); // trick: add class after mount
  }

  // Real-time error highlighting
  function getHighlightArray(refText, typed) {
    let arr = [];
    for (let i = 0; i < refText.length; ++i) {
      if (typed[i] == null) {
        arr.push("pending");
      } else if (typed[i] === refText[i]) {
        arr.push("correct");
      } else {
        arr.push("wrong");
      }
    }
    return arr;
  }

  // Handle input change (error highlighting)
  function handleChange(e) {
    if (disableInput) return;
    const val = e.target.value;
    setInput(val);

    setHighlighted(getHighlightArray(sentence, val));
    if (val.length === sentence.length && pageState === "running") {
      // Optionally auto-submit on perfect match, but prefer submit on button/Enter
    }
  }

  // Handle submission (either user pressed Enter or time out)
  function handleSubmit(fromUser = true) {
    if (disableInput) return;
    setDisableInput(true);
    clearInterval(intervalId);

    // Stats
    let correct = 0;
    for (let i = 0; i < sentence.length; ++i) {
      if (input[i] === sentence[i]) correct++;
    }
    const accuracy = correct / sentence.length;
    const timeSpent = TIME_LIMIT - timeLeft; // seconds

    let score = 0;
    if (accuracy >= 0.95 && input.length === sentence.length && timeLeft > 0) {
      score = 1;
    }
    setRoundScores([...roundScores, score]);
    setRoundAccuracies([...roundAccuracies, accuracy]);
    setRoundTimes([...roundTimes, timeSpent]);

    // Prepare for next round or finish
    setTimeout(() => {
      if (currentRound < ROUNDS) {
        doNextRound();
      } else {
        setPageState("finished");
        setDisableInput(true);
        saveResult();
      }
    }, 650); // short pause for UX feedback
  }

  // Prepare next round
  function doNextRound() {
    const used = [...sentenceIdxs, sentenceIdx];
    const { text, idx } = getSentenceNoRepeat(used);

    setSentence(text);
    setSentenceIdx(idx);
    setSentenceIdxs(used);
    setCurrentRound(currentRound + 1);
    setInput("");
    setTimer(TIME_LIMIT);
    setTimeLeft(TIME_LIMIT);
    setIsFaded(false);
    setHighlighted([]);
    setDisableInput(false);
    setTimeout(() => {
      fadeInSentence();
      if (inputRef.current) inputRef.current.focus();
    }, 170);
    startRoundTimer();
    timeRef.current = Date.now();
  }

  // Save result to localStorage scoreboard (10 most recent)
  function saveResult() {
    const entry = {
      date: new Date().toISOString(),
      score: roundScores.reduce((a, b) => a + b, 0),
      totalTime: roundTimes.reduce((a, b) => a + b, 0),
      avgAccuracy:
        roundAccuracies.length > 0
          ? roundAccuracies.reduce((a, b) => a + b, 0) / roundAccuracies.length
          : 0,
    };
    const prev = getScoreboard();
    prev.unshift(entry);
    saveScoreboard(prev);
  }

  // Play again: reset all
  function handlePlayAgain() {
    if (intervalId) clearInterval(intervalId);
    setPageState("intro");
    setCurrentRound(1);
    setSentenceIdxs([]);
    setSentence("");
    setSentenceIdx(null);
    setInput("");
    setTimer(TIME_LIMIT);
    setTimeLeft(TIME_LIMIT);
    setRoundScores([]);
    setRoundAccuracies([]);
    setRoundTimes([]);
    setIsFaded(false);
    setHighlighted([]);
    setDisableInput(false);
  }

  // On intro mount: pick random sentence for first round
  useEffect(() => {
    if (pageState === "intro") {
      const { text, idx } = getSentenceNoRepeat([]);
      setSentence(text);
      setSentenceIdx(idx);
      setSentenceIdxs([idx]);
      setInput("");
      setHighlighted([]);
    }
    // eslint-disable-next-line
  }, [pageState]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
    // eslint-disable-next-line
  }, []);

  // Focus input automatically on new round
  useEffect(() => {
    if (pageState === "running" && inputRef.current) {
      inputRef.current.focus();
    }
  }, [pageState, currentRound]);

  // Keyboard support: Enter submits if enabled
  function handleKeyDown(e) {
    if (disableInput) return;
    if (pageState === "running" && (e.key === "Enter" || e.key === "Tab")) {
      e.preventDefault();
      handleSubmit(true);
    }
  }

  // Accessibility: allow Esc to exit
  function handleEscKey(e) {
    if (e.key === "Escape") {
      navigate("/games");
    }
  }

  useEffect(() => {
    window.addEventListener("keydown", handleEscKey);
    return () => window.removeEventListener("keydown", handleEscKey);
    // eslint-disable-next-line
  }, []);

  // Render sentence with error highlighting (each char with color)
  function renderHighlightedSentence() {
    return (
      <div className={`wtc-sentence-box${isFaded ? " faded" : ""}`}>
        {sentence.split("").map((char, i) => {
          let cls = "";
          if (highlighted[i] === "correct") cls = "correct";
          else if (highlighted[i] === "wrong") cls = "wrong";
          else if (highlighted[i] === "pending") cls = "pending";
          return (
            <span key={i} className={`wtc-char ${cls}`}>
              {char}
            </span>
          );
        })}
      </div>
    );
  }

  // Format accuracy
  function fmtAcc(acc) {
    return acc == null
      ? "-"
      : (Math.round(acc * 1000) / 10).toFixed(1) + "%";
  }

  // Format seconds -> m:ss
  function fmtTime(s) {
    const mm = Math.floor(s / 60);
    const ss = Math.floor(s % 60);
    return `${mm}:${ss < 10 ? "0" : ""}${ss}`;
  }

  // Rating message
  function getRatingMessage(score, acc) {
    if (score === ROUNDS && acc > 0.98) return "🏆 Typing Pro! Flawless victory!";
    if (score >= ROUNDS - 1 && acc >= 0.95) return "🚀 Lightning fingers—superb work!";
    if (score >= Math.floor(ROUNDS / 2)) return "👍 Good job! There's room to improve.";
    if (score >= 1) return "Keep practicing for higher speed and accuracy!";
    return "Try again for a higher score!";
  }

  // --- Scoreboard UI
  function Scoreboard({ onBack }) {
    const entries = getScoreboard();
    return (
      <div className="wtc-scoreboard-bg">
        <div className="wtc-scoreboard-card">
          <h2 className="wtc-sb-title">Word Typing Challenge Scoreboard</h2>
          <table className="wtc-sb-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Score</th>
                <th>Total Time</th>
                <th>Avg Accuracy</th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ textAlign: "center", opacity: 0.7 }}>
                    No scores yet.
                  </td>
                </tr>
              )}
              {entries.map((row, i) => (
                <tr key={i}>
                  <td>{new Date(row.date).toLocaleDateString()}</td>
                  <td>{row.score} / {ROUNDS}</td>
                  <td>{fmtTime(row.totalTime)}</td>
                  <td>{fmtAcc(row.avgAccuracy)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <button className="wtc-btn wtc-sb-backbtn" onClick={onBack}>
            ← Back to Game
          </button>
        </div>
      </div>
    );
  }

  // --- Main Render ---
  if (pageState === "scoreboard") {
    return (
      <Scoreboard onBack={() => setPageState("finished")} />
    );
  }

  return (
    <div className="wtc-root">
      <div className="wtc-blur1"></div>
      <div className="wtc-blur2"></div>
      <main className="wtc-main-card">
        <header className="wtc-header">
          <h2 className="wtc-title">
            <span className="wtc-icon" aria-hidden="true">📝</span> Word Typing Challenge
          </h2>
          <p className="wtc-instructions">
            Type <b>each sentence</b> as fast and accurately as you can. <br />
            <span className="wtc-extra">
            {ROUNDS} rounds • New random sentence each round •
            {` `}
            <b>{TIME_LIMIT} sec</b> per round.
            </span>
          </p>
        </header>
        {pageState === "intro" && (
          <section className="wtc-intro">
            <div className="wtc-sentence-box preview">{sentence}</div>
            <button className="wtc-btn wtc-start-btn" onClick={startGame} tabIndex={0}>
              Start Game
            </button>
            <button
              className="wtc-btn wtc-back-btn"
              onClick={() => navigate("/games")}
              tabIndex={0}
            >
              ← Back to Games
            </button>
          </section>
        )}

        {pageState === "running" && (
          <section className="wtc-round-zone" aria-label="Typing round area">
            <div className="wtc-top-bar">
              <div className="wtc-round-pill">
                Round <b>{currentRound}</b> / {ROUNDS}
              </div>
              <div className="wtc-timer">{timeLeft}s</div>
            </div>
            <div className="wtc-sentence-anim">
              {renderHighlightedSentence()}
            </div>
            <input
              ref={inputRef}
              className="wtc-input"
              type="text"
              value={input}
              disabled={disableInput}
              onChange={handleChange}
              maxLength={sentence.length}
              spellCheck="false"
              tabIndex={0}
              aria-label="Type the sentence here"
              placeholder="Type sentence above..."
              autoFocus
              onKeyDown={handleKeyDown}
            />
            <div className="wtc-input-feedback">
              <span>
                {" "}
                <b>Accuracy:</b> {fmtAcc(
                  sentence.length
                    ? (sentence
                        .split("")
                        .filter(
                          (char, i) => input[i] === char
                        ).length / sentence.length)
                    : null
                )}
              </span>
              {disableInput && pageState === "running" ? (
                <span className="wtc-feedback-msg">
                  Time's up or submitted!
                </span>
              ) : null}
            </div>
            <button
              className="wtc-btn wtc-submit-btn"
              onClick={() => handleSubmit(true)}
              disabled={disableInput || input.length === 0}
              tabIndex={0}
            >
              Submit
            </button>
          </section>
        )}

        {pageState === "finished" && (
          <section className="wtc-finish-zone" aria-label="Game End">
            <div className="wtc-finish-title">
              Game Over!
            </div>
            <div className="wtc-score-row">
              <span className="wtc-score-main">
                Score: <b>{roundScores.reduce((a, b) => a + b, 0)} / {ROUNDS}</b>
              </span>
            </div>
            <div className="wtc-stat-pills">
              <div className="wtc-pill">
                <span className="cap">Avg Accuracy</span>
                <span className="val">{fmtAcc(
                  roundAccuracies.length
                    ? roundAccuracies.reduce((a, b) => a + b, 0) / roundAccuracies.length
                    : null
                )}</span>
              </div>
              <div className="wtc-pill">
                <span className="cap">Total Time</span>
                <span className="val">{fmtTime(
                  roundTimes.length
                    ? roundTimes.reduce((a, b) => a + b, 0)
                    : 0
                )}</span>
              </div>
            </div>
            <div className="wtc-rating-msg">
              {getRatingMessage(
                roundScores.reduce((a, b) => a + b, 0),
                roundAccuracies.length
                  ? roundAccuracies.reduce((a, b) => a + b, 0) / roundAccuracies.length
                  : null
              )}
            </div>
            <div className="wtc-end-btns">
              <button
                className="wtc-btn play-again"
                onClick={handlePlayAgain}
                tabIndex={0}
              >
                <span aria-hidden="true">↻</span> Play Again
              </button>
              <button
                className="wtc-btn scoreboard"
                onClick={() => setPageState("scoreboard")}
                tabIndex={0}
              >
                <span aria-hidden="true">📈</span> View Scoreboard
              </button>
              <button
                className="wtc-btn wtc-back-btn"
                onClick={() => navigate("/games")}
                tabIndex={0}
              >
                ← Back to Games
              </button>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default WordTypingChallengePage;
