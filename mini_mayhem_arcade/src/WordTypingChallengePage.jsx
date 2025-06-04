import React, { useEffect, useRef, useState } from "react";
import "./WordTypingChallengePage.css";
import { useNavigate } from "react-router-dom";

// PUBLIC_INTERFACE
/**
 * WordTypingChallengePage: Dynamic typing game with randomized sentences,
 * scoring, timer, live feedback, localStorage scoreboard, animations, and theme support.
 */
const SENTENCES = [
  "The fox jumped over seven lazy dogs in the bright sun.",
  "Coding challenges help improve your JavaScript skills quickly.",
  "Typing fast and accurately is a valuable digital age talent.",
  "MiniMayhem Arcade has fun games for everyone to enjoy.",
  "Remember to save your best score and keep practicing daily!",
  "She sells seashells by the seashore with radiant enthusiasm.",
  "A wizard's job is to vex chumps quickly in fog.",
  "Grumpy wizards make toxic brew for the evil queen and jack.",
  "Sphinx of black quartz, judge my vow with zeal.",
  "Pack my box with five dozen liquor jugs for the win."
];
const ROUND_LENGTH = 5; // Sentences per game
const TIME_LIMIT = 60; // seconds

const LS_KEY = "mmarcade-wordtyping-best";
function getBestScore() {
  if (typeof window === "undefined") return { score: 0, wpm: 0, acc: 0 };
  try {
    const val = window.localStorage.getItem(LS_KEY);
    if (val) {
      const parsed = JSON.parse(val);
      if (
        typeof parsed.score === "number" &&
        typeof parsed.wpm === "number" &&
        typeof parsed.acc === "number"
      ) {
        return parsed;
      }
    }
  } catch {}
  return { score: 0, wpm: 0, acc: 0 };
}
function saveBestScore(score, wpm, acc) {
  if (typeof window === "undefined") return;
  const prev = getBestScore();
  // Best = highest score (or, if tied, best wpm, then best accuracy)
  const isBetter =
    score > prev.score ||
    (score === prev.score && wpm > prev.wpm) ||
    (score === prev.score && wpm === prev.wpm && acc > prev.acc);
  if (isBetter) {
    window.localStorage.setItem(
      LS_KEY,
      JSON.stringify({ score, wpm, acc })
    );
  }
}

// Helper: pick N random unique items from array
function pickRandom(arr, n) {
  const src = arr.slice();
  const res = [];
  for (let i = 0; i < n && src.length; ++i) {
    const idx = Math.floor(Math.random() * src.length);
    res.push(src[idx]);
    src.splice(idx, 1);
  }
  return res;
}

// Helper: get current theme
function getCurrentTheme() {
  if (typeof window === "undefined") return "light";
  return document.documentElement.getAttribute("data-theme") || "light";
}

function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s < 10 ? "0" : ""}${s}`;
}

function ratingMessage(score, acc, wpm) {
  if (score === ROUND_LENGTH && acc > 0.96 && wpm > 55) 
    return "Typing Ace! 🌟 All correct, blazing fast!";
  if (score === ROUND_LENGTH && acc > 0.92)
    return "🏆 100% Completion – Top accuracy!";
  if (score >= ROUND_LENGTH - 1 && wpm > 47)
    return "Great effort, awesome speed!";
  if (wpm > 35 && acc > 0.8)
    return "Solid speed – keep honing your skills!";
  if (score < 2)
    return "Keep practicing for higher scores!";
  return "Well done! Challenge yourself again!";
}

// PUBLIC_INTERFACE
function WordTypingChallengePage() {
  const [round, setRound] = useState(0);
  const [totalScore, setTotalScore] = useState(0);
  const [timer, setTimer] = useState(TIME_LIMIT);
  const [gameState, setGameState] = useState("idle"); // idle | running | finished
  const [sentenceList, setSentenceList] = useState([]);
  const [currentSentence, setCurrentSentence] = useState("");
  const [userInput, setUserInput] = useState("");
  const [feedback, setFeedback] = useState([]);
  const [inputError, setInputError] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [endTime, setEndTime] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [theme, setTheme] = useState(getCurrentTheme());

  const [bestScore, setBestScore] = useState(getBestScore());
  const inputRef = useRef();
  const timerRef = useRef();
  const navigate = useNavigate();

  // Update theme for live css transitions
  useEffect(() => {
    function handleThemeChange() {
      setTheme(getCurrentTheme());
    }
    window.addEventListener("storage", handleThemeChange);
    return () => window.removeEventListener("storage", handleThemeChange);
  }, []);
  
  // Setup sentences when new game starts
  function initializeGame() {
    const randomized = pickRandom(SENTENCES, ROUND_LENGTH);
    setSentenceList(randomized);
    setRound(0);
    setTotalScore(0);
    setUserInput("");
    setCurrentSentence(randomized[0]);
    setFeedback([]);
    setInputError(false);
    setGameState("running");
    setStartTime(Date.now());
    setEndTime(null);
    setModalOpen(false);
    setTimer(TIME_LIMIT);
    setTimeout(() => { inputRef.current && inputRef.current.focus(); }, 60);
  }

  // Timer (countdown, high precision, independent of typing speed)
  useEffect(() => {
    if (gameState !== "running") return;
    timerRef.current = setInterval(() => {
      setTimer((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          setTimer(0);
          setGameState("finished");
          setEndTime(Date.now());
          setTimeout(() => setModalOpen(true), 650);
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [gameState]);

  // Live feedback for each char while typing
  useEffect(() => {
    if (!currentSentence) return;
    const arr = [];
    for (let i = 0; i < currentSentence.length; ++i) {
      if (userInput[i] == null) {
        arr.push("pending");
      } else if (userInput[i] === currentSentence[i]) {
        arr.push("good");
      } else {
        arr.push("wrong");
      }
    }
    setFeedback(arr);
  }, [userInput, currentSentence]);

  // Keyboard support: Enter submits
  function handleKeyDown(e) {
    if (e.key === "Enter" && gameState === "running") {
      handleSubmit();
      e.preventDefault();
    }
  }

  // Typing input handler
  function handleChange(e) {
    if (gameState !== "running") return;
    setUserInput(e.target.value);
    setInputError(false);
  }

  function handleSubmit() {
    if (gameState !== "running") return;
    // judge current input: score, accuracy
    const correct = userInput.trim() === currentSentence.trim();
    let scoreAdd = 0;
    if (correct) scoreAdd = 1;
    setTotalScore((s) => s + scoreAdd);

    if (!correct) setInputError(true);

    // If last round, finish
    if (round === ROUND_LENGTH - 1 || timer <= 0) {
      setGameState("finished");
      setEndTime(Date.now());
      setTimeout(() => setModalOpen(true), 650);
      // Save best score if improved
      const summary = computeStats(sentenceList, userInput, round + 1, startTime, Date.now(), totalScore + scoreAdd);
      saveBestScore(summary.score, summary.wpm, summary.acc);
      setBestScore(getBestScore());
      return;
    }

    // Next round
    setTimeout(() => {
      setRound(r => r + 1);
      setCurrentSentence(sentenceList[round + 1]);
      setUserInput("");
      setFeedback([]);
      setInputError(false);
      setTimeout(() => { inputRef.current && inputRef.current.focus(); }, 40);
    }, correct ? 250 : 800);
  }

  function handleRestart() {
    initializeGame();
  }

  function handleBack() {
    navigate("/games");
  }

  // End-of-game stats
  function computeStats(sentenceArr, lastInput, n, start, end, scoreOverride = null) {
    const totalChars = sentenceArr.slice(0, n).join("").length;
    let charsTyped = 0;
    let correctChars = 0;
    for (let i = 0; i < n; ++i) {
      const target = sentenceArr[i];
      const input = i === n - 1 ? lastInput : ""; // Only the last input typed (per round) is kept
      charsTyped += input.length;
      for (let j = 0; j < target.length && j < input.length; ++j) {
        if (target[j] === input[j]) correctChars++;
      }
    }
    // Actually, we consider all input lengths
    // Reset for this, as we track correct full sentences completed in totalScore
    const timeSec = Math.max(1, (end - start) / 1000);
    const wpm = Math.round((charsTyped / 5) / (timeSec / 60));
    // Accuracy: over total chars attempted
    const acc = charsTyped === 0 ? 1 : correctChars / charsTyped;
    const score = scoreOverride == null ? totalScore : scoreOverride;
    return { wpm, acc, score, charsTyped, timeSec };
  }

  // When modal opens, persist best score
  useEffect(() => {
    if (!modalOpen) return;
    const sum = computeStats(sentenceList, userInput, round + 1, startTime, endTime, totalScore);
    saveBestScore(sum.score, sum.wpm, sum.acc);
    setBestScore(getBestScore());
    // eslint-disable-next-line
  }, [modalOpen]);

  // Anim trigger on round change
  useEffect(() => {
    const node = document.querySelector(".wtc-sentence");
    if (node) {
      node.classList.remove("wtc-fade-in");
      void node.offsetWidth; // trigger reflow
      node.classList.add("wtc-fade-in");
    }
  }, [currentSentence]);

  // UI
  return (
    <div className={`wtc-root${theme === "dark" ? " dark" : ""}`}>
      <div className="wtc-bg1"></div>
      <div className="wtc-bg2"></div>
      <main className="wtc-main-card" tabIndex={-1}>
        <header className="wtc-header">
          <h2 className="wtc-title">
            <span className="wtc-emoji" aria-hidden="true">✍️</span> Word Typing Challenge
          </h2>
          <p className="wtc-instr">
            Type the sentences fast and accurately. You have <b>{ROUND_LENGTH}</b> challenges and <b>{TIME_LIMIT}</b> seconds total!
          </p>
        </header>

        {/* Timer and Scoreboard */}
        <div className="wtc-topbar-row">
          <div className="wtc-pill time" aria-label="Time left">
            <span className="label">Time</span>
            <span className="value">{formatTime(timer)}</span>
          </div>
          <div className="wtc-pill score" aria-label="Score">
            <span className="label">Score</span>
            <span className="value">{totalScore}</span>
          </div>
          <div className="wtc-pill round" aria-label="Sentence number">
            <span className="label">Round</span>
            <span className="value">{round + 1}/{ROUND_LENGTH}</span>
          </div>
        </div>

        {/* Animated sentence display */}
        <div className="wtc-sentence-zone">
          <div className="wtc-sentence" aria-label="Current typing challenge" tabIndex={0}>
            {[...currentSentence].map((char, i) =>
              <span key={i} className={"wtc-char " +
                (feedback[i] === "good" ? "good" :
                  feedback[i] === "wrong" ? "wrong" : "pending")
              }>{char}</span>
            )}
          </div>
        </div>

        {/* Typing input + controls */}
        <div className="wtc-input-row">
          <input
            ref={inputRef}
            className={`wtc-input${inputError ? " error" : ""}`}
            type="text"
            maxLength={currentSentence.length}
            value={userInput}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            spellCheck={false}
            disabled={gameState !== "running"}
            placeholder={gameState === "idle" ? "Press Start to play!" : ""}
            aria-label="Type the sentence here"
            autoFocus={gameState === "running"}
          />
          <button
            className="wtc-btn submit"
            onClick={handleSubmit}
            disabled={userInput.length === 0 || gameState !== "running"}
          >Submit</button>
        </div>

        {/* Guidance or error */}
        <div className="wtc-feedback" aria-live="polite">
          {inputError ? (
            <span className="wtc-error-msg">Incorrect, try again!</span>
          ) : gameState === "idle" ? (
            <>Get ready! Click <b>Start</b> for a fresh challenge.</>
          ) : (
            <>&nbsp;</>
          )}
        </div>

        {/* Controls */}
        <div className="wtc-actions-row">
          {gameState === "idle" && (
            <button className="wtc-btn start" onClick={initializeGame} tabIndex={0}>
              Start
            </button>
          )}
          {(gameState === "finished" || modalOpen) && (
            <button className="wtc-btn playagain" onClick={handleRestart} tabIndex={0}>
              <span aria-hidden="true">↺</span> Play Again
            </button>
          )}
          <button className="wtc-btn back" onClick={handleBack} tabIndex={0}>
            ← Back to Games
          </button>
        </div>

        {/* Modal: End of game stats */}
        {modalOpen && (
          <ResultModal
            open={modalOpen}
            sentenceArr={sentenceList}
            n={round + 1}
            start={startTime}
            end={endTime ?? Date.now()}
            score={totalScore}
            best={bestScore}
            onReplay={handleRestart}
            onClose={() => setModalOpen(false)}
            userInput={userInput}
          />
        )}
      </main>
    </div>
  );
}

// Modal result overlay
function ResultModal({ open, sentenceArr, n, start, end, score, best, onReplay, onClose, userInput }) {
  // Compute WPM, accuracy, etc.
  const totalChars = sentenceArr.slice(0, n).join("").length;
  let charsTyped = 0, correctChars = 0;
  for (let i = 0; i < n; ++i) {
    const target = sentenceArr[i];
    const input = i === n - 1 ? userInput : ""; // Only last input captured
    charsTyped += input.length;
    for (let j = 0; j < target.length && j < input.length; ++j) {
      if (target[j] === input[j]) correctChars++;
    }
  }
  const timeSec = Math.max(1, (end - start) / 1000);
  const wpm = Math.round((charsTyped / 5) / (timeSec / 60));
  const acc = charsTyped === 0 ? 1 : correctChars / charsTyped;

  return (
    <div className={`wtc-modal-backdrop${open ? " open" : ""}`}>
      <div className="wtc-modal-content" role="dialog" aria-modal="true">
        <div className="wtc-modal-title">
          <span role="img" aria-label="trophy" className="wtc-modal-trophy">🏆</span> Finished!
        </div>
        <div className="wtc-modal-stats">
          <div className="wtc-modal-pill">
            <span className="label">Score</span>
            <span className="value">{score}</span>
          </div>
          <div className="wtc-modal-pill">
            <span className="label">WPM</span>
            <span className="value">{wpm}</span>
          </div>
          <div className="wtc-modal-pill">
            <span className="label">Accuracy</span>
            <span className="value">{Math.round(acc * 1000) / 10}%</span>
          </div>
        </div>
        <div className="wtc-modal-rating">{ratingMessage(score, acc, wpm)}</div>
        <div className="wtc-modal-best-row">
          <span className="wtc-modal-best-label">Your Best:</span>
          <span className="wtc-modal-best-score">
            {typeof best.score === "number" && best.score > 0
              ? `${best.score} pts, ${best.wpm} WPM, ${Math.round(best.acc * 1000) / 10}%`
              : "No score yet"}
          </span>
        </div>
        <button className="wtc-btn playagain" onClick={onReplay} autoFocus>
          <span aria-hidden="true">↺</span> Replay
        </button>
        <button className="wtc-btn modal-close" onClick={onClose}>Close</button>
      </div>
    </div>
  );
}

export default WordTypingChallengePage;
