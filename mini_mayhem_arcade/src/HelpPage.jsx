import React, { useState } from "react";
import "./HelpPage.css";
import { useNavigate } from "react-router-dom";

// Example FAQ items
const FAQS = [
  {
    icon: "🎮",
    title: "What is MiniMayhem Arcade?",
    answer:
      "MiniMayhem Arcade is a vibrant mini-game platform! Play memory, reaction, typing, math, and random fun games for quick, skill-based challenges. No sign-up needed—just play and improve your score!"
  },
  {
    icon: "💾",
    title: "How are my scores saved?",
    answer:
      "Your high scores and best times are saved automatically in your browser (locally). No account or internet is required. Clear browser storage to reset progress."
  },
  {
    icon: "🌗",
    title: "How do I switch between light & dark mode?",
    answer:
      "Use the settings menu in the top right. Click on the 🌞/🌙 icon to switch! The site remembers your last theme."
  },
  {
    icon: "🔒",
    title: "Is my data private? Do you collect info?",
    answer:
      "Your scores stay on your device. No accounts, logins, or tracking—your achievements are private and safe!"
  },
  {
    icon: "🤔",
    title: "Something isn’t working. What can I do?",
    answer:
      "Try refreshing the page! If problems continue, clear your browser’s site data. For persistent issues, check your browser version or try another browser."
  },
  {
    icon: "🕹️",
    title: "Where can I find instructions for each game?",
    answer:
      "Each game includes built-in instructions before play. Look for them at the top of every game screen before you begin!"
  },
  {
    icon: "🏠",
    title: "How do I get back to the main page?",
    answer:
      "Hit the bold Return button at the bottom or use the navigation bar’s logo to return home anytime!"
  }
];

// PUBLIC_INTERFACE
/**
 * HelpPage: Themed Help/FAQ page with responsive, interactive features and dark/light support.
 */
function HelpPage() {
  const [search, setSearch] = useState("");
  const [openIndexes, setOpenIndexes] = useState([]); // Array of indexes that are expanded
  const navigate = useNavigate();

  // Filter by title/answer phrase
  const filteredFaqs = FAQS.filter(
    (faq) =>
      faq.title.toLowerCase().includes(search.toLowerCase()) ||
      faq.answer.toLowerCase().includes(search.toLowerCase())
  );

  // Toggle accordion
  function handleToggle(idx) {
    setOpenIndexes((prev) =>
      prev.includes(idx)
        ? prev.filter((i) => i !== idx)
        : [...prev, idx]
    );
  }

  // Keyboard accessibility toggle
  function handleKey(e, idx) {
    if (e.key === "Enter" || e.key === " ") {
      handleToggle(idx);
    }
  }

  // Render
  return (
    <div className="help-root">
      <div className="help-blur-bg1"></div>
      <div className="help-blur-bg2"></div>
      <section className="help-container">
        <header className="help-header">
          <span className="help-icon" aria-hidden="true">❓</span>
          <h1 className="help-title">Help & FAQ</h1>
          <p className="help-desc">
            Quick answers to common questions about MiniMayhem Arcade.<br/>
            Search below or browse the topics!
          </p>
          <div className="help-search-bar">
            <input
              type="search"
              placeholder="Search FAQs…"
              aria-label="Search in Frequently Asked Questions"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="help-search-input"
            />
          </div>
        </header>

        <section className="help-faq-list" aria-label="Frequently Asked Questions">
          {filteredFaqs.length === 0 && (
            <div className="help-no-results">
              <span role="img" aria-label="no results">🔍</span> No matching FAQs found.
            </div>
          )}
          {filteredFaqs.map((faq, idx) => {
            // Find original faq index for accordion state
            const origIdx = FAQS.indexOf(faq);
            const isOpen = openIndexes.includes(origIdx);
            return (
              <div
                className={`help-faq-card${isOpen ? " open" : ""}`}
                key={faq.title}
                tabIndex={0}
                aria-expanded={isOpen}
                role="button"
                onClick={() => handleToggle(origIdx)}
                onKeyDown={(e) => handleKey(e, origIdx)}
                style={{ animationDelay: `${0.1 * idx}s` }}
              >
                <div className="help-faq-q-row">
                  <span className="help-faq-icon" aria-hidden="true">{faq.icon}</span>
                  <span className="help-faq-q-title">{faq.title}</span>
                  <span
                    className={`help-faq-caret${isOpen ? " rotated" : ""}`}
                    aria-hidden="true"
                  >▼</span>
                </div>
                <div
                  className="help-faq-answer"
                  style={{
                    maxHeight: isOpen ? "260px" : "0px",
                    transition: "max-height 0.32s cubic-bezier(.71,.16,.39,.88), padding 0.22s"
                  }}
                  aria-hidden={!isOpen}
                >
                  <div className="help-faq-answer-inner">{faq.answer}</div>
                </div>
              </div>
            );
          })}
        </section>
        {/* Prominent return button */}
        <div className="help-return-row">
          <button
            className="help-return-btn"
            onClick={() => navigate("/")}
            aria-label="Return to Main Page"
            tabIndex={0}
          >
            ← Return to Home
          </button>
        </div>
      </section>
    </div>
  );
}

export default HelpPage;
