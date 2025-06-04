import React from 'react';
import './App.css';
import Navbar from './Navbar';
import LandingPage from './LandingPage';
import GamesPage from './GamesPage';
import MemoryGamePage from './MemoryGamePage.jsx';
import ReactionRushPage from './ReactionRushPage.jsx';
import TypingChallengePage from './TypingChallengePage.jsx';
import QuickMathPage from './QuickMathPage.jsx';
import SudokuGamePage from './SudokuGamePage.jsx';
import EmojiReactionTimePage from './EmojiReactionTimePage.jsx';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

/**
 * PUBLIC_INTERFACE
 * App component is the main container for the MiniMayhem Arcade app.
 * Sets up client-side routing using React Router.
 * - Shows Navbar on all pages.
 * - LandingPage at "/" (default)
 * - GamesPage at "/games"
 */
function App() {
  return (
    <Router>
      <div className="app">
        <Navbar />
        <main>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/games" element={<GamesPage />} />
            <Route path="/games/memory" element={<MemoryGamePage />} />
            <Route path="/games/reaction" element={<ReactionRushPage />} />
            <Route path="/games/typing" element={<TypingChallengePage />} />
            <Route path="/games/sudoku" element={<SudokuGamePage />} />
            <Route path="/games/quick-math" element={<QuickMathPage />} />
            <Route path="/games/emoji-reaction" element={<EmojiReactionTimePage />} />
            {/* Optionally, add more routes like scoreboard/about/help in future */}
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
