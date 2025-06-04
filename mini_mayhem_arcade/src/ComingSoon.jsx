import React from "react";

/**
 * PUBLIC_INTERFACE
 * ComingSoon: Displays a friendly "Coming Soon" message for game pages not yet implemented.
 * Used as the placeholder for not-yet-available mini-games such as Shadow Runner.
 */
function ComingSoon({ title = "Coming Soon!", description = "This game is on its way. Stay tuned to play Shadow Runner soon!" }) {
  return (
    <div
      style={{
        minHeight: "70vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "column",
        fontFamily: "'Montserrat', 'Inter', sans-serif",
        textAlign: "center",
        background: "linear-gradient(120deg, #a1c4fd 0%, #c2e9fb 100%)",
        color: "#222"
      }}
    >
      <div style={{
          fontSize: "3em",
          fontWeight: 900,
          color: "#4f46e5",
          marginBottom: "0.2em"
      }}>
        🏃‍♂️
      </div>
      <h1 style={{ fontSize: "2.1em", fontWeight: 800, marginBottom: "0.2em" }}>
        {title}
      </h1>
      <p style={{
        maxWidth: "350px",
        fontWeight: 500,
        color: "#444"
      }}>
        {description}
      </p>
    </div>
  );
}

export default ComingSoon;
