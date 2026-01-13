import { useLocation } from "@docusaurus/router";
import useIsBrowser from "@docusaurus/useIsBrowser";
import React, { useEffect } from "react";
import { GitHubStarsProvider } from "../contexts/GitHubStarsContext";

// Default implementation, that you can customize
export default function Root({ children }) {
  const location = useLocation();
  const isBrowser = useIsBrowser();

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

  return <GitHubStarsProvider>{children}</GitHubStarsProvider>;
}
