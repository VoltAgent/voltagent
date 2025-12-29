import { useLocation } from "@docusaurus/router";
import useIsBrowser from "@docusaurus/useIsBrowser";
import React, { useEffect, useMemo, useState } from "react";
import { GitHubStarsProvider } from "../contexts/GitHubStarsContext";

// Snowfall effect component for holiday season
const Snowfall = () => {
  const snowflakes = useMemo(
    () =>
      Array.from({ length: 50 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        animationDuration: 5 + Math.random() * 10,
        animationDelay: Math.random() * 5,
        size: 2 + Math.random() * 4,
        opacity: 0.4 + Math.random() * 0.6,
      })),
    [],
  );

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 9999,
        overflow: "hidden",
      }}
    >
      <style>{`
        @keyframes snowfall {
          0% {
            transform: translateY(-10px) rotate(0deg);
          }
          100% {
            transform: translateY(100vh) rotate(360deg);
          }
        }
      `}</style>
      {snowflakes.map((flake) => (
        <div
          key={flake.id}
          style={{
            position: "absolute",
            left: `${flake.left}%`,
            top: "-10px",
            width: `${flake.size}px`,
            height: `${flake.size}px`,
            background: "white",
            borderRadius: "50%",
            opacity: flake.opacity,
            animation: `snowfall ${flake.animationDuration}s linear ${flake.animationDelay}s infinite`,
          }}
        />
      ))}
    </div>
  );
};

// Snow toggle button component
const SnowToggle = ({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) => (
  <button
    type="button"
    onClick={onToggle}
    style={{
      position: "fixed",
      bottom: "20px",
      right: "20px",
      width: "40px",
      height: "40px",
      borderRadius: "50%",
      border: "none",
      background: enabled ? "rgba(0, 217, 146, 0.9)" : "rgba(100, 100, 100, 0.7)",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: "20px",
      zIndex: 10000,
      boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
      transition: "all 0.2s ease",
    }}
    title={enabled ? "Disable snow" : "Enable snow"}
  >
    ❄️
  </button>
);

// Default implementation, that you can customize
export default function Root({ children }) {
  const location = useLocation();
  const isBrowser = useIsBrowser();
  const [snowEnabled, setSnowEnabled] = useState(true);

  // Load snow preference from localStorage
  useEffect(() => {
    if (isBrowser) {
      const stored = localStorage.getItem("voltagent-snow-enabled");
      if (stored !== null) {
        setSnowEnabled(stored === "true");
      }
    }
  }, [isBrowser]);

  // Toggle snow and persist to localStorage
  const toggleSnow = () => {
    const newValue = !snowEnabled;
    setSnowEnabled(newValue);
    if (isBrowser) {
      localStorage.setItem("voltagent-snow-enabled", String(newValue));
    }
  };

  useEffect(() => {
    if (isBrowser && !location.hash) {
      // Try multiple scroll methods
      const scrollToTop = () => {
        if (document.scrollingElement) {
          document.scrollingElement.scrollTop = 0;
        }
        if (document.documentElement) {
          document.documentElement.scrollTop = 0;
        }
        if (document.body) {
          document.body.scrollTop = 0;
        }
      };

      // Disable scroll restoration
      if ("scrollRestoration" in window.history) {
        window.history.scrollRestoration = "manual";
      }

      // Execute scroll with a small delay to ensure DOM is ready
      requestAnimationFrame(() => {
        scrollToTop();
      });
    }
  }, [location, isBrowser]);

  return (
    <>
      {snowEnabled && <Snowfall />}
      <SnowToggle enabled={snowEnabled} onToggle={toggleSnow} />
      <GitHubStarsProvider>{children}</GitHubStarsProvider>
    </>
  );
}
