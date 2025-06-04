import React from 'react';
import './App.css';
import Navbar from './Navbar';
import LandingPage from './LandingPage';
import GamesPage from './GamesPage';
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
            {/* Optionally, add more routes like scoreboard/about/help in future */}
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;