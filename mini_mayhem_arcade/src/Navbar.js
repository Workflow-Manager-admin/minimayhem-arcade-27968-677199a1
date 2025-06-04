import React, { useState, useRef, useEffect } from "react";
import "./Navbar.css";
import { Link } from "react-router-dom";

/**
 * PUBLIC_INTERFACE
 * Navbar for MiniMayhem Arcade
 * Contains app logo/title (left), nav links (right), settings dropdown and theme toggle.
 */
function Navbar() {
  // Handle mobile menu open/close
  const [menuOpen, setMenuOpen] = useState(false);

  // State for settings dropdown open/close (separate open state for settings)
  const [settingsOpen, setSettingsOpen] = useState(false);

  // State for theme (local only: "light" | "dark")
  const [theme, setTheme] = useState(() => {
    // Prefer localStorage theme, else match OS, else light
    if (window.localStorage.getItem("mmarcade-theme")) {
      return window.localStorage.getItem("mmarcade-theme");
    }
    if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      return "dark";
    }
    return "light";
  });

  // Apply theme class to root <html>
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    window.localStorage.setItem("mmarcade-theme", theme);
  }, [theme]);

  // Close menus when clicking outside
  const navRef = useRef();

  useEffect(() => {
    function handleClickOutside(e) {
      if (
        navRef.current &&
        !navRef.current.contains(e.target)
      ) {
        setMenuOpen(false);
        setSettingsOpen(false);
      }
    }
    if (menuOpen || settingsOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [menuOpen, settingsOpen]);

  // Keyboard accessibility: close on escape
  useEffect(() => {
    function onEsc(e) {
      if (e.key === "Escape") {
        setMenuOpen(false);
        setSettingsOpen(false);
      }
    }
    if (menuOpen || settingsOpen) {
      document.addEventListener("keydown", onEsc);
    }
    return () => document.removeEventListener("keydown", onEsc);
  }, [menuOpen, settingsOpen]);

  // Accessible open/close handlers
  const toggleMenu = () => setMenuOpen((v) => !v);
  const closeMenu = () => setMenuOpen(false);
  const toggleSettings = () => setSettingsOpen((v) => !v);
  const closeSettings = () => setSettingsOpen(false);

  // Sub-components in same file for simplicity (could split for scale)
  return (
    <nav className="mmarcade-navbar" ref={navRef}>
      <div className="mmarcade-nav-inner">
        <Link to="/" className="mmarcade-logo" aria-label="MiniMayhem Arcade">
          <span className="mmarcade-logo-symbol" aria-hidden="true">🎮</span>
          <span className="mmarcade-logo-text">MiniMayhem Arcade</span>
        </Link>

        {/* Nav links and buttons. Collapse into hamburger on mobile */}
        <div className="mmarcade-nav-actions">
          {/* Hamburger for small screens */}
          <button
            className="mmarcade-hamburger"
            aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={menuOpen}
            aria-controls="mmarcade-nav-menu"
            onClick={toggleMenu}
          >
            {/* Hamburger/close icon */}
            <div className={menuOpen ? "hamburger-icon open" : "hamburger-icon"}>
              <span></span>
              <span></span>
              <span></span>
            </div>
          </button>

          {/* Desktop nav links */}
          <ul
            className={`mmarcade-nav-links${menuOpen ? " open" : ""}`}
            id="mmarcade-nav-menu"
            role="menu"
            aria-label="Main menu"
          >
            <li>
              <Link to="/games" className="mmarcade-nav-link" tabIndex={menuOpen || window.innerWidth > 900 ? 0 : -1}>
                Games
              </Link>
            </li>
            <li>
              <a href="/scoreboard" className="mmarcade-nav-link" tabIndex={menuOpen || window.innerWidth > 900 ? 0 : -1}>Scoreboard</a>
            </li>
            {/* Settings Dropdown */}
            <li className="mmarcade-settings-parent">
              <button
                className="mmarcade-nav-link mmarcade-settings-btn"
                aria-haspopup="true"
                aria-expanded={settingsOpen}
                aria-controls="mmarcade-settings-dropdown"
                tabIndex={menuOpen || window.innerWidth > 900 ? 0 : -1}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleSettings();
                }}
                onTouchStart={(e) => {
                  e.stopPropagation();
                  toggleSettings();
                }}
              >
                Settings <span className="mmarcade-dropdown-caret" aria-hidden="true">▼</span>
              </button>
              <SettingsDropdown
                open={settingsOpen}
                onClose={closeSettings}
                // Removed theme/setTheme props from dropdown
              />
            </li>
          </ul>
          {/* Theme toggle button -- now visible at far right, not in dropdown */}
          <div className="navbar-theme-toggle-control">
            <ThemeToggle theme={theme} setTheme={setTheme} />
          </div>
        </div>
      </div>
      {/* Overlay clickable on mobile menu open */}
      {menuOpen && <div className="mmarcade-menu-overlay" onClick={closeMenu} aria-hidden="true"></div>}
    </nav>
  );
}

/**
 * PUBLIC_INTERFACE
 * Settings Dropdown Menu
 * @param {open: boolean, onClose: fn}
 */
function SettingsDropdown({ open, onClose }) {
  // Keyboard navigation
  const dropdownRef = useRef();
  useEffect(() => {
    if (open && dropdownRef.current) {
      // Focus first item
      dropdownRef.current.querySelector("button, a")?.focus();
    }
  }, [open]);

  // Accessible: trap focus while open
  useEffect(() => {
    function trapFocus(e) {
      if (
        open &&
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target)
      ) {
        e.stopPropagation();
        e.preventDefault();
        dropdownRef.current.querySelector("button, a")?.focus();
      }
    }
    if (open) document.addEventListener("focusin", trapFocus);
    return () => document.removeEventListener("focusin", trapFocus);
  }, [open]);

  // Hide dropdown, keyboard
  useEffect(() => {
    function handler(e) {
      if (open && (e.key === "Escape" || e.key === "Tab")) {
        onClose();
      }
    }
    if (open) document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Dropdown contents
  return (
    <div
      className={`mmarcade-settings-dropdown${open ? " open" : ""}`}
      id="mmarcade-settings-dropdown"
      ref={dropdownRef}
      tabIndex={-1}
      aria-hidden={!open}
    >
      <ul className="dropdown-menu-list">
        <li>
          <button className="dropdown-menu-item" tabIndex={open ? 0 : -1} onClick={() => { alert("Reset Data clicked!"); onClose(); }}>
            Reset Data
          </button>
        </li>
        <li>
          <Link
            className="dropdown-menu-item"
            tabIndex={open ? 0 : -1}
            to="/about-privacy"
            onClick={onClose}
          >
            About &amp; Privacy
          </Link>
        </li>
        <li>
          <a className="dropdown-menu-item" tabIndex={open ? 0 : -1} href="/help">
            Help
          </a>
        </li>
        <li>
          <a className="dropdown-menu-item" tabIndex={open ? 0 : -1} href="/contact">
            Contact
          </a>
        </li>
      </ul>
    </div>
  );
}

/**
 * PUBLIC_INTERFACE
 * Theme Toggle Switch (slider with animated sun/moon, track, thumb).
 * - Visually attractive toggle switch with animated icons.
 * - Fully accessible (label, focus, keyboard, aria-pressed).
 * - Smooth color/position transitions and "arcade"/modern style.
 */
function ThemeToggle({ theme, setTheme }) {
  const isDark = theme === "dark";

  // Accessibility: handle Space/Enter as toggle
  function handleKeyDown(e) {
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      setTheme(isDark ? "light" : "dark");
    }
  }

  return (
    <div className="arcade-toggle-switch-wrapper">
      <label
        className="arcade-toggle-switch"
        tabIndex={0}
        aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
        aria-checked={isDark}
        role="switch"
        onKeyDown={handleKeyDown}
      >
        <input
          className="arcade-toggle-input"
          type="checkbox"
          checked={isDark}
          onChange={() => setTheme(isDark ? "light" : "dark")}
          tabIndex={-1}
          aria-hidden="true"
        />
        {/* Track */}
        <span className="arcade-toggle-track">
          {/* Animated icon thumb */}
          <span
            className="arcade-toggle-thumb"
            aria-hidden="true"
          >
            {isDark ? (
              // Animated Moon
              <span className="arcade-moon-icon">
                <svg width="26" height="26" viewBox="0 0 26 26" fill="none" aria-hidden="true">
                  <circle cx="13" cy="13" r="10" fill="#3749A4">
                    <animate attributeName="fill" values="#3749A4;#FFE066;#3749A4" dur="2s" repeatCount="indefinite"/>
                  </circle>
                  <path
                    d="M20 14.5c-.89.5-2.08.5-3.1-.1A6.5 6.5 0 0 1 11.6 7.1c.6-1.02.6-2.21.1-3.1a8 8 0 1 0 8.3 10.5z"
                    fill="#222"
                  >
                    <animate attributeName="fill" values="#222;#463b9e;#222" dur="2s" repeatCount="indefinite"/>
                  </path>
                </svg>
              </span>
            ) : (
              // Sun icon with rays
              <span className="arcade-sun-icon">
                <svg width="26" height="26" viewBox="0 0 26 26" fill="none" aria-hidden="true">
                  <circle cx="13" cy="13" r="8" fill="#FFE066">
                    <animate attributeName="fill" values="#FFE066;#FFD447;#FFE066" dur="2s" repeatCount="indefinite"/>
                  </circle>
                  <g stroke="#FFD447" strokeWidth="2" strokeLinecap="round">
                    <line x1="13" y1="2.2" x2="13" y2="5.0"/>
                    <line x1="13" y1="21" x2="13" y2="23.8"/>
                    <line x1="4.2" y1="4.2" x2="6.1" y2="6.1"/>
                    <line x1="19.9" y1="19.9" x2="17.8" y2="17.8"/>
                    <line x1="2.2" y1="13" x2="5.0" y2="13"/>
                    <line x1="21" y1="13" x2="23.8" y2="13"/>
                    <line x1="4.2" y1="21.8" x2="6.1" y2="19.9"/>
                    <line x1="19.9" y1="6.1" x2="17.8" y2="4.2"/>
                  </g>
                </svg>
              </span>
            )}
          </span>
        </span>
        <span className="arcade-toggle-label">{isDark ? "Dark" : "Light"} mode</span>
      </label>
    </div>
  );
}

export default Navbar;
