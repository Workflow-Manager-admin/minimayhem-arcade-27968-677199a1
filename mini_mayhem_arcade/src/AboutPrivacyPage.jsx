import React from "react";

/**
 * PUBLIC_INTERFACE
 * AboutPrivacyPage: Shows information about the app, privacy statement, and credits.
 */
export default function AboutPrivacyPage() {
  return (
    <div className="container" style={{ marginTop: 100, maxWidth: 700 }}>
      <h1 style={{ fontSize: "2.4rem", fontWeight: 700, marginBottom: 16 }}>
        About & Privacy
      </h1>
      <p style={{ fontSize: "1.14rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
        <b>MiniMayhem Arcade</b> is a browser-based collection of fun, skill-building mini-games.
        <br /><br />
        <b>Privacy:</b> This web app does <b>not</b> track you, require login, or send your data anywhere. 
        <br />
        All game scores and settings are stored <b>only on your own device</b> using your browser's local storage.
        <br /><br />
        Your high scores, theme choices, and gameplay stats are private and never leave your computer.
      </p>

      <div style={{ marginTop: 28, color: "var(--text-secondary)" }}>
        <b>Credits:</b> Designed &amp; built for the Kavia Arcade challenge.<br />
        <span role="img" aria-label="gamepad" style={{ fontSize: 26 }}>🎮</span> Enjoy and improve!
      </div>
    </div>
  );
}
