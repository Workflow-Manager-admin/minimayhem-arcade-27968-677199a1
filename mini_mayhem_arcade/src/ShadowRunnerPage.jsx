import React, { useRef, useState, useEffect, useCallback } from "react";
import "./ShadowRunnerPage.css";

// Runner constants/config
const GAME_WIDTH = 600;
const GAME_HEIGHT = 260;
const GROUND_HEIGHT = 48;
const PLAYER_W = 42;
const PLAYER_H = 50;
const OBSTACLE_MIN_W = 20;
const OBSTACLE_MAX_W = 42;
const OBSTACLE_MIN_H = 28;
const OBSTACLE_MAX_H = 65;
const OBSTACLE_MIN_GAP = 160;
const OBSTACLE_MAX_GAP = 280;
const PLAYER_SPEED = 3.0;
const GRAVITY = 0.82;
const JUMP_V0 = 10.7;      // starting vertical velocity for jump
const SLIDE_DURATION = 23; // (frames at 60fps)
const CLONE_COUNT = 3;
const GAME_KEY = "shadowRunnerBestScore";

// Utility for adaptive dark/light detection
function useAdaptiveTheme() {
  const [theme, setTheme] = useState(() => {
    if (typeof window !== "undefined" && window.localStorage.getItem("mmarcade-theme"))
      return window.localStorage.getItem("mmarcade-theme");
    if (typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches)
      return "dark";
    return "light";
  });
  useEffect(() => {
    function updateTheme() {
      const t = document.documentElement.getAttribute("data-theme");
      setTheme(t || "light");
    }
    window.addEventListener("storage", updateTheme);
    updateTheme();
    return () => window.removeEventListener("storage", updateTheme);
  }, []);
  return theme;
}

// --- Main component ---
// PUBLIC_INTERFACE
export default function ShadowRunnerPage() {
  // Gameplay State
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [showGameOver, setShowGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(() => {
    if (typeof window !== 'undefined') {
      const s = window.localStorage.getItem(GAME_KEY);
      return s ? Number(s) : 0;
    }
    return 0;
  });
  const [distance, setDistance] = useState(0);
  const [obstacles, setObstacles] = useState([]);
  const [player, setPlayer] = useState({
    x: 40,
    y: GAME_HEIGHT - GROUND_HEIGHT - PLAYER_H,
    vy: 0,
    isJumping: false,
    isSliding: false,
    slideTimer: 0,
    width: PLAYER_W,
    height: PLAYER_H,
    grounded: true,
  });

  // Controls memory (stores array of last 3 move histories for clones)
  const [pastRuns, setPastRuns] = useState([[],[],[]]); // up to 3 previous runs
  const [cloneActiveFrames, setCloneActiveFrames] = useState([0,0,0]);

  // Runner history for this run - records time series of player actions for shadow clone replay
  const [runHistory, setRunHistory] = useState([]);

  // On-screen controls visible logic (mobile)
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? /Android|iPhone|iPad|iPod|Mobile|Touch/.test(navigator.userAgent) : false
  );

  // Animation loop
  const reqRef = useRef(0);
  const frameRef = useRef(0);

  // Background movement
  const [bgX, setBgX] = useState(0);

  // Theme (light/dark) for visuals
  const theme = useAdaptiveTheme();

  // --- EFFECTS ---

  // Responsive handling: mobile/touch for controls
  useEffect(() => {
    function handleResize() {
      setIsMobile(window.innerWidth < 660 || /Mobile|Touch/.test(navigator.userAgent));
    }
    window.addEventListener("resize", handleResize);
    handleResize();
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Keyboard listeners
  useEffect(() => {
    if (!isPlaying || isPaused) return;

    function handleKeyDown(e) {
      if (e.repeat) return;
      if (e.key === " " || e.key.toLowerCase() === "w" || e.key === "ArrowUp") {
        jumpAction();
      }
      if (e.key.toLowerCase() === "s" || e.key === "ArrowDown") {
        slideAction();
      }
      if (e.key.toLowerCase() === "p") {
        pauseAction();
      }
      if (e.key === "Escape") {
        pauseAction();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  // Main game loop (run only isPlaying & not paused)
  useEffect(() => {
    if (!isPlaying || isPaused) return;
    let animationRunning = true;

    function gameLoop() {
      stepFrame();
      if (animationRunning) {
        reqRef.current = requestAnimationFrame(gameLoop);
      }
    }
    reqRef.current = requestAnimationFrame(gameLoop);

    return () => {
      animationRunning = false;
      cancelAnimationFrame(reqRef.current);
    };
    // eslint-disable-next-line
  }, [isPlaying, isPaused, player, obstacles]); // dependencies OK: let stepFrame pull latest state

  // On end-of-run update, save replay (for clones) and high score.
  useEffect(() => {
    if (showGameOver && runHistory.length > 10) {
      // Push runHistory to pastRuns (bounded to three)
      setPastRuns(prev => {
        const updated = [runHistory, ...prev].slice(0, CLONE_COUNT);
        return updated;
      });
      setCloneActiveFrames([0,0,0]);
      // Save new best
      if (score > bestScore) {
        setBestScore(score);
        if (typeof window !== "undefined") {
          window.localStorage.setItem(GAME_KEY, String(score));
        }
      }
    }
    // eslint-disable-next-line
  }, [showGameOver]);

  // --- CONTROL ACTIONS ---

  // Start new game or restart
  const startAction = useCallback(() => {
    setObstacles([initObstacle(GAME_WIDTH + 40)]);
    setScore(0);
    setDistance(0);
    setPlayer({
      x: 40, y: GAME_HEIGHT - GROUND_HEIGHT - PLAYER_H, vy: 0, isJumping: false,
      isSliding: false, slideTimer: 0,
      width: PLAYER_W, height: PLAYER_H, grounded: true,
    });
    setShowGameOver(false);
    setRunHistory([]);
    setIsPlaying(true);
    setIsPaused(false);
    setShowOnboarding(false);
    // PastRuns: keep as is (for clones)
  }, []);

  // Pause/resume
  const pauseAction = useCallback(() => {
    setIsPaused(v => !v);
  }, []);

  // Jump: if grounded & not sliding
  const jumpAction = useCallback(() => {
    setPlayer((p) => {
      if (!p.grounded || p.isSliding) return p;
      // Prevent jumping while in slide
      return { ...p, vy: -JUMP_V0, isJumping: true, grounded: false };
    });
    setRunHistory(hist => hist.concat({ type: "jump", frame: frameRef.current }));
  }, []);

  // Slide: only if grounded & not currently sliding or jumping
  const slideAction = useCallback(() => {
    setPlayer((p) => {
      if (!p.grounded || p.isSliding || p.isJumping) return p;
      return { ...p, isSliding: true, slideTimer: SLIDE_DURATION, height: Math.round(PLAYER_H * 0.64), y: (GAME_HEIGHT - GROUND_HEIGHT - Math.round(PLAYER_H * 0.64)), grounded: true };
    });
    setRunHistory(hist => hist.concat({ type: "slide", frame: frameRef.current }));
  }, []);

  // On-screen UI button handlers
  function handleButtonJump(e) { e && e.preventDefault(); jumpAction(); }
  function handleButtonSlide(e) { e && e.preventDefault(); slideAction(); }
  function handleButtonPause(e) { e && e.preventDefault(); pauseAction(); }

  // --- MAIN GAME LOGIC ---

  function stepFrame() {
    frameRef.current += 1;

    // Parallax BG/ground motion
    setBgX(lastBgX => (lastBgX - PLAYER_SPEED * 0.45) % 600);

    // --- Player Physics ---
    setPlayer((p) => {
      let { x, y, vy, isJumping, isSliding, slideTimer, height, grounded } = p;

      // Airborne movement
      if (!grounded) {
        vy += GRAVITY;
        y += vy;
        if (y > GAME_HEIGHT - GROUND_HEIGHT - PLAYER_H) {
          y = GAME_HEIGHT - GROUND_HEIGHT - PLAYER_H;
          vy = 0;
          isJumping = false;
          grounded = true;
        }
      }

      // Slide state
      if (isSliding) {
        if (slideTimer > 1) {
          slideTimer -= 1;
        } else {
          // End slide, stand up
          isSliding = false;
          height = PLAYER_H;
          y = GAME_HEIGHT - GROUND_HEIGHT - PLAYER_H;
        }
      }

      return { ...p, y, vy, isJumping, isSliding, slideTimer, height, grounded };
    });

    // --- Obstacles: Update positions, remove passed, spawn new ---
    setObstacles((obsList) => {
      let nextList = obsList.map(obs => ({
        ...obs,
        x: obs.x - PLAYER_SPEED
      }));
      // Remove obstacles left of screen
      nextList = nextList.filter(obs => obs.x + obs.width > -18);

      // Spawn next obstacle if needed (when last is far enough to the left)
      const lastX = nextList.length ? nextList[nextList.length - 1].x : 0;
      if (GAME_WIDTH - lastX > randomBetween(OBSTACLE_MIN_GAP, OBSTACLE_MAX_GAP)) {
        nextList = nextList.concat(initObstacle(GAME_WIDTH + randomBetween(6, 60)));
      }
      return nextList;
    });

    // --- Distance / Score ---
    setDistance((d) => {
      const next = d + PLAYER_SPEED;
      setScore(Math.floor(next / 4));
      return next;
    });

    // --- Run history for shadow clone ---
    setRunHistory((hist) =>
      hist.concat([
        {
          frame: frameRef.current,
          y: player.y,
          isJumping: player.isJumping,
          isSliding: player.isSliding,
          action: (player.isJumping ? "jump" : player.isSliding ? "slide" : "run"),
        },
      ])
    );

    // --- Collision ---
    // Evaluate collision now: get latest player & obstacles (from states) in closure
    let collided = false;
    const my = player.y;
    const mh = player.height;
    const mx = player.x;
    const mw = player.width;
    let obs = obstacles;
    for (let i = 0; i < obs.length; ++i) {
      const ob = obs[i];
      // Rectangle collision
      if (
        mx + mw > ob.x &&
        mx < ob.x + ob.width &&
        my + mh > ob.y &&
        my < ob.y + ob.height
      ) {
        collided = true;
        break;
      }
    }

    if (collided) {
      gameOver();
    }
  }

  // --- GAME OVER ---
  function gameOver() {
    setIsPlaying(false);
    setShowGameOver(true);
  }

  // --- Helpers ---

  // Generate a new obstacle
  function initObstacle(xpos) {
    const h = randomBetween(OBSTACLE_MIN_H, OBSTACLE_MAX_H);
    const w = randomBetween(OBSTACLE_MIN_W, OBSTACLE_MAX_W);
    const isTall = h > 44 || Math.random() > 0.73;
    return {
      x: xpos,
      y: isTall
        ? GAME_HEIGHT - GROUND_HEIGHT - h
        : GAME_HEIGHT - GROUND_HEIGHT - 12,
      width: w,
      height: h,
      type: isTall ? "block" : "bar",
    };
  }

  // Shadow Clone simulation (returns array of [cloneState] for all clones)
  function getClonesState() {
    // Each clone's past runHistory array, replayed
    return pastRuns.map((hist, i) => {
      // Get replayed frame index for this clone (advance only if run is playing)
      let f = cloneActiveFrames[i];
      let cState = { x: player.x, y: 0, isSliding: false, isJumping: false, visible: false };

      if (!hist || hist.length < 3) return cState;
      if (!isPlaying && !showGameOver) return cState; // only draw during play/gameOver

      // Play from start, sync to f
      if (hist[f]) {
        cState.y = hist[f].y;
        cState.isJumping = hist[f].action === "jump";
        cState.isSliding = hist[f].action === "slide";
        cState.visible = true;
      } else if (hist.length > 0) {
        // Ended: stay at last frame
        cState.y = hist[hist.length - 1].y;
        cState.isJumping = hist[hist.length - 1].action === "jump";
        cState.isSliding = hist[hist.length - 1].action === "slide";
        cState.visible = false; // fade out when dead
      }
      return cState;
    });
  }

  // Animate shadow clones progression
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setCloneActiveFrames(fr => fr.map((v, idx) =>
        (pastRuns[idx] && v < pastRuns[idx].length - 1) ? v + 1 : v
      ));
    }, 1000 / 60);
    return () => clearInterval(interval);
    // eslint-disable-next-line
  }, [isPlaying, pastRuns]);

  // Utility for random int in range
  function randomBetween(a, b) {
    return a + Math.floor(Math.random() * (b - a + 1));
  }

  // --- UI RENDER ---
  return (
    <div className="shadowrunner-root" data-theme={theme}>
      <div className="shadowrunner-game-ctr">
        {/* Parallax Background */}
        <ParallaxBackground bgX={bgX} />

        {/* Main Game Area */}
        <svg className="shadowrunner-canvas" viewBox={`0 0 ${GAME_WIDTH} ${GAME_HEIGHT}`} width={GAME_WIDTH} height={GAME_HEIGHT} aria-label="Shadow Runner Game Canvas">
          {/* Ground */}
          <rect x="0" y={GAME_HEIGHT - GROUND_HEIGHT} width={GAME_WIDTH} height={GROUND_HEIGHT-2} fill={theme === "dark" ? "#181d2a" : "#4f46e5"} />
          <rect x="0" y={GAME_HEIGHT - GROUND_HEIGHT+5} width={GAME_WIDTH} height="4" fill={theme === "dark" ? "#384370" : "#aee6fc"} opacity="0.15" />
          {/* Obstacles */}
          {obstacles.map((ob, idx) => (
            <rect
              key={idx}
              className={`obstacle${ob.type === "block" ? " tall" : " bar"}`}
              x={ob.x}
              y={ob.y}
              width={ob.width}
              height={ob.height}
              rx={ob.type === "block" ? "7" : "12"}
              fill={theme === "dark" ? "#b9e7fc" : "#4f46e5"}
              stroke="#282a32"
              strokeWidth={ob.type === "block" ? "1.7" : "1.1"}
              opacity={ob.type === "block" ? 0.92 : 0.80}
            />
          ))}

          {/* Shadow Clones (render up to 3) */}
          {getClonesState().map((clone, idx) => clone.visible && (
            <PlayerSprite
              key={"clone" + idx}
              x={player.x - 3*(idx+1)}
              y={clone.y}
              height={player.height}
              faded
              slide={clone.isSliding}
              jump={clone.isJumping}
              theme={theme}
              cloneNbr={idx}
            />
          ))}

          {/* The Main Player */}
          <PlayerSprite
            x={player.x}
            y={player.y}
            height={player.height}
            slide={player.isSliding}
            jump={player.isJumping}
            theme={theme}
          />
        </svg>

        {/* HUD: Score, Pause, Distance */}
        <HUD
          score={score}
          best={bestScore}
          isPaused={isPaused}
          onPause={pauseAction}
          distance={Math.round(distance / 4)}
        />

        {/* Overlays: Onboarding, Pause, Game Over */}
        {showOnboarding && (
          <OnboardingDialog
            onStart={startAction}
            isMobile={isMobile}
            bestScore={bestScore}
            theme={theme}
          />
        )}
        {showGameOver && (
          <GameOverDialog
            score={score}
            bestScore={bestScore}
            onRestart={startAction}
            theme={theme}
          />
        )}
        {isPaused && (
          <PauseOverlay
            onResume={pauseAction}
            theme={theme}
          />
        )}

        {/* On-Screen Controls if mobile */}
        {isMobile && isPlaying && !isPaused && !showGameOver && (
          <div className="shadowrunner-controls-bar" aria-label="Touch controls">
            <button className="shadowrunner-ctrl-btn" aria-label="Jump" onPointerDown={handleButtonJump}>⤒</button>
            <button className="shadowrunner-ctrl-btn" aria-label="Slide" onPointerDown={handleButtonSlide}>⤓</button>
            <button className="shadowrunner-ctrl-btn pause" aria-label="Pause" onClick={handleButtonPause}>⏸</button>
          </div>
        )}
      </div>
    </div>
  );
}

// --- Subcomponents ---
// Background with parallax layers
function ParallaxBackground({ bgX }) {
  // Layered SVG, could use PNG/SVG asset but SVG render for adaptability
  return (
    <div className="shadowrunner-bg-layers">
      {/* Sky */}
      <svg className="shadowrunner-bg-sky" width="100%" height="100%" viewBox="0 0 600 260" preserveAspectRatio="none">
        <defs>
          <linearGradient id="skyGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#a7e5ff" />
            <stop offset="100%" stopColor="#e6eefc" />
          </linearGradient>
        </defs>
        <rect width="600" height="260" fill="url(#skyGradient)" />
        {/* Sun/Moon */}
        <circle cx={90} cy={66} r="26" fill="#ffeab7" opacity="0.55" />
      </svg>
      {/* Parallax Clouds */}
      <div
        className="shadowrunner-bg-clouds"
        style={{
          left: (bgX * 0.4) + "px"
        }}
        aria-hidden="true"
      >
        {/* clouds as svg paths */}
        <svg width="760" height="80" viewBox="0 0 760 80">
          <ellipse cx="100" cy="42" rx="68" ry="30" fill="#fff" opacity="0.39" />
          <ellipse cx="300" cy="51" rx="40" ry="18" fill="#c7eafb" opacity="0.21" />
          <ellipse cx="400" cy="28" rx="55" ry="24" fill="#e3eafe" opacity="0.34" />
          <ellipse cx="670" cy="42" rx="80" ry="32" fill="#fff" opacity="0.23" />
        </svg>
      </div>
      {/* Parallax Buildings (darker on bottom) */}
      <div
        className="shadowrunner-bg-silhouette"
        style={{
          left: (bgX * 0.8) + "px"
        }}
        aria-hidden="true"
      >
        <svg width="700" height="60" viewBox="0 0 700 60">
          <rect x="0" y="24" width="40" height="36" fill="#c5cef7" />
          <rect x="38" y="41" width="27" height="19" fill="#b1cdfe" />
          <rect x="59" y="20" width="30" height="40" fill="#98b8e9" />
          <rect x="89" y="36" width="38" height="24" fill="#b7e3f9" />
          <rect x="118" y="17" width="29" height="43" fill="#98bbed" />
          <rect x="151" y="31" width="55" height="29" fill="#7087a3" />
          {/* ... more rectangles for skyline ... */}
          <rect x="260" y="40" width="34" height="20" fill="#9aa6d7" />
          <rect x="340" y="15" width="24" height="45" fill="#d9f5fa" />
          <rect x="399" y="20" width="51" height="38" fill="#b5e8fd" />
          <rect x="555" y="17" width="62" height="41" fill="#a3d7f4" />
          <rect x="630" y="30" width="50" height="26" fill="#adcaf3" />
        </svg>
      </div>
      {/* Parallax Distant Ground */}
      <div
        className="shadowrunner-bg-ground"
        style={{
          left: (bgX * 1.4) + "px"
        }}
        aria-hidden="true"
      >
        <svg width="600" height="17" viewBox="0 0 600 17">
          <rect x="0" y="6" width="600" height="13" fill="#fff" opacity="0.12" />
          <ellipse cx="70" cy="8" rx="23" ry="5" fill="#b5f7e4" opacity="0.33" />
          <ellipse cx="300" cy="12" rx="46" ry="8" fill="#719eb0" opacity="0.12" />
          <ellipse cx="520" cy="7" rx="35" ry="9" fill="#f7f6eb" opacity="0.22" />
        </svg>
      </div>
    </div>
  );
}

// Player runner sprite - minimalist (stick figure + color block)
function PlayerSprite({ x, y, height, faded, slide, jump, theme, cloneNbr }) {
  const bodyH = height;
  const baseColor = theme === "dark" ? "#40e9e2" : "#4f46e5";
  const cloneAlpha = faded ? Math.max(0.21, 1 - (cloneNbr+1)*0.36) : 1;
  return (
    <g className={`shadowrunner-runner${faded ? " shadow" : ""}${slide ? " slide" : ""}${jump ? " jump" : ""}`}>
      {/* Legs */}
      <rect x={x + 17} y={y + bodyH - 7} width="4" height="14" rx="2" fill={baseColor} opacity={cloneAlpha * 0.46} />
      <rect x={x + 11} y={y + bodyH - 4} width="4" height="11" rx="2" fill={baseColor} opacity={cloneAlpha * 0.23} />
      {/* Torso */}
      <rect x={x + 12} y={y + 9} width="10" height={slide ? bodyH - 22 : bodyH - 10} rx="4" fill={baseColor} opacity={cloneAlpha * 0.93} />
      {/* Head */}
      <ellipse cx={x + 16.5} cy={y + 8} rx="7" ry="7" fill="#fffefc" opacity={cloneAlpha * 0.99} stroke={baseColor} strokeWidth="2" />
      {/* Arms */}
      <rect x={x + 2} y={y + 17} width="16" height="3" rx="1.5"
        fill={baseColor}
        opacity={cloneAlpha * 0.48}
        transform={slide ? `rotate(12,${x + 9},${y + 18})` : jump ? `rotate(-14,${x + 10},${y + 17})` : ""}
      />
      {/* Body shadow */}
      {faded && (
        <ellipse cx={x + 18} cy={y + bodyH + 7} rx="10" ry="3" fill={baseColor} opacity={cloneAlpha * 0.23} />
      )}
    </g>
  );
}

// HUD (Score, Distance, Pause)
function HUD({ score, best, isPaused, onPause, distance }) {
  return (
    <div className="shadowrunner-hud">
      <span className="hud-score">
        <span className="hud-label">SCORE </span>{score}
      </span>
      <span className="hud-distance">
        <span className="hud-label">DIST </span>{distance} m
      </span>
      <span className="hud-best">
        <span className="hud-label">BEST </span>{best}
      </span>
      <button className="hud-btn pause-btn" aria-label="Pause" onClick={onPause} tabIndex={0}>
        {isPaused ? "▶" : "⏸"}
      </button>
    </div>
  );
}

// Onboarding Popup
function OnboardingDialog({ onStart, isMobile, bestScore, theme }) {
  return (
    <div className="shadowrunner-overlay open onboarding" role="dialog" aria-modal="true">
      <div className="shadowrunner-modal">
        <div className="modal-header">🏃‍♂️<span className="modal-title">Shadow Runner</span></div>
        <div className="modal-howto">
          <b>How To Play:</b>
          <ul>
            <li>Auto-run forward endlessly. <b>Jump</b> (⤒) over obstacles, <b>Slide</b> (⤓) under bars.</li>
            <li>
              Use <kbd>Space</kbd> or <kbd>↑</kbd> to jump; <kbd>↓</kbd> to slide.<br />
              <span className="desc-sub">Tap on-screen in mobile.</span>
            </li>
            <li>Shadow clones replay your <b>last 3 runs</b> for visual flair!</li>
            <li>Pause: <kbd>P</kbd> or <kbd>⏸️</kbd>. Survive for high-score glory!</li>
          </ul>
        </div>
        <div className="modal-bestscore">
          <span>Your Best:</span>{" "}
          <span className="modal-bestscore-val">{typeof bestScore === "number" && bestScore ? bestScore + " m" : "No score yet"}</span>
        </div>
        <button className="shadowrunner-modal-btn play" tabIndex={0} onClick={onStart} autoFocus>
          Start Game
        </button>
      </div>
    </div>
  );
}

// Game Over Overlay
function GameOverDialog({ score, bestScore, onRestart, theme }) {
  const newBest = score >= bestScore;
  return (
    <div className="shadowrunner-overlay open gameover" role="dialog" aria-modal="true">
      <div className="shadowrunner-modal">
        <div className="modal-header">
          💀 <span className="modal-title">Game Over!</span>
        </div>
        <div className="modal-score-row">
          <span className="modal-score-label">Distance:</span>
          <span className="modal-score-main">{score} m</span>
        </div>
        <div className="modal-best-row">
          <span className="modal-score-label">Your Best:</span>
          <span className="modal-score-best">{bestScore} m {newBest && <span className="modal-best-new"> (New!)</span>}</span>
        </div>
        <button className="shadowrunner-modal-btn replay" tabIndex={0} onClick={onRestart}>
          <span aria-hidden="true">↻</span> Play Again
        </button>
        <a
          className="shadowrunner-modal-btn back"
          href="/games"
          tabIndex={0}
        >
          ← Back to Games
        </a>
      </div>
    </div>
  );
}

// Pause Overlay
function PauseOverlay({ onResume, theme }) {
  return (
    <div className="shadowrunner-overlay open pause" role="dialog" aria-modal="true" tabIndex={-1}>
      <div className="shadowrunner-modal pause-modal">
        <div className="modal-header">⏸️ <span className="modal-title">Paused</span></div>
        <div className="modal-pause-desc">
          Press <kbd>P</kbd> or click Resume to keep running.
        </div>
        <button className="shadowrunner-modal-btn resume" tabIndex={0} onClick={onResume}>Resume</button>
      </div>
    </div>
  );
}
