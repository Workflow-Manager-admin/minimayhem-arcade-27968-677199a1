import React from "react";

/**
 * PUBLIC_INTERFACE
 * AboutPrivacyPage - Information and privacy statement page for MiniMayhem Arcade.
 * Renders when user visits /about-privacy.
 */
function AboutPrivacyPage() {
  return (
    <div className="about-privacy-root" style={{ maxWidth: 780, margin: "72px auto", padding: 24 }}>
      <h1 style={{ fontSize: "2.1rem", fontWeight: 800, marginBottom: 15, color: "#68adc4" }}>
        About &amp; Privacy
      </h1>
      <section style={{ background: "rgba(104,173,196,0.13)", borderRadius: 14, padding: "23px 20px", marginBottom: 24 }}>
        <p>
          <strong>MiniMayhem Arcade</strong> is a fun mini-game platform designed for enjoyment and skill-building. All scores and game data are stored <b>locally</b> on your browser and <b>never</b> sent to any server.
        </p>
        <p>
          <b>Privacy:</b> No personal data, identifiers, or gameplay results are transmitted or tracked externally. All progress, settings, and high scores stay on your device. You can clear scores anytime from your browser settings or the Settings menu.
        </p>
        <p>
          <b>Open Source:</b> Built using modern, lightweight web technologies for speed and accessibility. No sign-up, ads, or external analytics.
        </p>
      </section>
      <section>
        <h3 style={{ fontWeight: 700, fontSize: "1.22rem", marginTop: 25 }}>Frequently Asked Questions</h3>
        <ul style={{ paddingLeft: 18, lineHeight: 1.6 }}>
          <li>
            <b>Is any data uploaded or shared?</b> <br />
            <span style={{ color: "#4f46e5" }}>No.</span> All data is local only.
          </li>
          <li>
            <b>How do I reset my scores?</b> <br />
            Use the "Settings &rarr; Reset Data" option in the menu, or clear site data in your browser.
          </li>
          <li>
            <b>Where can I suggest feedback?</b> <br />
            Please use the <a href="/contact">Contact</a> or <a href="/help">Help</a> page!
          </li>
        </ul>
      </section>
      <footer style={{ marginTop: 35, color: "#b4bef9", fontSize: "1rem" }}>
        &copy; {new Date().getFullYear()} MiniMayhem Arcade
      </footer>
    </div>
  );
}

export default AboutPrivacyPage;
