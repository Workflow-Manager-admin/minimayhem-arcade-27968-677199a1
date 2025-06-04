import React, { useState } from "react";
import "./ContactPage.css";
import { useNavigate } from "react-router-dom";

/**
 * PUBLIC_INTERFACE
 * ContactPage: Arcade-style contact form (name, email, message), direct links, success confirmation, and light/dark mode.
 */
function ContactPage() {
  const [values, setValues] = useState({
    name: "",
    email: "",
    message: "",
  });
  const [touched, setTouched] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [formAnim, setFormAnim] = useState(false);

  const navigate = useNavigate();

  // Validation logic
  const getError = (field) => {
    const val = values[field].trim();
    if (field === "email") {
      if (!val) return "Required";
      // Basic email regexp
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val))
        return "Email address is not valid";
    } else if (field === "name") {
      if (!val) return "Required";
    } else if (field === "message") {
      if (!val) return "Required";
      if (val.length < 5) return "Provide a longer message";
    }
    return null;
  };
  const emailError = touched.email && getError("email");
  const nameError = touched.name && getError("name");
  const msgError = touched.message && getError("message");
  const isFormValid =
    !getError("email") && !getError("name") && !getError("message");

  // Handlers
  function handleChange(e) {
    const { name, value } = e.target;
    setValues((v) => ({ ...v, [name]: value }));
  }
  function handleBlur(e) {
    setTouched((t) => ({ ...t, [e.target.name]: true }));
  }
  function handleSubmit(e) {
    e.preventDefault();
    setTouched({ name: true, email: true, message: true });
    if (isFormValid) {
      setFormAnim(true);
      setTimeout(() => {
        setSubmitted(true);
      }, 750); // match with animation
      // In real app, would send data here (e.g. API/email)
    }
  }

  // Reset for a new message (not shown to user but ready)
  function handleReset() {
    setValues({ name: "", email: "", message: "" });
    setTouched({});
    setSubmitted(false);
    setFormAnim(false);
  }

  // Arcade accent for links/icons
  const SUPPORT_EMAIL = "support@minimayhem.games";
  const SOCIALS = [
    {
      label: "Twitter",
      url: "https://twitter.com/minimayhemarcade",
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
          <g fill="currentColor">
            <path d="M24 4.56c-.883.392-1.832.658-2.828.775a4.93 4.93 0 0 0 2.165-2.724c-.95.565-2.005.977-3.127 1.201A4.916 4.916 0 0 0 16.616 3c-2.73 0-4.942 2.207-4.942 4.927 0 .387.046.762.127 1.123C7.728 8.885 4.1 7.107 1.671 4.149a4.823 4.823 0 0 0-.667 2.478c0 1.71.872 3.216 2.2 4.099-.807-.025-1.566-.247-2.228-.617v.065c0 2.393 1.704 4.39 3.957 4.843a4.902 4.902 0 0 1-2.218.084c.623 1.944 2.432 3.362 4.58 3.404A9.868 9.868 0 0 1 0 21.543a13.945 13.945 0 0 0 7.548 2.209c9.054 0 14.009-7.496 14.009-13.986 0-.21-.005-.423-.015-.634A9.89 9.89 0 0 0 24 4.59z" />
          </g>
        </svg>
      ),
    },
    // Add discord or extra if desired
    {
      label: "GitHub",
      url: "https://github.com/minimayhemarcade",
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
          <g fill="currentColor">
            <path d="M12 .3a12 12 0 0 0-3.79 23.39c.6.11.82-.26.82-.58v-2.11c-3.34.73-4.04-1.64-4.04-1.64-.54-1.37-1.33-1.73-1.33-1.73-1.09-.74.08-.73.08-.73 1.2.09 1.84 1.22 1.84 1.22 1.07 1.83 2.8 1.3 3.49.99.11-.77.42-1.3.76-1.6-2.67-.3-5.47-1.34-5.47-5.96 0-1.32.47-2.39 1.24-3.23-.12-.3-.54-1.53.12-3.19 0 0 1.01-.32 3.3 1.23a11.38 11.38 0 0 1 6 0c2.29-1.55 3.3-1.23 3.3-1.23.66 1.66.24 2.89.12 3.19.77.84 1.24 1.91 1.24 3.23 0 4.63-2.8 5.66-5.48 5.96.43.37.81 1.1.81 2.22v3.29c0 .32.22.69.82.58A12 12 0 0 0 12 .3" />
          </g>
        </svg>
      ),
    },
  ];

  // Focus effect: move confirmation up & fade form down
  return (
    <div className="contact-root">
      <div className="contact-bg-blur1"></div>
      <div className="contact-bg-blur2"></div>
      <main className="contact-main-card">
        <header className="contact-header-row">
          <h1 className="contact-arcade-title">
            <span role="img" aria-label="Contact">📨</span>
            <span className="arcade-gradient">Contact Us</span>
            <span className="contact-sparkle" aria-hidden="true">✨</span>
          </h1>
          <div className="contact-subtitle">
            Questions, bug reports, or just want to say hi? Reach out below!
          </div>
        </header>
        {!submitted ? (
          <form
            className={`contact-form${formAnim ? " flyout" : ""}`}
            onSubmit={handleSubmit}
            noValidate
            spellCheck="false"
            autoComplete="off"
            aria-label="Contact form"
          >
            <div className="contact-form-group">
              <label htmlFor="contact-name">Name</label>
              <input
                id="contact-name"
                name="name"
                type="text"
                autoComplete="name"
                value={values.name}
                onChange={handleChange}
                onBlur={handleBlur}
                aria-required="true"
                className={nameError ? "invalid" : ""}
                maxLength={32}
                tabIndex={0}
                placeholder="Your name"
              />
              {nameError && <div className="contact-error">{nameError}</div>}
            </div>
            <div className="contact-form-group">
              <label htmlFor="contact-email">Email</label>
              <input
                id="contact-email"
                name="email"
                type="email"
                autoComplete="email"
                value={values.email}
                onChange={handleChange}
                onBlur={handleBlur}
                aria-required="true"
                className={emailError ? "invalid" : ""}
                maxLength={48}
                tabIndex={0}
                placeholder="your@email.com"
              />
              {emailError && <div className="contact-error">{emailError}</div>}
            </div>
            <div className="contact-form-group">
              <label htmlFor="contact-message">Message</label>
              <textarea
                id="contact-message"
                name="message"
                rows={4}
                autoComplete="off"
                value={values.message}
                onChange={handleChange}
                onBlur={handleBlur}
                aria-required="true"
                className={msgError ? "invalid" : ""}
                maxLength={600}
                tabIndex={0}
                placeholder="What's on your mind?"
              />
              {msgError && <div className="contact-error">{msgError}</div>}
            </div>
            <button
              className="contact-submit-btn arcade-btn"
              type="submit"
              disabled={!isFormValid}
              tabIndex={0}
              aria-disabled={!isFormValid}
            >
              <span>Send Message</span>
            </button>
          </form>
        ) : (
          <div className="contact-confirmation-show">
            <div className="contact-confirmation-anim">
              <span className="cc-emoji">🎉</span>
              <div className="cc-title arcade-gradient">Message Sent!</div>
              <div className="cc-body">
                Thanks for reaching out—our tiny arcade team will get back to you soon!
              </div>
              <button
                className="cc-return-btn arcade-btn"
                onClick={() => navigate("/games")}
              >
                Return to Game Hub
              </button>
            </div>
          </div>
        )}
        <section className="contact-direct-row">
          <div className="contact-direct-title">Direct Contact:</div>
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="contact-link"
            tabIndex={0}
          >
            <span role="img" aria-label="email" className="direct-icon">✉️</span>
            <span className="direct-label">{SUPPORT_EMAIL}</span>
          </a>
          <span className="contact-socials">
            {SOCIALS.map((s, i) => (
              <a
                key={s.label}
                href={s.url}
                className="contact-link social-link"
                target="_blank"
                rel="noopener noreferrer"
                tabIndex={0}
                aria-label={s.label}
              >
                <span className="direct-icon">{s.icon}</span>
                <span className="direct-label">{s.label}</span>
              </a>
            ))}
          </span>
        </section>
        <div className="contact-footer-note">
          <span role="img" aria-label="spark">🕹️</span> Built with love by MiniMayhem Arcade team.
        </div>
      </main>
    </div>
  );
}

export default ContactPage;
