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
 * @param {open: boolean, onClose: fn, theme: string, setTheme: fn}
 */
function SettingsDropdown({ open, onClose, theme, setTheme }) {
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
      {/* Divider */}
      <div className="dropdown-divider" aria-hidden="true"></div>
      {/* Theme Toggle Row */}
      <div className="dropdown-theme-row">
        <ThemeToggle theme={theme} setTheme={setTheme} />
      </div>
    </div>
  );
}

/**
 * PUBLIC_INTERFACE
 * Theme Toggle (sun/moon icon, theme label, compact for dropdown)
 * @param {theme: string, setTheme: fn}
 */
function ThemeToggle({ theme, setTheme }) {
  const isDark = theme === "dark";
  return (
    <button
      className="theme-toggle"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      tabIndex={0}
    >
      {isDark ? (
        <span className="theme-toggle-icon" aria-hidden="true">
          {/* Moon icon */}
          <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
            <path d="M21 12.62A9 9 0 1 1 11.38 3a1 1 0 0 1 .96 1.23 7.001 7.001 0 0 0 7.43 8.46 1 1 0 0 1 1.23.96z" />
          </svg>
        </span>
      ) : (
        <span className="theme-toggle-icon" aria-hidden="true">
          {/* Sun icon */}
          <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
            <circle cx="12" cy="12" r="5" />
            <g>
              <line x1="12" y1="1.2" x2="12" y2="3.0" stroke="currentColor" strokeWidth="2" />
              <line x1="12" y1="21.0" x2="12" y2="22.8" stroke="currentColor" strokeWidth="2" />
              <line x1="4.21" y1="4.21" x2="5.64" y2="5.64" stroke="currentColor" strokeWidth="2" />
              <line x1="18.36" y1="18.36" x2="19.79" y2="19.79" stroke="currentColor" strokeWidth="2" />
              <line x1="1.2" y1="12" x2="3.0" y2="12" stroke="currentColor" strokeWidth="2" />
              <line x1="21.0" y1="12" x2="22.8" y2="12" stroke="currentColor" strokeWidth="2" />
              <line x1="4.21" y1="19.79" x2="5.64" y2="18.36" stroke="currentColor" strokeWidth="2" />
              <line x1="18.36" y1="5.64" x2="19.79" y2="4.21" stroke="currentColor" strokeWidth="2" />
            </g>
          </svg>
        </span>
      )}
      <span className="theme-toggle-label">{isDark ? "Dark" : "Light"} mode</span>
    </button>
  );
}

export default Navbar;
