import React, { useEffect, useRef, useState } from "react";
import "./MemoryGamePage.css";
import { useNavigate } from "react-router-dom";

// Set of unique emojis to use for cards (8 pairs for 4x4 grid)
const EMOJIS = [
  "🐶","🐱","🎲","🍕",
  "🚗","🌈","⚡","👾"
];

// PUBLIC_INTERFACE
function MemoryGamePage() {
  const [cards, setCards] = useState([]);
  const [flipped, setFlipped] = useState([]); // indices of flipped up cards
  const [matched, setMatched] = useState([]); // indices of matched cards
  const [moves, setMoves] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameWon, setGameWon] = useState(false);
  const [timer, setTimer] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const timerRef = useRef();
  const navigate = useNavigate(); // Always call the hook; if not in a router context, it returns a no-op function

  // Shuffle and reset board
  function initializeBoard() {
    const doubled = [...EMOJIS, ...EMOJIS];
    for (let i = doubled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i+1));
      [doubled[i], doubled[j]] = [doubled[j], doubled[i]];
    }
    setCards(doubled.map((icon, i) => ({
      id: i,
      icon,
      flipped: false
    })));
    setFlipped([]);
    setMatched([]);
    setMoves(0);
    setTimer(0);
    setModalOpen(false);
    setGameWon(false);
    setGameStarted(false);
    setTimerActive(false);
  }

  useEffect(() => {
    initializeBoard();
    // eslint-disable-next-line
  }, []);

  // Timer logic
  useEffect(() => {
    if (timerActive) {
      timerRef.current = setInterval(() => setTimer(t => t + 1), 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    return () => { clearInterval(timerRef.current); };
  }, [timerActive]);

  // Card click logic
  function handleCardClick(idx) {
    if (flipped.length >= 2 || flipped.includes(idx) || matched.includes(idx)) return;
    if (!gameStarted) {
      setGameStarted(true);
      setTimerActive(true);
    }
    const nextFlipped = [...flipped, idx];
    setFlipped(nextFlipped);

    if (nextFlipped.length === 2) {
      setMoves(moves + 1);
      const firstIdx = nextFlipped[0];
      const secondIdx = nextFlipped[1];
      if (cards[firstIdx].icon === cards[secondIdx].icon) {
        // It's a match!
        setTimeout(() => {
          setMatched(prev => [...prev, firstIdx, secondIdx]);
          setFlipped([]);
        }, 650);
      } else {
        // Not a match
        setTimeout(() => {
          setFlipped([]);
        }, 900);
      }
    }
  }

  // Win check
  useEffect(() => {
    if (matched.length === cards.length && cards.length > 0) {
      setTimerActive(false);
      setGameWon(true);
      setTimeout(() => setModalOpen(true), 700);
      updateHighScore();
    }
    // eslint-disable-next-line
  }, [matched, cards.length]);

  // For "Restart" button
  function handleRestart() {
    initializeBoard();
  }

  // Format timer mm:ss
  function formatTime(s) {
    const m = Math.floor(s/60);
    const ss = s % 60;
    return `${m}:${ss < 10 ? "0" : ""}${ss}`;
  }

  // Save best score to localStorage
  function updateHighScore() {
    if (typeof window === "undefined") return;
    const prev = JSON.parse(window.localStorage.getItem("mmarcade-memgame-highscore") || "{}");
    const bestMoves = (prev && typeof prev.moves === "number") ? prev.moves : null;
    const bestTime = (prev && typeof prev.time === "number") ? prev.time : null;
    let improved = false;
    // Moves prioritized first
    if (!bestMoves || moves < bestMoves || (moves === bestMoves && timer < bestTime)) {
      improved = true;
      window.localStorage.setItem("mmarcade-memgame-highscore", JSON.stringify({
        moves, time: timer
      }));
    }
    return improved;
  }

  // Modal overlay
  function ResultModal({ open, moves, time, onClose, onReplay }) {
    // Best scores for this device
    let bestMoves, bestTime;
    if (typeof window !== "undefined") {
      const best = JSON.parse(window.localStorage.getItem("mmarcade-memgame-highscore") || "{}");
      bestMoves = best.moves; bestTime = best.time;
    }
    return (
      <div className={`modal-backdrop${open ? " open" : ""}`}>
        <div className="modal-content" role="dialog" aria-modal="true">
          <span className="modal-trophy">🏆</span>
          <div className="modal-title">You Won!</div>
          <div className="modal-stats">
            <div className="modal-stat-pill moves">
              <span className="caption">Moves</span>
              <span className="value">{moves}</span>
            </div>
            <div className="modal-stat-pill time">
              <span className="caption">Time</span>
              <span className="value">{formatTime(time)}</span>
            </div>
          </div>
          <div className="modal-best-row">
            <span className="modal-best-label">Your Best: </span>
            <span className="modal-best-score">{bestMoves ? `${bestMoves} moves, ${formatTime(bestTime)}` : "-"}</span>
          </div>
          <button className="btn accent replay-btn" onClick={onReplay} autoFocus>
            Replay
          </button>
          {navigate &&
            <button className="btn modal-link-btn" onClick={() => navigate("/games")}>
              Back to Games
            </button>
          }
        </div>
      </div>
    )
  }

  // For accessibility: Allow "R" to restart
  useEffect(() => {
    const handler = e => {
      if (!modalOpen && (e.key === "r" || e.key === "R")) {
        handleRestart();
      }
      if (modalOpen && (e.key === "Enter" || e.key === " ")) {
        handleRestart();
        setModalOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line
  }, [modalOpen]);

  // Render card grid
  return (
    <div className="memgame-root">
      {/* Blurred floating shapes - decorative */}
      <div className="blur-bg1"></div>
      <div className="blur-bg2"></div>
      <section className="memgame-main">
        <header className="memgame-header">
          <h2 className="memgame-title">
            <span className="brain-emoji">🧠</span> Memory Game
          </h2>
          <div className="pill-group">
            <Pill caption="Time" value={formatTime(timer)} accent />
            <Pill caption="Moves" value={moves} />
            <button className="btn restart-btn" aria-label="Restart Game" onClick={handleRestart}>
              <span aria-hidden="true">↻</span> Restart
            </button>
          </div>
        </header>
        {/* Game Board */}
        <div className="memgame-board" aria-label="Memory game card grid">
          {cards.map((c, i) => {
            const isFlipped = flipped.includes(i) || matched.includes(i);
            return (
              <Card
                key={c.id}
                icon={c.icon}
                flipped={isFlipped}
                disabled={flipped.length === 2 || matched.includes(i)}
                onClick={() => handleCardClick(i)}
                tabIndex={isFlipped ? -1 : 0}
                ariaLabel={isFlipped ? "Matched" : "Flip card"}
                />
            );
          })}
        </div>
        {/* Instructions for first visit */}
        {!gameStarted && !gameWon && (
          <div className="memgame-tip">Flip two cards at a time. Match all pairs as fast as you can!</div>
        )}
      </section>
      {/* Result Modal */}
      <ResultModal
        open={modalOpen}
        moves={moves}
        time={timer}
        onReplay={() => { handleRestart(); setModalOpen(false); }}
      />
    </div>
  );
}

// Card component
function Card({ icon, flipped, disabled, onClick, tabIndex, ariaLabel }) {
  return (
    <button
      className={`memcard${flipped ? " flipped" : ""}${disabled ? " disabled" : ""}`}
      onClick={disabled ? undefined : onClick}
      tabIndex={tabIndex}
      aria-label={ariaLabel}
      disabled={disabled}
    >
      <span className="memcard-inner">
        <span className="memcard-front">{icon}</span>
        <span className="memcard-back"></span>
      </span>
    </button>
  );
}

// Small pill-style info
function Pill({ caption, value, accent }) {
  return (
    <span className={`pill${accent ? " accent" : ""}`}>
      <span className="pill-caption">{caption}</span>
      <span className="pill-value">{value}</span>
    </span>
  );
}

export default MemoryGamePage;
