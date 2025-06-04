import React, { useEffect, useRef, useState } from "react";

// PUBLIC_INTERFACE
/**
 * SnakeGamePage: 'Hard' Snake Game
 * - Pixel-style arcade visuals.
 * - Hard mechanics: fast speed, wall collision, self collision, and moving bonuses/obstacles.
 * - Keeps best score (length) in localStorage ("mmarcade-snake-hard-best"), and last score ("mmarcade-snake-hard-last").
 * - Responsive design; uses only pure React and CSS.
 */

const BOARD_SIZE = 18; // 18x18 grid for high difficulty
const INITIAL_SNAKE = [
  { x: Math.floor(BOARD_SIZE / 2), y: Math.floor(BOARD_SIZE / 2) }
];
const INITIAL_DIR = { x: 1, y: 0 }; // Start moving right
const GAME_SPEED = 65; // ms between moves (hard - very fast!)

const FOOD_EMOJI = "🍒";
const BONUS_EMOJI = "💎";
const OBSTACLE_EMOJI = "💣";
const SNAKE_HEAD_EMOJI = "😈";
const SNAKE_BODY_EMOJI = "🟦";

const INITIAL_STATE = () => ({
  snake: [...INITIAL_SNAKE],
  direction: { ...INITIAL_DIR },
  food: getRandomEmptyCell(INITIAL_SNAKE, [], [], BOARD_SIZE),
  bonus: null,
  obstacle: null,
  score: 0,
  pendingGrowth: 2, // allow snake to grow on first food
  running: false,
  dead: false,
  moves: 0
});

// Try to get a random position not occupied by snake, bonus, or obstacle
function getRandomEmptyCell(snake, objs, excluding = [], boardSize = BOARD_SIZE) {
  let openCells = [];
  for (let y = 0; y < boardSize; ++y) {
    for (let x = 0; x < boardSize; ++x) {
      if (
        !snake.some(seg => seg.x === x && seg.y === y) &&
        !objs.some(o => o && o.x === x && o.y === y) &&
        !excluding.some(o => o && o.x === x && o.y === y)
      ) {
        openCells.push({ x, y });
      }
    }
  }
  if (openCells.length === 0) return null;
  return openCells[Math.floor(Math.random() * openCells.length)];
}

// Directions (no reverse allowed)
const DIRECTION_VECTORS = {
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
  w: { x: 0, y: -1 },
  s: { x: 0, y: 1 },
  a: { x: -1, y: 0 },
  d: { x: 1, y: 0 }
};
function isOpposite(dirA, dirB) {
  return dirA.x + dirB.x === 0 && dirA.y + dirB.y === 0;
}

// Main component
function SnakeGamePage() {
  // Game state
  const [game, setGame] = useState(INITIAL_STATE);
  const [bestScore, setBestScore] = useState(loadBestScore());
  const [lastScore, setLastScore] = useState(loadLastScore());
  const [showModal, setShowModal] = useState(false);

  // Input buffer for quick key presses
  const inputRef = useRef([]);
  const runRef = useRef(null);

  // Only handle arrow/WASD input
  useEffect(() => {
    function onKeyDown(e) {
      const key = e.key;
      if (
        key in DIRECTION_VECTORS &&
        !isOpposite(DIRECTION_VECTORS[key], game.direction)
      ) {
        inputRef.current.push(DIRECTION_VECTORS[key]);
      } else if (game.dead && (key === "r" || key === "R" || key === " ")) {
        restart();
      } else if (!game.running && !game.dead && (key === " " || key === "Enter")) {
        startGame();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line
  }, [game.direction, game.running, game.dead]);

  // Main game loop
  useEffect(() => {
    if (!game.running || game.dead) {
      clearInterval(runRef.current);
      return;
    }
    runRef.current = setInterval(() => tick(), GAME_SPEED);
    return () => clearInterval(runRef.current);
    // eslint-disable-next-line
  }, [game.running, game.dead, game.snake, game.direction, game.food, game.bonus, game.obstacle]);

  // On game over, show modal
  useEffect(() => {
    if (game.dead) {
      saveScore(game.score);
      setTimeout(() => setShowModal(true), 250);
    }
    // eslint-disable-next-line
  }, [game.dead]);

  function startGame() {
    setGame(g => ({ ...g, running: true }));
  }

  function restart() {
    setGame(INITIAL_STATE());
    setShowModal(false);
  }

  // Main tick: updates snake, deals with collisions, moves food/bonus/obstacle.
  function tick() {
    setGame((g) => {
      // Determine next direction
      let dir = g.direction;
      if (inputRef.current.length > 0) {
        const queued = inputRef.current.shift();
        if (!isOpposite(queued, g.direction)) dir = queued;
      }
      // Next head
      const head = { x: g.snake[0].x + dir.x, y: g.snake[0].y + dir.y };

      // OUT OF BOUNDS
      if (
        head.x < 0 || head.x >= BOARD_SIZE ||
        head.y < 0 || head.y >= BOARD_SIZE
      ) {
        return { ...g, running: false, dead: true, moves: g.moves + 1 };
      }

      // COLLISION (self)
      if (g.snake.some(seg => seg.x === head.x && seg.y === head.y)) {
        return { ...g, running: false, dead: true, moves: g.moves + 1 };
      }

      // COLLISION (obstacle)
      if (g.obstacle && head.x === g.obstacle.x && head.y === g.obstacle.y) {
        return { ...g, running: false, dead: true, moves: g.moves + 1 };
      }

      // FOODS & BONUS overlap not possible by spawn logic
      let newSnake = [head, ...g.snake];
      let newFood = g.food;
      let newScore = g.score;
      let grown = false;
      let growth = g.pendingGrowth;

      // EAT FOOD
      if (head.x === g.food.x && head.y === g.food.y) {
        newScore++;
        growth += 1;
        // Move food to random new position (avoid snake, obstacle, bonus!)
        newFood = getRandomEmptyCell(newSnake, [g.bonus, g.obstacle], [], BOARD_SIZE)
          || g.food; // fallback
        grown = true;
      }
      // EAT BONUS
      let bonus = g.bonus;
      if (bonus && head.x === bonus.x && head.y === bonus.y) {
        newScore += 3;
        growth += 2;
        bonus = null;
        grown = true;
      }

      // OBSTACLE: moves every 3 ticks, after 10 moves since spawn
      let obstacle = g.obstacle;
      let moves = g.moves + 1;
      if (obstacle && moves % 3 === 0) {
        // Move obstacle to random new empty cell
        obstacle =
          getRandomEmptyCell(
            newSnake, [newFood, bonus], [obstacle], BOARD_SIZE
          ) || obstacle;
      }

      // BONUS: moves every 2 ticks, lifetime 17 ticks max
      if (bonus && moves % 2 === 0) {
        bonus =
          getRandomEmptyCell(newSnake, [newFood, obstacle], [bonus], BOARD_SIZE) || bonus;
      }

      // Spawn bonus with low random chance
      if (!bonus && Math.random() < 0.025 && moves % 9 === 0) {
        bonus =
          getRandomEmptyCell(newSnake, [newFood, obstacle], [], BOARD_SIZE) || null;
      }

      // Spawn obstacle occasionally, but not on start
      if (
        !obstacle &&
        moves > 10 &&
        Math.random() < 0.045 &&
        moves % 7 === 0
      ) {
        obstacle =
          getRandomEmptyCell(newSnake, [newFood, bonus], [], BOARD_SIZE) || null;
      }

      // GROW or MOVE
      if (growth) {
        // Don't cut last segment
        growth--;
      } else {
        newSnake.pop(); // move!
      }

      return {
        ...g,
        snake: newSnake,
        direction: dir,
        food: newFood,
        bonus: bonus,
        obstacle: obstacle,
        score: newScore,
        pendingGrowth: growth,
        running: true,
        moves
      };
    });
  }

  // Save scores
  function saveScore(score) {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem("mmarcade-snake-hard-last", score);
      setLastScore(score);
      // best
      const prev = parseInt(window.localStorage.getItem("mmarcade-snake-hard-best"), 10) || 0;
      if (score > prev) {
        window.localStorage.setItem("mmarcade-snake-hard-best", score);
        setBestScore(score);
      }
    } catch (e) { /* ignore */ }
  }
  function loadBestScore() {
    if (typeof window === "undefined") return 0;
    return parseInt(window.localStorage.getItem("mmarcade-snake-hard-best"), 10) || 0;
  }
  function loadLastScore() {
    if (typeof window === "undefined") return 0;
    return parseInt(window.localStorage.getItem("mmarcade-snake-hard-last"), 10) || 0;
  }

  // Format: returns [SnakeGame visual, controls, and modal]
  return (
    <div className="snake-root" style={{ minHeight: "100vh", background: "linear-gradient(135deg, #232526 0%, #68adc4 120%)", fontFamily: "'Montserrat','Inter',sans-serif" }}>
      <style>{`
        .snake-arcade-board { background: #181d26; margin: 50px auto 0 auto; border-radius: 19px; padding: 18px 18px 14px 18px; box-shadow: 0 10px 40px #1c567a41, 0 1.5px 8px #1b99c318; width: fit-content; }
        .snake-arcade-board .arcade-label { color:#ffe824; font-size:1.8rem;font-family:'Montserrat','Inter',sans-serif; font-weight:900; margin-bottom:21px; }
        .snake-grd { display: grid; grid-template-rows: repeat(${BOARD_SIZE}, 1fr); grid-template-columns: repeat(${BOARD_SIZE}, 1fr); gap:1.85px; width: calc(33px * ${BOARD_SIZE}); height: calc(33px * ${BOARD_SIZE}); background: #202e4e; border-radius: 16px; border: 2px solid #68adc4; box-shadow: 0 1.4px 6px #23252629; }
        @media (max-width: 820px) {
          .snake-grd { width:96vw; height:96vw; max-width:99vw; max-height:99vw; }
        }
        .sg-cell { display:flex; align-items:center; justify-content:center; font-size:1.55rem; width:32px; height:32px; background:#080c1b; border-radius:7.5px; }
        .sg-food  { background: #ce002a; color:#fff; box-shadow:0 2px 10px #f44568aa; }
        .sg-bonus { background: #50e6c1; color:#131; font-size:1.44em; box-shadow:0 3px 10px #1fcbbb70; }
        .sg-obst  { background: #ffae00; color:#000; font-size:1.3em; box-shadow:0 2.4px 9px #d9780107;}
        .sg-head  { background: #68adc4; color: #fffbe8; font-size:1.41em; border: 2.8px solid #fff; box-shadow:0 4px 19px #68adc483;}
        .sg-body  { background: #37519b; color: #d0eafd; border:1.5px solid #13194b; font-size: 1.11em;}
        .sg-blank { opacity:0.12; background:#23232d; }
        .snake-bar   { width:100%; margin: 34px auto 0 auto; display: flex; flex-wrap:wrap; gap: 24px 12px; align-items:center; justify-content:center;}
        .snake-pill  { background:#68adc4; color:#fff; border-radius:17px; font-weight:740; padding:4px 15px 5px 11px; font-size:1.07rem; font-family:'Montserrat','Inter',sans-serif;}
        .snake-pill.best { background:#ffe824; color:#231e41; font-weight: 850; }
        .snake-pill.last { background:#ffbe76; color:#1c2751;}
        .snake-btn-big {background:#353e70;color:#fff;border-radius:11px;padding:10px 38px;font-size:1.12rem;font-weight:700;cursor:pointer;border:none;box-shadow:0 3px 14px #365f7b13;transition:background 0.19s;}
        .snake-btn-big:hover {background:#68adc4;}
        .snake-tip     {background:#222641;color:#afedff;font-size:1.05rem;border-radius: 10px;opacity:0.89;padding: 8px 32px;margin:22px auto 0 auto;font-weight:850;}
        .snake-modal { position: fixed; inset:0; z-index:9999; background:rgba(11,21,62,0.37); display: flex; align-items: flex-start; justify-content: center;}
        .snake-modalcontent { background: linear-gradient(120deg, #d8fafe 76%, #ffe824ee 100%); color: #18141c; border-radius: 22px; padding: 50px 44px 34px 44px; box-shadow: 0 8px 44px #08114059; margin-top: 110px; text-align: center; min-width:260px;}
        .snake-modal-trophy { font-size:2.6em; display:inline-block; margin-bottom:9px;}
        .snake-modal-title  { font-size:1.31rem; font-weight:900; color:#353e70; margin-bottom:13px;font-family:'Montserrat','Inter',sans-serif;}
        .snake-modal-row    { margin:15px auto 11px auto;font-size:1.03em;font-weight:700;}
        .snake-modal-best   { font-weight:900;color:#68adc4;}
        .snake-modal-btn    { margin:17px 5px 0 5px;background:#68adc4;color:#fff;border:none;font-weight:800;border-radius:12px;padding:11px 30px;font-size:1.11em;box-shadow:0 3px 14px #365f7b13;transition:background 0.18s;}
        .snake-modal-btn:hover{background:#353e70;}
        @media (max-width:540px){.snake-arcade-board{padding:5vw 2vw 4vw 2vw;}}
        .snake-modal-btn:focus-visible, .snake-btn-big:focus-visible{outline:2.7px solid #353e70;outline-offset:2px;}
      `}</style>
      <div className="snake-arcade-board">
        <div className="arcade-label">
          <span role="img" aria-label="snake">🐍</span> SNAKE GAME <span style={{color:'#ffe824'}}>Hard</span>
        </div>
        <div
          className="snake-grd"
          tabIndex={0}
          aria-label="Snake Arcade Grid"
          role="grid"
        >
          {Array.from({ length: BOARD_SIZE * BOARD_SIZE }).map((_, idx) => {
            const x = idx % BOARD_SIZE, y = Math.floor(idx / BOARD_SIZE);
            // Check snake segments for this cell
            const snakeIdx = game.snake.findIndex(seg => seg.x === x && seg.y === y);
            let cellClass = "sg-cell";
            let val = "";
            if (snakeIdx === 0) {
              cellClass += " sg-head";
              val = SNAKE_HEAD_EMOJI;
            } else if (snakeIdx > 0) {
              cellClass += " sg-body";
              val = SNAKE_BODY_EMOJI;
            } else if (game.food.x === x && game.food.y === y) {
              cellClass += " sg-food";
              val = FOOD_EMOJI;
            } else if (game.bonus && game.bonus.x === x && game.bonus.y === y) {
              cellClass += " sg-bonus";
              val = BONUS_EMOJI;
            } else if (game.obstacle && game.obstacle.x === x && game.obstacle.y === y) {
              cellClass += " sg-obst";
              val = OBSTACLE_EMOJI;
            } else {
              cellClass += " sg-blank";
              val = "";
            }
            return (
              <div
                className={cellClass}
                key={x + "_" + y}
                role="gridcell"
                aria-label={val ? val : "blank"}
              >
                {val}
              </div>
            );
          })}
        </div>
        <div className="snake-bar">
          <span className="snake-pill">
            Score: <b>{game.score}</b>
          </span>
          <span className="snake-pill best">
            Best: <b>{bestScore}</b>
          </span>
          <span className="snake-pill last" title="Your last game score">
            Last: <b>{lastScore}</b>
          </span>
          {!game.running && !game.dead && (
            <button className="snake-btn-big" onClick={startGame} tabIndex={0} aria-label="Start new Snake game">
              Start
            </button>
          )}
          {game.dead && (
            <button className="snake-btn-big" onClick={restart} tabIndex={0} aria-label="Play Again">
              Play Again
            </button>
          )}
        </div>
        {!game.running && !game.dead && (
          <div className="snake-tip">
            Use <b>Arrow keys</b> or <b>WASD</b> to control. Eat {FOOD_EMOJI}, dodge yourself &amp; the {OBSTACLE_EMOJI}. Survive as long as you can!
          </div>
        )}
      </div>
      {showModal && (
        <div className="snake-modal">
          <div className="snake-modalcontent" role="dialog" aria-modal="true">
            <div className="snake-modal-trophy">🏆</div>
            <div className="snake-modal-title">Game Over</div>
            <div className="snake-modal-row">
              <span>Your Score: </span>
              <span className="snake-modal-best">{game.score}</span>
            </div>
            <div className="snake-modal-row">
              <span>Best Score: </span>
              <span className="snake-modal-best">{bestScore}</span>
            </div>
            <button className="snake-modal-btn" onClick={restart} autoFocus tabIndex={0}>
              Play Again
            </button>
            <a className="snake-modal-btn" href="/games" style={{ background: "#ffe824", color: "#181d26" }}>
              Back to Games
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

export default SnakeGamePage;
