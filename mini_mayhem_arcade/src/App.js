import React from 'react';
import './App.css';
import Navbar from './Navbar';
import LandingPage from './LandingPage';

/**
 * PUBLIC_INTERFACE
 * App component is the main container for the MiniMayhem Arcade app.
 * Displays the Navbar and the main content.
 * If using no router, show LandingPage by default as home.
 */
function App() {
  return (
    <div className="app">
      <Navbar />
      {/* Render the new LandingPage as default content */}
      <main>
        <LandingPage />
      </main>
    </div>
  );
}

export default App;