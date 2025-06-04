import React, { useState, useEffect, useCallback, useRef } from "react";
import "./SudokuGamePage.css";
import { useNavigate } from "react-router-dom";

// --- Constants: Sudoku Config ---

const BOARD_SIZE = 9;
const BOX_SIZE = 3;
const LS_BEST_KEY = "sudokuBestTime";
const DIFFICULTY_SETTINGS = {
  easy: { name: "Easy", clues: 40 },
  medium: { name: "Medium", clues: 32 },
  hard: { name: "Hard", clues: 24 },
};

const SUDOKU_SYMBOLS = ["1","2","3","4","5","6","7","8","9"];

// --- Sudoku Generation Utilities ---

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Recursively fill board using backtracking for valid Sudoku generation
function generateFullBoard() {
  const board = Array(BOARD_SIZE).fill(0).map(() => Array(BOARD_SIZE).fill(0));
  function fill(row, col) {
    if (row === BOARD_SIZE) return true;
    const nextRow = col === BOARD_SIZE - 1 ? row + 1 : row;
    const nextCol = col === BOARD_SIZE - 1 ? 0 : col + 1;
    for (let num of shuffle([1,2,3,4,5,6,7,8,9])) {
      if (isSafe(board, row, col, num)) {
        board[row][col] = num;
        if (fill(nextRow, nextCol)) return true;
        board[row][col] = 0;
      }
    }
    return false;
  }
  fill(0, 0);
  return board;
}

function isSafe(board, row, col, num) {
  for (let i = 0; i < BOARD_SIZE; ++i) {
    if (board[row][i] === num || board[i][col] === num) return false;
  }
  const startR = Math.floor(row / BOX_SIZE) * BOX_SIZE;
  const startC = Math.floor(col / BOX_SIZE) * BOX_SIZE;
  for (let i = 0; i < BOX_SIZE; ++i) {
    for (let j = 0; j < BOX_SIZE; ++j) {
      if (board[startR + i][startC + j] === num) return false;
    }
  }
  return true;
}

// Remove cells to form a puzzle; always leaves given number of clues (cells filled)
function makePuzzleFromSolution(solution, cluesCount) {
  const puzzle = solution.map(row => row.slice());
  let empties = BOARD_SIZE * BOARD_SIZE - cluesCount;
  let cells = [];
  for (let i = 0; i < BOARD_SIZE; ++i)
    for (let j = 0; j < BOARD_SIZE; ++j)
      cells.push([i, j]);
  shuffle(cells);
  while (empties > 0 && cells.length) {
    const [row, col] = cells.pop();
    const backup = puzzle[row][col];
    puzzle[row][col] = 0;
    empties--;
  }
  return puzzle;
}

// Check if board is filled correctly (for win condition)
function isSolved(board, fixed) {
  for (let i = 0; i < BOARD_SIZE; i++) {
    for (let j = 0; j < BOARD_SIZE; j++) {
      const num = board[i][j];
      if (num === 0) return false;
      // Check row/col/box constraints
      for (let k = 0; k < BOARD_SIZE; k++) {
        if (k !== j && board[i][k] === num) return false;
        if (k !== i && board[k][j] === num) return false;
      }
      const bsr = Math.floor(i / BOX_SIZE) * BOX_SIZE;
      const bsc = Math.floor(j / BOX_SIZE) * BOX_SIZE;
      for (let r = 0; r < BOX_SIZE; r++) {
        for (let c = 0; c < BOX_SIZE; c++) {
          const rr = bsr + r, cc = bsc + c;
          if ((rr !== i || cc !== j) && board[rr][cc] === num) return false;
        }
      }
    }
  }
  return true;
}

// Create fixed (given) cells mask for highlighting and protection
function getFixedCellsMask(puzzle) {
  return puzzle.map(row => row.map(cell => cell !== 0));
}

// --- Timer formatter ---
function formatTime(s) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec < 10 ? "0" : ""}${sec}`;
}

// --- PUBLIC_INTERFACE ---
/**
 * SudokuGamePage: full Sudoku game logic and modern UI for MiniMayhem Arcade.
 * Features:
 *  - Random board generation (with 3 difficulty modes).
 *  - 9x9 grid, 3x3 box lines, fixed clues, error highlighting.
 *  - Number picker + keyboard input, undo/redo, reset, optional hint.
 *  - Best time saved via localStorage (key "sudokuBestTime").
 *  - Responsive, accessible, visually clear distinction of fixed/user cells/selection.
 */
function SudokuGamePage() {
  // Game state
  const [difficulty, setDifficulty] = useState("easy");
  const [initial, setInitial] = useState(null);      // Original puzzle (array)
  const [solution, setSolution] = useState(null);    // Solution (hidden)
  const [fixed, setFixed] = useState(null);          // Boolean mask for fixed cells
  const [board, setBoard] = useState(null);          // Current play state
  const [selected, setSelected] = useState({ r: null, c: null });
  const [errors, setErrors] = useState([]);          // [{r,c}]
  const [history, setHistory] = useState([]);        // For undo/redo
  const [redoStack, setRedoStack] = useState([]);
  const [won, setWon] = useState(false);
  const [timer, setTimer] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const [bestTime, setBestTime] = useState(null);

  const timerRef = useRef();
  const navigate = useNavigate();

  // Generate a fresh puzzle and solution
  const generateNewGame = useCallback((diff = difficulty) => {
    setTimer(0);
    setTimerActive(true);
    setWon(false);
    setSelected({ r: null, c: null });
    setRedoStack([]);
    setHistory([]);
    // Sudoku board generation
    const solutionBoard = generateFullBoard();
    const cluesCount = DIFFICULTY_SETTINGS[diff].clues;
    const puzzle = makePuzzleFromSolution(solutionBoard, cluesCount);
    setInitial(puzzle);
    setSolution(solutionBoard);
    setFixed(getFixedCellsMask(puzzle));
    setBoard(puzzle.map(row => row.slice()));
    setErrors([]);
  }, [difficulty]);

  // On mount/load, best time
  useEffect(() => {
    if (typeof window !== "undefined") {
      let best = window.localStorage.getItem(LS_BEST_KEY);
      if (best !== null && !isNaN(Number(best))) {
        setBestTime(Number(best));
      }
    }
    generateNewGame();
    // eslint-disable-next-line
  }, []);

  // Timer
  useEffect(() => {
    if (!timerActive || won) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    timerRef.current = setInterval(() => setTimer(t => t + 1), 1000);
    return () => clearInterval(timerRef.current);
  }, [timerActive, won]);

  // Difficulty change
  function handleDifficultyChange(e) {
    setDifficulty(e.target.value);
    setTimeout(() => generateNewGame(e.target.value), 20);
  }

  // --- Board Controls ---
  function handleCellClick(r, c) {
    if (!fixed || !board) return;
    setSelected({ r, c });
  }

  function handleNumberInput(val) {
    if (!selected || selected.r == null || selected.c == null) return;
    if (fixed[selected.r][selected.c]) return;
    if (!SUDOKU_SYMBOLS.includes(val)) return;
    const n = Number(val);
    // Save to history for undo
    setHistory(hist => [
      ...hist,
      {
        board: board.map(row => row.slice()),
        selected: { ...selected },
      }
    ]);
    setRedoStack([]);
    // Place number
    const newBoard = board.map(row => row.slice());
    newBoard[selected.r][selected.c] = n;
    setBoard(newBoard);
  }

  // Keyboard support: numbers, arrows, Backspace, etc.
  useEffect(() => {
    function handler(e) {
      if (won) return;
      // Number: 1-9 (main or numpad)
      if (e.key.match(/^[1-9]$/)) {
        handleNumberInput(e.key);
        e.preventDefault();
      }
      // Move selection
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        let { r, c } = selected;
        if (r == null || c == null) {
          // If none selected, select the first empty
          for (let rr = 0; rr < BOARD_SIZE; rr++)
            for (let cc = 0; cc < BOARD_SIZE; cc++)
              if (!fixed[rr][cc]) { r = rr; c = cc; break; }
          if (r == null || c == null) { r = 0; c = 0; }
        }
        if (e.key === "ArrowUp") r = (r + BOARD_SIZE - 1) % BOARD_SIZE;
        if (e.key === "ArrowDown") r = (r + 1) % BOARD_SIZE;
        if (e.key === "ArrowLeft") c = (c + BOARD_SIZE - 1) % BOARD_SIZE;
        if (e.key === "ArrowRight") c = (c + 1) % BOARD_SIZE;
        setSelected({ r, c });
        e.preventDefault();
      }
      // Delete/Backspace
      if ((e.key === "Backspace" || e.key === "Delete") && selected.r != null && selected.c != null && !fixed[selected.r][selected.c]) {
        handleNumberInput("0"); // Remove number
        e.preventDefault();
      }
      // Undo/Redo
      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        handleUndo();
        e.preventDefault();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.shiftKey && e.key === "z"))) {
        handleRedo();
        e.preventDefault();
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line
  }, [selected, fixed, board, history, redoStack, won]);


  // Undo/redo
  function handleUndo() {
    if (!history.length) return;
    const last = history[history.length - 1];
    setBoard(last.board.map(row => row.slice()));
    setSelected(last.selected);
    setHistory(hist => hist.slice(0, -1));
    setRedoStack(rds => [
      ...rds,
      {
        board: board.map(row => row.slice()),
        selected: { ...selected },
      }
    ]);
  }
  function handleRedo() {
    if (!redoStack.length) return;
    const redo = redoStack[redoStack.length - 1];
    setBoard(redo.board.map(row => row.slice()));
    setSelected(redo.selected);
    setRedoStack(rds => rds.slice(0, -1));
    setHistory(hist => [
      ...hist,
      {
        board: board.map(row => row.slice()),
        selected: { ...selected },
      }
    ]);
  }

  // Delete cell
  function handleDeleteCell() {
    if (!selected || !board) return;
    if (fixed[selected.r][selected.c]) return;
    handleNumberInput("0");
  }
  // Reset board (same puzzle)
  function handleReset() {
    setBoard(initial.map(row => row.slice()));
    setHistory([]);
    setRedoStack([]);
    setErrors([]);
    setSelected({r:null,c:null});
    setTimer(0);
    setTimerActive(true);
    setWon(false);
  }

  // Hint: fill one correct empty cell (not required but optional)
  function handleHint() {
    // Find first empty cell that's not fixed
    for (let r = 0; r < BOARD_SIZE; ++r) {
      for (let c = 0; c < BOARD_SIZE; ++c) {
        if (!fixed[r][c] && board[r][c] !== solution[r][c]) {
          handleCellClick(r, c);
          handleNumberInput(String(solution[r][c]));
          return;
        }
      }
    }
  }

  // Check errors after each move
  useEffect(() => {
    if (!board || !fixed) return;
    // Highlight cells with wrong values
    let errs = [];
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (!fixed[r][c] && board[r][c] !== 0 && board[r][c] !== solution[r][c]) {
          errs.push({ r, c });
        }
      }
    }
    setErrors(errs);

    // Win check
    if (isSolved(board, fixed)) {
      setTimerActive(false);
      setWon(true);
      // Save best time if new
      if (typeof window !== "undefined") {
        let prev = window.localStorage.getItem(LS_BEST_KEY);
        if (!prev || Number(timer) < Number(prev)) {
          window.localStorage.setItem(LS_BEST_KEY, timer);
          setBestTime(timer);
        }
      }
    }
  }, [board, fixed, timer]);

  // --- UI RENDER ---
  if (!initial || !board || !fixed) {
    return (
      <div className="sudoku-root">
        <div className="sudoku-loader">Loading puzzle...</div>
      </div>
    );
  }
  return (
    <div className="sudoku-root">
      <div className="sudoku-bg"></div>
      <main className="sudoku-main-card">
        {/* Header: title + pills */}
        <header className="sudoku-header-row">
          <h2 className="sudoku-title">
            <span className="sudoku-emoji" aria-hidden="true">🔢</span>
            Sudoku
          </h2>
          <div className="sudoku-pill-group">
            <Pill label="Time" value={formatTime(timer)} accent />
            <Pill label="Errors" value={errors.length} />
            <Pill
              label="Best"
              value={bestTime !== null ? formatTime(bestTime) : "—"}
            />
            <button
              className="sudoku-btn reset"
              onClick={handleReset}
              aria-label="Reset puzzle"
              tabIndex={0}>
              ↺ Reset
            </button>
          </div>
        </header>
        <div className="sudoku-subrow">
          <select
            className="sudoku-difficulty"
            value={difficulty}
            onChange={handleDifficultyChange}
            disabled={won}
            tabIndex={0}
            aria-label="Difficulty">
            {Object.entries(DIFFICULTY_SETTINGS).map(([k, v]) => (
              <option value={k} key={k}>{v.name}</option>
            ))}
          </select>
          <button
            className="sudoku-btn hint"
            onClick={handleHint}
            disabled={won}
            tabIndex={0}
            aria-label="Hint">
            💡 Hint
          </button>
          <button
            className="sudoku-btn undo"
            onClick={handleUndo}
            disabled={!history.length}
            tabIndex={0}
            aria-label="Undo">
            ⎌ Undo
          </button>
          <button
            className="sudoku-btn redo"
            onClick={handleRedo}
            disabled={!redoStack.length}
            tabIndex={0}
            aria-label="Redo">
            ⎌ Redo
          </button>
        </div>
        {/* Sudoku board */}
        <SudokuGrid
          board={board}
          fixed={fixed}
          selected={selected}
          errors={errors}
          onCellClick={handleCellClick}
        />
        {/* Number input */}
        <NumberPad onInput={handleNumberInput} onDelete={handleDeleteCell} disabled={won} />
        {/* Keyboard shortcuts */}
        <div className="sudoku-tip-row">
          <span className="sudoku-tip">Keyboard: 1-9 to enter, arrows to navigate, ⌫/⌦ delete, Ctrl+Z undo, Ctrl+Y redo.</span>
        </div>
        {/* WIN MODAL */}
        {won && (
          <section className="sudoku-win-modal" aria-modal="true" role="dialog" tabIndex={0}>
            <div className="win-emoji">🏆</div>
            <div className="win-title">Sudoku Solved!</div>
            <div className="win-row">
              <span className="win-label">Time:</span>
              <span className="win-value">{formatTime(timer)}</span>
            </div>
            <div className="win-row">
              <span className="win-label">Best:</span>
              <span className="win-value">{bestTime !== null ? formatTime(bestTime) : formatTime(timer)}</span>
            </div>
            <button className="sudoku-btn win-playagain" onClick={() => generateNewGame()} autoFocus>
              New Puzzle
            </button>
            <button className="sudoku-btn win-back" onClick={() => navigate("/games")}>← Back to Games</button>
            <div className="sudoku-tip bottom">Challenge: Try solving faster or on a harder difficulty!</div>
          </section>
        )}
      </main>
    </div>
  );
}

// Sudoku board component (with grid, responsive, highlight, 3x3 lines)
function SudokuGrid({ board, fixed, selected, errors, onCellClick }) {
  // Row/col/box highlight for current cell:
  const { r: selR, c: selC } = selected;
  return (
    <div className="sudoku-board" aria-label="Sudoku grid">
      {board.map((row, r) =>
        row.map((cell, c) => {
          const isSelected = r === selR && c === selC;
          const isRowColBox =
            selR !== null &&
            (r === selR || c === selC ||
              (Math.floor(r / BOX_SIZE) === Math.floor(selR / BOX_SIZE) &&
                Math.floor(c / BOX_SIZE) === Math.floor(selC / BOX_SIZE)));
          const isError = errors.some(e => e.r === r && e.c === c);
          const isFixed = fixed[r][c];
          return (
            <button
              key={r + "-" + c}
              className={
                "sudoku-cell"
                + (isFixed ? " fixed" : "")
                + (isSelected ? " selected" : "")
                + (isRowColBox && !isSelected ? " highlight" : "")
                + (isError ? " error" : "")
                + (cell === 0 ? " empty" : "")
                + (
                  (r + 1) % BOX_SIZE === 0 && r !== 8 ? " box-border-bottom" : ""
                )
                + (
                  (c + 1) % BOX_SIZE === 0 && c !== 8 ? " box-border-right" : ""
                )
              }
              onClick={() => onCellClick(r, c)}
              tabIndex={0}
              aria-label={
                `Row ${r + 1}, Col ${c + 1}` +
                (isFixed ? ", fixed." : "") +
                (isError ? " Incorrect." : "") +
                (isSelected ? " Selected." : "")
              }
              disabled={isFixed}
            >
              {cell ? cell : ""}
            </button>
          );
        })
      )}
    </div>
  );
}

// On-screen number pad (for mobile/desktop)
function NumberPad({ onInput, onDelete, disabled }) {
  return (
    <div className="sudoku-numpad">
      {SUDOKU_SYMBOLS.map(n => (
        <button key={n} className="numpad-btn" onClick={() => onInput(n)} disabled={disabled}>{n}</button>
      ))}
      <button className="numpad-btn del" onClick={onDelete} disabled={disabled} aria-label="Delete">⌫</button>
    </div>
  );
}

// Small pill
function Pill({ label, value, accent }) {
  return (
    <span className={"sudoku-pill" + (accent ? " accent" : "")}>
      <span className="sudoku-pill-label">{label}</span>
      <span className="sudoku-pill-value">{value}</span>
    </span>
  );
}

export default SudokuGamePage;
