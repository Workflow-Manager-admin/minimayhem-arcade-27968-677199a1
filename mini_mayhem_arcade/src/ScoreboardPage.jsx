import React, { useState, useEffect } from "react";
import "./ScoreboardPage.css";
import { useNavigate } from "react-router-dom";

/*
 * PUBLIC_INTERFACE
 * ScoreboardPage: Shows best scores/records across all mini-games and reset option.
 * Only data for enabled/available games is shown. No server; all scores local.
 */
function ScoreboardPage() {
  const [scores, setScores] = useState({});
  const [resetNotice, setResetNotice] = useState("");
  const navigate = useNavigate();

  // On mount/load, fetch all high scores from localStorage
  useEffect(() => {
    function fetchScores() {
      let data = {};

      // Block Game
      const blockScore = window.localStorage.getItem("mmarcade-blockgame-bestscore");
      data.block = blockScore !== null && !isNaN(parseInt(blockScore, 10))
        ? parseInt(blockScore, 10)
        : null;

      // Memory Game
      try {
        const mem = window.localStorage.getItem("mmarcade-memgame-highscore");
        if (mem) {
          data.memory = JSON.parse(mem);
        }
      } catch { data.memory = null; }

      // Reaction Speed
      const reaction = window.localStorage.getItem("reactionGameScore");
      data.reaction = reaction !== null && !isNaN(parseInt(reaction, 10))
        ? parseInt(reaction, 10)
        : null;

      // Typing Challenge (sentence)
      const typingWPM = window.localStorage.getItem("mmarcade-typing-bestwpm");
      data.typingWPM = typingWPM !== null && !isNaN(Number(typingWPM)) ? Number(typingWPM) : null;

      // Word Typing Challenge (this work item's requirement)
      const typingWordChallenge = window.localStorage.getItem("mmarcade-word-typing-bestscore");
      data.wordTyping = typingWordChallenge !== null && !isNaN(Number(typingWordChallenge)) ? Number(typingWordChallenge) : null;

      // Sudoku
      const sudoku = window.localStorage.getItem("sudokuBestTime");
      data.sudoku = sudoku !== null && !isNaN(parseInt(sudoku, 10))
        ? parseInt(sudoku, 10)
        : null;

      // Sliding Tile (classic 4x4)
      try {
        const sliding = window.localStorage.getItem("mmarcade-slidingtile-best-4");
        if (sliding) data.sliding = JSON.parse(sliding);
      } catch { data.sliding = null; }

      return data;
    }
    setScores(fetchScores());
  }, [resetNotice]);

  // Reset only arcade scores (not all localStorage!)
  function resetScores() {
    try {
      // Block Game
      window.localStorage.removeItem("mmarcade-blockgame-bestscore");
      // Memory Game
      window.localStorage.removeItem("mmarcade-memgame-highscore");
      window.localStorage.removeItem("mmarcade-memgame-lastscore");
      // Reaction Game
      window.localStorage.removeItem("reactionGameScore");
      window.localStorage.removeItem("reaction_time_last");
      // Typing Challenge (sentence)
      window.localStorage.removeItem("mmarcade-typing-bestwpm");
      // Word Typing Challenge
      window.localStorage.removeItem("mmarcade-word-typing-bestscore");
      // Sudoku
      window.localStorage.removeItem("sudokuBestTime");
      // Sliding Tile
      window.localStorage.removeItem("mmarcade-slidingtile-best-4");
      setResetNotice("Scores reset!");
    } catch {
      setResetNotice("Error resetting.");
    }
    setTimeout(() => setResetNotice(""), 1500);
  }

  // Render scores
  function renderScoreRows() {
    return (
      <>
        <tr>
          <td>Block Game</td>
          <td>
            {scores.block !== null ? scores.block : "—"}
          </td>
        </tr>
        <tr>
          <td>Memory Game</td>
          <td>
            {scores.memory && typeof scores.memory.moves === "number"
              ? `${scores.memory.moves} moves, ${Math.floor(scores.memory.time / 60)}:${(scores.memory.time % 60).toString().padStart(2, "0")}`
              : "—"}
          </td>
        </tr>
        <tr>
          <td>Reaction Speed</td>
          <td>
            {scores.reaction !== null ? (scores.reaction > 1200
              ? (scores.reaction / 1000).toFixed(3) + "s"
              : scores.reaction + " ms")
              : "—"}
          </td>
        </tr>
        <tr>
          <td>Typing Challenge (Best WPM)</td>
          <td>
            {scores.typingWPM !== null ? scores.typingWPM : "—"}
          </td>
        </tr>
        <tr>
          <td>Word Typing Challenge</td>
          <td>
            {scores.wordTyping !== null ? scores.wordTyping + " pts" : "—"}
          </td>
        </tr>
        <tr>
          <td>Sliding Tile Puzzle</td>
          <td>
            {scores.sliding && typeof scores.sliding.moves === "number"
              ? `${scores.sliding.moves} moves, ${Math.floor(scores.sliding.time / 60)}:${(scores.sliding.time % 60).toString().padStart(2, "0")}`
              : "—"}
          </td>
        </tr>
        <tr>
          <td>Sudoku</td>
          <td>
            {scores.sudoku !== null
              ? `${Math.floor(scores.sudoku / 60)}:${(scores.sudoku % 60).toString().padStart(2, "0")}`
              : "—"}
          </td>
        </tr>
      </>
    );
  }

  return (
    <div className="scoreboard-root">
      <main className="scoreboard-main">
        <h2 className="scoreboard-title">
          <span role="img" aria-label="Trophy">🏅</span> Scoreboard
        </h2>
        <p className="scoreboard-desc">All-time best scores are saved locally on your device. Want a clean slate? Reset below!</p>
        <table className="scoreboard-table" aria-label="High scores across games">
          <thead>
            <tr>
              <th>Game</th>
              <th>Your Best</th>
            </tr>
          </thead>
          <tbody>
            {renderScoreRows()}
          </tbody>
        </table>
        <button className="scoreboard-reset-btn" onClick={resetScores}>
          Reset Scores
        </button>
        {resetNotice && <div className="scoreboard-reset-message">{resetNotice}</div>}
        <button className="scoreboard-back-btn" onClick={() => navigate("/games")}>
          ← Back to Games
        </button>
      </main>
    </div>
  );
}

export default ScoreboardPage;
