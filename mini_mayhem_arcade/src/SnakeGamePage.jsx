import React, { useRef, useEffect, useState, useCallback } from "react";

/**
 * PUBLIC_INTERFACE
 * SnakeGamePage: Arcade-style advanced snake game for MiniMayhem.
 * Features:
 * - Moving obstacles
 * - Edge wrap/portals
 * - Multiple/animated food: classic, speedup, bomb, fake (bomb disguised)
 * - Animated food, glowing/arcade visuals
 * - Bombs (kills on hit), speed-up effect, reverse controls
 * - Obstacles (moving!), and food that disappears if not eaten in time
 * - Arcade scoring logic and high score/last score persist via localStorage
 */
const BOARD_SIZE = 18; // Square board
const INITIAL_SNAKE = [
  { x: 8, y: 7 },
  { x: 7, y: 7 },
  { x: 6, y: 7 },
];
const INITIAL_DIRECTION = { x: 1, y: 0 }; // right
const GAME_SPEED_NORMAL = 130;  // ms per frame
const GAME_SPEED_FAST = 70;
const FOOD_APPEAR_TIME = 6000;  // ms, how long special food lasts
const BOMB_CHANCE = 0.11;       // Chance each food spawn
const SPEEDUP_CHANCE = 0.19;    // Chance for speedup-boost food
const FAKE_FOOD_CHANCE = 0.10;  // Fake/poisonous food
const OBSTACLE_COUNT = 5;
const OBSTACLE_MOVE_INTERVAL = 700; // ms

const LOCALSTORAGE_BEST_KEY = "snake-bestscore";
const LOCALSTORAGE_LAST_KEY = "snake-lastscore";

const CELL_SIZE = 27; // px per cell on main board

const FOOD_TYPES = [
  {
    type: "classic",
    display: (frame) => <span className="food-emoji" role="img" aria-label="Food" style={{
      filter: frame % 2 === 0 ? "drop-shadow(0 0 10px #fbff66)" : "drop-shadow(0 0 16px #dffe00)",
      animation: "glowFood 1s infinite alternate"
    }}>🍏</span>,
    score: 2,
    color: "#fbff66"
  },
  {
    type: "speedup",
    display: (frame) => <span className="food-emoji" role="img" aria-label="Speed Boost" style={{
      filter: frame % 2 === 0 ? "drop-shadow(0 0 10px #00ffe5)" : "drop-shadow(0 0 17px #13d1b3)",
      animation: "spinFood 0.8s infinite linear"
    }}>⚡</span>,
    score: 5,
    color: "#38fbca"
  },
  {
    type: "bomb",
    display: (frame) => <span className="food-emoji" role="img" aria-label="Bomb" style={{
      filter: frame % 2 === 0 ? "drop-shadow(0 0 12px #ff1745)" : "drop-shadow(0 0 19px #e7242a)",
      animation: "glowBomb 1s infinite alternate"
    }}>💣</span>,
    score: 0,
    color: "#e7242a"
  },
  {
    type: "fake", // Looks like apple, acts as bomb
    display: (frame) => <span className="food-emoji" role="img" aria-label="Fake Food" style={{
      filter: frame % 2 === 0 ? "drop-shadow(0 0 12px #e060a8)" : "drop-shadow(0 0 19px #a605c7)",
      opacity: 0.98 - 0.17 * (frame % 2),
      animation: "shakeFakeFood 0.63s infinite"
    }}>🍎</span>,
    score: 0,
    color: "#de35cf"
  }
];

// Moving obstacles: appearance (glowing blocks)
function renderObstacleCell(frame) {
  return (
    <span className="obstacle-cell" style={{
      background: frame % 2 === 0
        ? "linear-gradient(70deg,#365afc,#8ff7f3 80%)"
        : "linear-gradient(70deg,#209af5,#03eadb 80%)",
      boxShadow: frame % 2 === 0
        ? "0 0 22px #35eaf9bb, 0 2px 11px #64feffff"
        : "0 0 13px #0fb7bebb, 0 2px 12px #b2e4f7cc"
    }} />
  );
}

// --- Utility helpers ---

function randomCell(excludeList = []) {
  let tryCount = 0;
  while (tryCount < 80) {
    const cell = {
      x: Math.floor(Math.random() * BOARD_SIZE),
      y: Math.floor(Math.random() * BOARD_SIZE)
    };
    if (
      !excludeList.some(e => e.x === cell.x && e.y === cell.y)
    )
      return cell;
    tryCount++;
  }
  // fallback: may overlap
  return {
    x: Math.floor(Math.random() * BOARD_SIZE),
    y: Math.floor(Math.random() * BOARD_SIZE)
  };
}
// List util: deep equals
function cellEq(a, b) {
  return a.x === b.x && a.y === b.y;
}

// Snake movement, edge wrap
function nextHead(head, direction) {
  return {
    x: (head.x + direction.x + BOARD_SIZE) % BOARD_SIZE,
    y: (head.y + direction.y + BOARD_SIZE) % BOARD_SIZE
  };
}

// Prevent 180-reverse unless allowed
function isOpposite(dir1, dir2) {
  return dir1.x === -dir2.x && dir1.y === -dir2.y;
}
// To support reverse control, flip movement
function reverseDir(dir) {
  return { x: -dir.x, y: -dir.y };
}

// --- Main SNAKE component ---
function SnakeGamePage() {
  // Food timers state/ref - must be placed before all fns referencing setFoodTimers & foodTimers
  const [foodTimers, setFoodTimers] = useState({});
  
  // State
  const [snake, setSnake] = useState([...INITIAL_SNAKE]);
  const [direction, setDirection] = useState(INITIAL_DIRECTION);
  const [pendingDir, setPendingDir] = useState(INITIAL_DIRECTION); // for smoothing keypress
  const [food, setFood] = useState(genFoods(INITIAL_SNAKE, []));
  const [obstacles, setObstacles] = useState(genObstacles(INITIAL_SNAKE));
  const [score, setScore] = useState(0);
  const [speed, setSpeed] = useState(GAME_SPEED_NORMAL);
  const [gameState, setGameState] = useState("ready"); // ready|running|dead
  const [frame, setFrame] = useState(0);
  const [reverse, setReverse] = useState(false);
  const [message, setMessage] = useState("");
  const [bestScore, setBestScore] = useState(getStoredScore(LOCALSTORAGE_BEST_KEY) || 0);
  const [lastScore, setLastScore] = useState(getStoredScore(LOCALSTORAGE_LAST_KEY) || 0);

  const gameTickRef = useRef();
  const obstacleTickRef = useRef();
  const lastMoveTimeRef = useRef(Date.now());
  const isMounted = useRef(false);

  // Setup game timers
  useEffect(() => {
    isMounted.current = true;
    if (gameState === "running") {
      // Snake movement game loop
      gameTickRef.current = setInterval(gameLoop, speed);
      // Separate timer for moving obstacles
      obstacleTickRef.current = setInterval(moveObstacles, OBSTACLE_MOVE_INTERVAL);
    }
    return () => {
      clearInterval(gameTickRef.current);
      clearInterval(obstacleTickRef.current);
    };
    // eslint-disable-next-line
  }, [gameState, speed, snake, direction, obstacles, food, reverse]);

  // Increase animation frame counter for visuals
  useEffect(() => {
    if (gameState !== "running") return;
    const anim = setInterval(() => setFrame(f => f + 1), 250);
    return () => clearInterval(anim);
  }, [gameState]);

  // Keyboard handler
  useEffect(() => {
    const handler = (e) => {
      // Prevent browser scrolling with arrow keys
      if (
        e.key === "ArrowUp" ||
        e.key === "ArrowDown" ||
        e.key === "ArrowLeft" ||
        e.key === "ArrowRight"
      ) {
        e.preventDefault();
      }
      if (["ArrowUp", "w", "W"].includes(e.key)) {
        setPendingDir(curr => turnToDir({ x: 0, y: -1 }));
      }
      if (["ArrowDown", "s", "S"].includes(e.key)) {
        setPendingDir(curr => turnToDir({ x: 0, y: 1 }));
      }
      if (["ArrowLeft", "a", "A"].includes(e.key)) {
        setPendingDir(curr => turnToDir({ x: -1, y: 0 }));
      }
      if (["ArrowRight", "d", "D"].includes(e.key)) {
        setPendingDir(curr => turnToDir({ x: 1, y: 0 }));
      }
      if ((e.key === " " || e.key === "Enter") && gameState !== "running") {
        restartGame();
      }
      if (e.key === "r" || e.key === "R") {
        restartGame();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line
  }, [gameState, reverse, direction]);

  // Tick main game
  function gameLoop() {
    setSnake(prevSnake => {
      let curDir = reverse ? reverseDir(pendingDir) : pendingDir;
      if (isOpposite(curDir, direction) && prevSnake.length > 1 && !reverse)
        curDir = direction; // prevent fatal flip
      setDirection(curDir);

      // Next head (with wrapping)
      let head = nextHead(prevSnake[0], curDir);

      // Collision with obstacles?
      if (obstacles.some(o => cellEq(o, head))) {
        triggerGameOver("You hit an obstacle!");
        return prevSnake;
      }
      // Collision with self?
      if (prevSnake.findIndex((seg, idx) => idx !== 0 && cellEq(seg, head)) !== -1) {
        triggerGameOver("You ran into yourself!");
        return prevSnake;
      }
      // Bomb check
      const hitFoodIdx = food.findIndex(f => cellEq(f.cell, head));
      if (hitFoodIdx !== -1) {
        const f = food[hitFoodIdx];
        if (f.type === "bomb") {
          setMessage("💥 Bomb! Game Over.");
          triggerGameOver("Ouch! Bomb exploded!");
          return prevSnake;
        } else if (f.type === "fake") {
          setMessage("Poisoned Apple! Game Over.");
          triggerGameOver("That apple was a FAKE! 💀");
          return prevSnake;
        }
        // Special: SPEED UP
        if (f.type === "speedup") doSpeedup();

        // Scoring, extend snake, remove that food and respawn
        setScore(s => s + getFoodType(f.type).score);
        const growPart = [head, ...prevSnake];
        removeFoodTimed(f.id);
        setFood(fs => {
          let next = fs.filter((ff) => ff.id !== f.id);
          // Replenish food if just one left or consumed special
          if (next.length < 3) {
            next = next.concat(genFoods(growPart, obstacles, next));
          }
          return next;
        });
        // Maybe reverse controls on even multiples
        if ((f.type === "speedup" || f.type === "classic") && Math.random() <= 0.12) {
          blinkReverse();
        }
        return growPart;
      } else {
        // Normal move (no food), tail shrinks
        let tailStop = prevSnake.length - 1;
        return [head, ...prevSnake.slice(0, tailStop)];
      }
    });
    setFrame(f => f + 1);
    // Remove expired food
    cleanupOldFood();

    // Obstacles are handled on separate timer, not in main game loop
  }

  // Turn handler: ignores actually flipping to same/opposite direction
  function turnToDir(newDir) {
    return reverse ? reverseDir(newDir) : newDir;
  }

  // Moving obstacles mechanic
  function moveObstacles() {
    setObstacles(prevObs => {
      // Move each obstacle in a random direction (avoiding snake/food/other obstacle if possible)
      return prevObs.map((o, idx) => {
        const choices = [
          { x: 0, y: -1 }, { x: 0, y: 1 },
          { x: -1, y: 0 }, { x: 1, y: 0 }
        ];
        // Sometimes obstacles just blink in place
        if (Math.random() < 0.19) return o;
        // Shuffle directions for randomness
        let dirs = choices.sort(() => Math.random() - 0.5);
        for (let dir of dirs) {
          let npos = {
            x: (o.x + dir.x + BOARD_SIZE) % BOARD_SIZE,
            y: (o.y + dir.y + BOARD_SIZE) % BOARD_SIZE
          };
          if (
            !snake.some(s => cellEq(s, npos)) &&
            !obstacles.some((ob, oi) => oi !== idx && cellEq(ob, npos)) &&
            !food.some(f => cellEq(f.cell, npos))
          ) {
            return npos;
          }
        }
        return o;
      });
    });
  }

  // --- FOOD MANAGEMENT ---
  // Remove/dispose food by ID and its timer
  function removeFoodTimed(id) {
    setFoodTimers(ft => {
      if (ft[id]) {
        clearTimeout(ft[id]);
        const fcopy = { ...ft };
        delete fcopy[id];
        return fcopy;
      }
      return ft;
    });
  }

  // Remove expired foods, respawn if needed
  function cleanupOldFood() {
    setFood(fs => {
      const now = Date.now();
      let changed = false;
      let filtered = fs.filter(f => {
        if (f.expires && f.expires < now) {
          removeFoodTimed(f.id);
          changed = true;
          return false;
        }
        return true;
      });
      // Respawn if all food eaten
      if (filtered.length < 2) {
        filtered = filtered.concat(genFoods(snake, obstacles, filtered));
      }
      return filtered;
    });
  }

  // Used to spawn food, may schedule special foods to disappear in time
  function genFoods(snakeArr, obsArr, existingFoodsArr = []) {
    const taken = [
      ...(snakeArr || []),
      ...(obsArr || []),
      ...existingFoodsArr.map(f => f.cell)
    ];
    const foods = [];
    let fTypes = [
      { type: "classic", prob: 0.8 },
      { type: "speedup", prob: SPEEDUP_CHANCE },
      { type: "bomb", prob: BOMB_CHANCE },
      { type: "fake", prob: FAKE_FOOD_CHANCE }
    ].sort(() => Math.random() - 0.5);

    // Always at least 1 classic food
    foods.push({
      ...randomFoodCell(taken),
      type: "classic",
      id: "classic-" + Math.random().toString(36).substring(2, 9)
    });
    // Bonus/specials
    fTypes.forEach((def) => {
      if (Math.random() < def.prob) {
        foods.push({
          ...randomFoodCell(taken.concat(foods.map(f => f.cell))),
          type: def.type,
          id: def.type + "-" + Math.random().toString(36).substring(2, 9),
          expires: def.type !== "classic"
            ? Date.now() + FOOD_APPEAR_TIME + Math.floor(Math.random() * 1700)
            : null
        });
      }
    });
    // Install timers for special food if needed:
    foods.forEach(food => {
      if (food.expires) {
        setFoodTimers(ft => {
          if (!isMounted.current) return ft;
          const timerId = setTimeout(() => {
            setFood(fs => fs.filter(f => f.id !== food.id));
            setFoodTimers(ftt => {
              const n = { ...ftt };
              delete n[food.id];
              return n;
            });
          }, food.expires - Date.now());
          return { ...ft, [food.id]: timerId };
        });
      }
    });
    return foods;
  }

  // Random cell not in taken, with .cell field
  function randomFoodCell(taken) {
    const cell = randomCell(taken);
    return { cell };
  }

  // Used to lookup food type object
  function getFoodType(ftype) {
    return FOOD_TYPES.find(f => f.type === ftype) || FOOD_TYPES[0];
  }

  // Generate obstacles (avoid snake head/tail)
  function genObstacles(snakeArr) {
    let obs = [];
    let taken = [...snakeArr];
    for (let i = 0; i < OBSTACLE_COUNT; ++i) {
      const cell = randomCell(taken.concat(obs));
      obs.push(cell);
    }
    return obs;
  }

  // --- REVERSE CONTROLS BLINK ---
  function blinkReverse() {
    setReverse(true);
    setMessage("🌀 Reverse Controls!");
    setTimeout(() => {
      setMessage("");
      setReverse(false);
    }, 3500);
  }

  // --- SPEEDUP MECHANIC (for a few seconds) ---
  function doSpeedup() {
    setSpeed(GAME_SPEED_FAST);
    setMessage("⚡ Speed up!");
    setTimeout(() => {
      setSpeed(GAME_SPEED_NORMAL);
      setMessage("");
    }, 3400);
  }

  // --- GAME OVER ---
  function triggerGameOver(msg) {
    setGameState("dead");
    setMessage(msg);
    setLastScore(score);
    persistScore(score);
    // High Score logic
    setBestScore(prev =>
      (score > prev) ? (saveBest(score), score) : prev
    );
    // Clear food timers
    for (const id in foodTimers) {
      clearTimeout(foodTimers[id]);
    }
    setFoodTimers({});
  }

  function getStoredScore(key) {
    if (typeof window !== "undefined") {
      const val = window.localStorage.getItem(key);
      return val ? Number(val) : 0;
    }
    return 0;
  }

  function saveBest(sc) {
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(LOCALSTORAGE_BEST_KEY, sc);
      }
    } catch {}
  }
  function persistScore(sc) {
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(LOCALSTORAGE_LAST_KEY, sc);
      }
    } catch {}
  }

  // --- RESTART GAME ---
  function restartGame() {
    setSnake([...INITIAL_SNAKE]);
    setDirection(INITIAL_DIRECTION);
    setPendingDir(INITIAL_DIRECTION);
    setFood(genFoods(INITIAL_SNAKE, []));
    setObstacles(genObstacles(INITIAL_SNAKE));
    setScore(0);
    setSpeed(GAME_SPEED_NORMAL);
    setGameState("running");
    setFrame(0);
    setReverse(false);
    setMessage("");
    setFoodTimers({});
  }

  // Mount: start game instantly
  useEffect(() => {
    restartGame();
    // eslint-disable-next-line
  }, []);

  // --- RENDERING ---
  return (
    <div className="snake-root" style={{ minHeight: "100vh", fontFamily: "'Montserrat', 'Inter', Arial, sans-serif", background: "linear-gradient(120deg, #13d1b3 0%, #3b34bd 100%)" }}>
      <SnakeArcadeCSS />
      <main className="snakegame-area" style={{
        margin: "0 auto", maxWidth: BOARD_SIZE * CELL_SIZE + 60, paddingTop: 88
      }}>
        <header className="snakegame-header" style={{
          textAlign: "center", marginBottom: 18, fontWeight: 900, fontSize: "2.15rem", color: "#fbff66", textShadow: "0 4px 24px #047bb2cc"
        }}>
          <span role="img" aria-label="Snake">🟢</span> Snake Game 
        </header>

        <SnakeStatsBar
          score={score}
          best={bestScore}
          last={lastScore}
        />

        <section style={{
          background: "rgba(30,29,48,.89)",
          padding: 22,
          borderRadius: 19,
          boxShadow: "0 7px 30px #0bbfcf28",
          width: BOARD_SIZE * CELL_SIZE,
          margin: "0 auto"
        }}>
          <div style={{
            display: "grid",
            gridTemplateColumns: `repeat(${BOARD_SIZE}, ${CELL_SIZE}px)`,
            gridTemplateRows: `repeat(${BOARD_SIZE}, ${CELL_SIZE}px)`,
            gap: 1,
            position: "relative",
            boxShadow: "0 4px 27px #9acae6bb"
          }} tabIndex={0} className="snake-board"
            aria-label="Snake game board"
          >
            {/* Render Board */}
            {(() => {
              let boardArr = [];
              for (let y = 0; y < BOARD_SIZE; y++) {
                for (let x = 0; x < BOARD_SIZE; x++) {
                  const idx = y * BOARD_SIZE + x;
                  // Snake
                  const sIdx = snake.findIndex(se => se.x === x && se.y === y);
                  if (sIdx === 0) {
                    // Head
                    boardArr.push(
                      <div key={idx}
                        className="cell snake-head"
                        style={{ animation: "glowHead .85s infinite alternate" }}>
                        <span role="img" aria-label="Snake Head" style={{
                          fontSize: "1.45em",
                          filter: "drop-shadow(0 0 14px #38fbca)",
                          fontWeight: 800
                        }}>
                          🟢
                        </span>
                      </div>
                    );
                  } else if (sIdx > 0) {
                    // Body
                    boardArr.push(
                      <div key={idx}
                        className="cell snake-body"
                        style={{
                          background: (frame + x + y) % 2 === 0 ? "#38fbca" : "#11b59a",
                          borderRadius: 7,
                          boxShadow: "0 0 9px #5dffe6cc"
                        }}>
                        <span style={{
                          fontWeight: 900,
                          color: "#13d1b3",
                          opacity: 0.8
                        }} />
                      </div>
                    );
                  }
                  // Food
                  else if (food.some(f => f.cell.x === x && f.cell.y === y)) {
                    const f = food.find(ff => ff.cell.x === x && ff.cell.y === y);
                    const typeObj = getFoodType(f.type);
                    boardArr.push(
                      <div key={idx} className={`cell food-cell ${f.type}`}>
                        {typeObj.display(frame)}
                      </div>
                    );
                  }
                  // Obstacles
                  else if (obstacles.some(o => o.x === x && o.y === y)) {
                    boardArr.push(
                      <div key={idx} className="cell obstacle">
                        {renderObstacleCell(frame)}
                      </div>
                    );
                  }
                  // Empty cell
                  else {
                    boardArr.push(
                      <div key={idx}
                        className="cell bg"
                        style={{
                          background: ((x + y) % 2 === 0) ? "#232348" : "#2e2977",
                          opacity: 0.80
                        }} />
                    );
                  }
                }
              }
              return boardArr;
            })()}
          </div>
          {/* Edge arcade border */}
          <div className="snake-glow-border" />
        </section>

        <section className="snakegame-ctrbtns" style={{
          display: "flex", justifyContent: "center", alignItems: "center", gap: 18, marginTop: 22
        }}>
          <button className="snakegame-btn" onClick={restartGame} tabIndex={0} aria-label="Restart game">
            <span aria-hidden="true">↻</span> Restart
          </button>
          {gameState === "dead" ? (
            <button className="snakegame-btn" onClick={restartGame} tabIndex={0} aria-label="Try again">
              Play Again
            </button>
          ) : (
            <button className="snakegame-btn"
              onClick={() => window.location.href = "/games"}
              tabIndex={0}
              aria-label="Go to Games"
            >← Back to Games</button>
          )}
        </section>

        <section>
          {message && (
            <div className="sgame-message" style={{
              margin: "15px auto 0 auto",
              maxWidth: 470,
              fontSize: "1.15em",
              background: "#fbff667c",
              color: "#3849ab",
              borderRadius: 13,
              fontWeight: 900,
              textAlign: "center",
              padding: "10px 14px",
              boxShadow: "0 0 14px #b7fbfc99"
            }}>
              {message}
            </div>
          )}
          {gameState === "dead" && (
            <div className="sgame-end" style={{
              margin: "22px auto 0 auto",
              background: "#ff19222a",
              color: "#de1b4a",
              padding: "11px 15px 8px 15px",
              fontWeight: 700,
              borderRadius: 16,
              textAlign: "center",
              maxWidth: 340,
              fontSize: "1.13em"
            }}>
              <span role="img" aria-label="Game Over">💀</span> Game Over! Score: <b>{score}</b>
            </div>
          )}
        </section>

        <section className="snakegame-tip" style={{
          color: "#e2f734",
          margin: "25px auto 0 auto",
          textAlign: "center",
          fontWeight: 700,
          opacity: 0.80,
          fontSize: "1.04em"
        }}>
          <span role="img" aria-label="keyboard">⌨️</span>
          Use W/A/S/D or Arrow keys to move. Eat apples (🍏), speed boosts (⚡), avoid bombs/obstacles (💣). Edge wraps you to the other side!
          <br />
          <span style={{ color: "#35eaf9" }}>
            High Score: {bestScore ?? 0}
          </span>
        </section>
      </main>
    </div>
  );
}

// --- Stats bar subcomponent ---
function SnakeStatsBar({ score, best, last }) {
  return (
    <section className="snake-statsbar" style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      background: "linear-gradient(90deg,#13146c 70%,#47ffe6 98%)",
      color: "#fff",
      borderRadius: 16,
      padding: "10px 18px",
      margin: "0 auto 17px auto",
      maxWidth: 440,
      fontWeight: 800,
      fontSize: "1.09em",
      boxShadow: "0 3px 13px #0bbffe24"
    }}>
      <span>
        Score: <span style={{ color: "#fbff66", fontWeight: 900 }}>{score}</span>
      </span>
      <span>
        Best: <span style={{ color: "#38fbca", fontWeight: 800 }}>{best}</span>
      </span>
      <span>
        Last: <span style={{ color: "#38a7f9", fontWeight: 800 }}>{last}</span>
      </span>
    </section>
  );
}

// --- CSS-in-JS for strong visual effect ---
function SnakeArcadeCSS() {
  return (
    <style>
      {`
      @keyframes glowFood {
        from { filter: drop-shadow(0 0 12px #fbff668a);}
        to   { filter: drop-shadow(0 0 34px #faff846c);}
      }
      @keyframes glowHead {
        from { box-shadow: 0 0 25px #38fbca70;}
        to   { box-shadow: 0 0 10px #fbff66;}
      }
      @keyframes spinFood {
        from { transform: rotateZ(0);}
        to   { transform: rotateZ(360deg);}
      }
      @keyframes glowBomb {
        from { filter: drop-shadow(0 0 8px #f84d63);}
        to   { filter: drop-shadow(0 0 22px #fd5750);}
      }
      @keyframes shakeFakeFood {
        0%{ transform:translateX(0);}
        20%{ transform:translateX(-2px);}
        40%{ transform:translateY(1.5px);}
        60%{ transform:translateX(3.5px);}
        80%{ transform:translateY(-2.5px);}
        100%{ transform:translateX(0);}
      }
      .snake-board {
        user-select: none;
        outline: none;
        border-radius: 17px;
        position: relative;
        margin: 0 auto;
        margin-bottom: 5px;
      }
      .cell {
        width: ${CELL_SIZE}px;
        height: ${CELL_SIZE}px;
        box-sizing: border-box;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.34em;
        padding: 0;
      }
      .snake-head {
        background: linear-gradient(120deg, #13d1b3 60%, #fbff66 100%);
        border-radius: 7px 17px 7px 9px;
        border: 2.5px solid #38fbcaab;
        font-weight: 800;
        box-shadow: 0 0 13px #38fbca66;
      }
      .snake-body {
        border-radius: 6px;
        opacity: 0.93;
      }
      .food-cell { border-radius: 9px; }
      .food-emoji {
        font-size: 1.18em;
        font-weight: bold;
        user-select: none;
        transition: opacity 0.24s, filter 0.19s;
      }
      .obstacle-cell {
        width: 80%;
        height: 80%;
        min-width: 14px;
        min-height: 14px;
        border-radius: 6px;
        box-shadow: 0 4px 13px #68adc46b;
        border: 1.5px solid #35eaf9cc;
      }
      .snake-glow-border {
        position: absolute;
        pointer-events: none;
        inset: 0;
        border-radius: 19px;
        box-shadow: 0 0 44px #fbff6681, 0 0 20px #13d1b381, 0 0 80px #68adc476;
        z-index: 2;
      }
      .snakegame-btn {
        font-family: inherit;
        border-radius: 10px;
        font-size: 1.03em;
        font-weight: 700;
        padding: 8px 23px 8px 18px;
        background: linear-gradient(98deg,#13d1b3 68%,#60ffea 110%);
        color: #16161a;
        border: 0px;
        box-shadow: 0 2px 7px #187f8c49;
        cursor: pointer;
        margin: 0 2px;
        transition: background .19s, color .16s;
      }
      .snakegame-btn:hover, .snakegame-btn:focus-visible {
        background: linear-gradient(107deg,#fbff66 70%,#38fbca 100%);
        color: #3749ab;
      }
      `}
    </style>
  );
}

export default SnakeGamePage;
