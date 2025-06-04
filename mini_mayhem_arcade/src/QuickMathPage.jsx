import React, { useState, useEffect, useRef } from "react";
import "./QuickMathPage.css";
import { useNavigate } from "react-router-dom";

// Supported arithmetic operations configuration
const OPERATORS = [
  { symbol: "+", fn: (a, b) => a + b, name: "plus" },
  { symbol: "-", fn: (a, b) => a - b, name: "minus" },
  { symbol: "×", fn: (a, b) => a * b, name: "times" },
  { symbol: "÷", fn: (a, b) => Math.floor(a / b), name: "div" }, // integer div
];

// Minimum & maximum for operand generation
const MIN_OPERAND = 2;
const MAX_OPERAND = 24;
const MIN_MULT = 2;
const MAX_MULT = 12;

// Number of options per question
const OPTION_COUNT = 4;

// Number of total questions is undefined; generate as fast as player answers within 60s
const GAME_SECONDS = 60;

// Key for localStorage score
const STORAGE_KEY = "quickMathScore";

// Rating by percent correct
function getPerformanceRating(score, attempted) {
  if (!attempted) return "";
  const percent = (score / attempted) * 100;
  if (percent >= 95 && attempted >= 16) return "🌟 Math Genius!";
  if (percent >= 85 && attempted >= 13) return "🏆 Excellent!";
  if (percent >= 70) return "🎉 Good job!";
  if (percent >= 50) return "👍 Not bad!";
  return "Keep practicing!";
}

// Generate a new random arithmetic question & answer choices
function generateMathQuestion() {
  // Randomly pick operator
  const opIdx = Math.floor(Math.random() * OPERATORS.length);
  const op = OPERATORS[opIdx];
  let a, b, answer;
  switch (op.symbol) {
    case "+":
      a = randInt(MIN_OPERAND, MAX_OPERAND);
      b = randInt(MIN_OPERAND, MAX_OPERAND);
      answer = op.fn(a, b);
      break;
    case "-":
      b = randInt(MIN_OPERAND, MAX_OPERAND - 2);
      a = randInt(b, MAX_OPERAND);
      answer = op.fn(a, b);
      break;
    case "×":
      a = randInt(MIN_MULT, MAX_MULT);
      b = randInt(MIN_MULT, MAX_MULT);
      answer = op.fn(a, b);
      break;
    case "÷":
      // Ensure divisible, no fractions, no zero div
      b = randInt(MIN_MULT, Math.min(12, MAX_MULT));
      answer = randInt(MIN_MULT, MAX_MULT);
      a = answer * b;
      break;
    default:
      a = randInt(1, 10); b = randInt(1, 10); answer = op.fn(a, b);
  }
  // Format readable
  return {
    text: `${a} ${op.symbol} ${b} = ?`,
    answer,
    options: shuffleOptions(answer, op.symbol),
  };
}

// Generate plausible wrong answers, then shuffle
function shuffleOptions(correct, op) {
  const options = [correct];
  const fudge = op === "÷" ? 2 : 3;
  while (options.length < OPTION_COUNT) {
    let delta = randInt(-fudge, fudge);
    if (delta === 0) delta = 1;
    let val = correct + delta * randInt(1, op === "÷" ? 1 : 2);
    if (op === "÷" && val < 1) val = 1;
    if (!options.includes(val) && Number.isFinite(val)) {
      options.push(val);
    }
  }
  // Shuffle options
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }
  return options;
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// PUBLIC_INTERFACE
/**
 * QuickMathPage: 60s timed arithmetic quiz game with score and rating.
 */
function QuickMathPage() {
  // GAME STATES
  const [gameState, setGameState] = useState("idle"); // idle | running | finished
  const [timer, setTimer] = useState(GAME_SECONDS);
  const [currentQ, setCurrentQ] = useState(generateMathQuestion());
  const [score, setScore] = useState(0);
  const [attempted, setAttempted] = useState(0);
  const [lastAnswerIdx, setLastAnswerIdx] = useState(null); // For feedback
  const [showAnswer, setShowAnswer] = useState(false); // Show correct/incorrect feedback
  const [history, setHistory] = useState([]);
  const [storedBest, setStoredBest] = useState(getStoredScore());
  const timerRef = useRef();
  const navigate = useNavigate();

  // get best stored (localStorage)
  function getStoredScore() {
    if (typeof window === "undefined") return null;
    try {
      const val = window.localStorage.getItem(STORAGE_KEY);
      if (val !== null && !isNaN(Number(val))) return Number(val);
    } catch {}
    return null;
  }

  // Start game
  function handleStart() {
    setGameState("running");
    setScore(0);
    setAttempted(0);
    setTimer(GAME_SECONDS);
    setCurrentQ(generateMathQuestion());
    setShowAnswer(false);
    setLastAnswerIdx(null);
    setHistory([]);
  }

  // GAME TIMER
  useEffect(() => {
    if (gameState !== "running") {
      clearInterval(timerRef.current);
      return;
    }
    timerRef.current = setInterval(() => {
      setTimer((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          setGameState("finished");
          handleSaveScore(score+0); // Save best score at END
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
    // eslint-disable-next-line
  }, [gameState]);

  // For on finish: handle save and update best
  function handleSaveScore(latest) {
    if (typeof window === "undefined") return;
    let prev = null;
    try {
      const value = window.localStorage.getItem(STORAGE_KEY);
      if (value !== null && !isNaN(Number(value))) prev = Number(value);
    } catch {}
    if (prev == null || latest > prev) {
      window.localStorage.setItem(STORAGE_KEY, latest);
      setStoredBest(latest);
    }
  }

  // Answer selection handler
  function handleAnswer(idx) {
    // Don't allow after timer done or while showing animation
    if (gameState !== "running" || showAnswer) return;

    setLastAnswerIdx(idx);
    setShowAnswer(true);

    const correct = currentQ.options[idx] === currentQ.answer;
    setAttempted((a) => a + 1);
    setScore((s) => correct ? s + 1 : s);
    setHistory((h) =>
      h.concat({
        question: currentQ.text,
        options: currentQ.options,
        picked: currentQ.options[idx],
        isCorrect: correct,
      })
    );

    // Briefly show if correct, then next question
    setTimeout(() => {
      setShowAnswer(false);
      setLastAnswerIdx(null);
      setCurrentQ(generateMathQuestion());
    }, 600);
  }

  // Keyboard support: numbers 1-4 as option shortcuts
  useEffect(() => {
    if (gameState !== "running" || showAnswer) return;
    function handler(e) {
      if (e.key.length === 1 && "1234".includes(e.key)) {
        handleAnswer(Number(e.key) - 1);
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line
  }, [gameState, showAnswer, currentQ]);

  // Save score at finish if not already (ensure once only)
  useEffect(() => {
    if (gameState === "finished") {
      handleSaveScore(score);
    }
    // eslint-disable-next-line
  }, [gameState]);

  // Format timer mm:ss
  function formatTime(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  }

  // --- Main UI Render ---
  return (
    <div className="quickmath-root">
      <div className="qm-blur-bg1"></div>
      <div className="qm-blur-bg2"></div>
      <main className="qm-main-card">
        <header className="qm-header">
          <h2 className="qm-title">
            <span className="qm-emoji" aria-hidden="true">➗</span>
            Quick Math
          </h2>
          <div className="qm-pill-group">
            <Pill label="Time" value={formatTime(timer)} accent />
            <Pill label="Score" value={score} />
            <button className="qm-btn qm-restart-btn"
              aria-label={gameState === "idle" ? "Start Game" : "Restart Game"}
              onClick={handleStart}
              tabIndex={0}
            >
              {gameState === "idle" ? "Start" : <span aria-hidden="true">↻</span>} {gameState === "idle" ? "Play" : "Restart"}
            </button>
          </div>
        </header>

        {/* GAME ZONE */}
        {gameState === "idle" && (
          <section className="qm-instructions">
            <div className="qm-instr-emoji" aria-hidden="true">🧮</div>
            <div className="qm-desc">
              Rapid-fire math! Answer as many as you can in <b>60 seconds</b>.<br />
              Each question: <span className="qm-mathops">+, -, ×, ÷</span>. Choose the right answer!
            </div>
            <button className="qm-btn qm-play-btn" onClick={handleStart} tabIndex={0}>Start Game</button>
            <div className="qm-best-row">
              <span className="qm-best-label">Your Best:</span>{" "}
              <span className="qm-best-score">
                {storedBest !== null ? storedBest : "No score yet"}
              </span>
            </div>
            <button className="qm-btn qm-back-btn"
              onClick={() => navigate("/games")}
              tabIndex={0}
            >← Back to Games</button>
          </section>
        )}

        {gameState === "running" && (
          <section className="qm-question-zone">
            <div className="qm-q-big" aria-label="Current math question">
              {currentQ.text}
            </div>
            <div className="qm-options-row">
              {currentQ.options.map((opt, i) => {
                let btnClass = "qm-opt-btn";
                if (showAnswer) {
                  if (i === lastAnswerIdx) {
                    btnClass += opt === currentQ.answer ? " correct" : " wrong";
                  }
                  if (opt === currentQ.answer) btnClass += " correct";
                }
                return (
                  <button
                    key={i}
                    className={btnClass}
                    disabled={showAnswer}
                    onClick={() => handleAnswer(i)}
                    tabIndex={0}
                    aria-label={`Option ${i+1}: ${opt} ${showAnswer && opt===currentQ.answer ? '(correct)' : ''}`}
                  >
                    <span className="opt-index">{i + 1}</span>
                    <span>{opt}</span>
                  </button>
                );
              })}
            </div>
            <div className="qm-attempt-counter">
              Attempted: <b>{attempted}</b>
            </div>
            <div className="qm-tip-row">
              <span>Tip: Use keys <b>1-4</b> for quick select!</span>
            </div>
          </section>
        )}

        {gameState === "finished" && (
          <section className="qm-endresults-zone">
            <div className="qm-final-msg">⏰ Time's up!</div>
            <div className="qm-result-pills">
              <Pill label="Score" value={score} accent />
              <Pill label="Attempted" value={attempted} />
              <Pill label="Accuracy" value={(attempted ? Math.round((score/attempted)*100) : 0) + "%"} />
            </div>
            <div className="qm-rating-msg">{getPerformanceRating(score, attempted)}</div>
            <div className="qm-best-row">
              <span className="qm-best-label">Your Best:</span>{" "}
              <span className="qm-best-score">
                {storedBest !== null ? storedBest : score}
              </span>
            </div>
            <button className="qm-btn qm-play-btn" onClick={handleStart}>Play Again</button>
            <button className="qm-btn qm-back-btn"
              onClick={() => navigate("/games")}
            >← Back to Games</button>
          </section>
        )}
      </main>
    </div>
  );
}

// Pill badge component
function Pill({ label, value, accent }) {
  return (
    <span className={"qm-pill" + (accent ? " accent" : "")}>
      <span className="qm-pill-label">{label}</span>
      <span className="qm-pill-value">{value}</span>
    </span>
  );
}

export default QuickMathPage;
