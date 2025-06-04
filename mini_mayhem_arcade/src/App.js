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
import SlidingTilePuzzlePage from './SlidingTilePuzzlePage.jsx';
import BlockGamePage from './BlockGamePage.jsx';
import ScoreboardPage from './ScoreboardPage.jsx';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import AboutPrivacyPage from './AboutPrivacyPage.jsx';
import HelpPage from './HelpPage.jsx'; // Help Page route integration
import ContactPage from './ContactPage.jsx'; // Contact Page import
import ComingSoon from './ComingSoon.jsx';

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
            <Route path="/games/block" element={<BlockGamePage />} />
            <Route path="/games/memory" element={<MemoryGamePage />} />
            <Route path="/games/reaction" element={<ReactionRushPage />} />
            <Route path="/games/typing" element={<TypingChallengePage />} />
            <Route path="/games/sudoku" element={<SudokuGamePage />} />
            <Route path="/games/quick-math" element={<QuickMathPage />} />
            <Route path="/games/sliding-tile" element={<SlidingTilePuzzlePage />} />
            {/* NEW: Shadow Runner placeholder route */}
            <Route
              path="/games/shadow-runner"
              element={
                <ComingSoon
                  title="Shadow Runner Coming Soon!"
                  description="This endless runner mini-game is in development. Check back soon to dash and dodge your way to a new high score!"
                />
              }
            />
            <Route path="/scoreboard" element={<ScoreboardPage />} />
            {/* About & Privacy page routed to /about-privacy */}
            <Route path="/about-privacy" element={<AboutPrivacyPage />} />
            {/* Add help page to routing */}
            <Route path="/help" element={<HelpPage />} />
            {/* Add contact page route */}
            <Route path="/contact" element={<ContactPage />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
