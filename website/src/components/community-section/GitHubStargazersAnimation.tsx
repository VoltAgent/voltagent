import { useGitHubStars } from "@site/src/contexts/GitHubStarsContext";
import { useMediaQuery } from "@site/src/hooks/use-media-query";
import React from "react";

// Mobile version that animates automatically without hover
const MobileGitHubStargazersAnimation = () => {
  const { recent_stargazers, loading, error } = useGitHubStars();

  // Don't render anything if loading, error, or no stargazers
  if (loading || error || !recent_stargazers || recent_stargazers.length === 0) {
    return null;
  }

  // Limit the number of avatars to display for visual clarity
  const maxAvatarsToShow = 8;
  const stargazersToShow = recent_stargazers.slice(0, maxAvatarsToShow);
  const numStargazers = stargazersToShow.length;

  return (
    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
      {stargazersToShow.map((stargazer, i) => {
        // Calculate position for circular arrangement
        const angle = (2 * Math.PI * i) / numStargazers; // Distribute evenly
        const distance = 60; // Distance from the center
        const x = distance * Math.cos(angle);
        const y = distance * Math.sin(angle);

        return (
          <a
            key={stargazer.login}
            href="https://github.com/voltagent/voltagent/stargazers"
            target="_blank"
            rel="noopener noreferrer"
            title={stargazer.login} // Tooltip with username
            className="absolute w-6 h-6 rounded-full overflow-hidden opacity-0 
                       border-2 border-transparent border-main-emerald/50 
                       animate-[starPulse_10s_ease-in-out_infinite] opacity-0
                       transition-all duration-2000 pointer-events-auto" // Enable pointer events for links
            style={{
              left: `calc(50% + ${x}px)`,
              top: `calc(50% + ${y}px)`,
              animationDelay: `${i * 2.5}s`,
              transform: "translate(-50%, -50%)", // Center the avatar
            }}
          >
            <img
              src={stargazer.avatar_url}
              alt={`${stargazer.login}'s avatar`}
              className="w-full h-full object-cover"
              loading="lazy" // Lazy load images
            />
          </a>
        );
      })}
    </div>
  );
};

// Desktop version that animates on hover
const DesktopGitHubStargazersAnimation = () => {
  const { recent_stargazers, loading, error } = useGitHubStars();

  // Don't render anything if loading, error, or no stargazers
  if (loading || error || !recent_stargazers || recent_stargazers.length === 0) {
    return null;
  }

  // Limit the number of avatars to display for visual clarity
  const maxAvatarsToShow = 8;
  const stargazersToShow = recent_stargazers.slice(0, maxAvatarsToShow);
  const numStargazers = stargazersToShow.length;

  return (
    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
      {stargazersToShow.map((stargazer, i) => {
        // Calculate position for circular arrangement
        const angle = (2 * Math.PI * i) / numStargazers; // Distribute evenly
        const distance = 60; // Distance from the center
        const x = distance * Math.cos(angle);
        const y = distance * Math.sin(angle);

        // Calculate animation delay for staggered effect
        const animationDelay = `${i * (4 / numStargazers)}s`; // Stagger over 4 seconds

        return (
          <a
            key={stargazer.login}
            href="https://github.com/voltagent/voltagent/stargazers"
            target="_blank"
            rel="noopener noreferrer"
            title={stargazer.login} // Tooltip with username
            className="absolute w-6 h-6 rounded-full overflow-hidden opacity-0 
                       border-2 border-transparent group-hover:border-main-emerald/50 
                       group-hover:animate-[fadeInOut_4s_ease-in-out_infinite] group-hover:opacity-0
                       transition-all duration-300 pointer-events-auto" // Enable pointer events for links
            style={{
              left: `calc(50% + ${x}px)`,
              top: `calc(50% + ${y}px)`,
              animationDelay: animationDelay,
              transform: "translate(-50%, -50%)", // Center the avatar
            }}
          >
            <img
              src={stargazer.avatar_url}
              alt={`${stargazer.login}'s avatar`}
              className="w-full h-full object-cover"
              loading="lazy" // Lazy load images
            />
          </a>
        );
      })}
    </div>
  );
};

// Component to display orbiting stargazer avatars
export const GitHubStargazersAnimation = () => {
  const isMobile = useMediaQuery("(max-width: 768px)");

  return isMobile ? <MobileGitHubStargazersAnimation /> : <DesktopGitHubStargazersAnimation />;
};
