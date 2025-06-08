import { useMediaQuery } from "@site/src/hooks/use-media-query";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AhrefLogo,
  AirtableLogo,
  AnthropicLogo,
  AsanaLogo,
  DropboxLogo,
  FigmaLogo,
  GitHubLogo,
  GmailLogo,
  GoogleCalendarLogo,
  GoogleDriveLogo,
  GoogleSheetsLogo,
  HubspotLogo,
  IntercomLogo,
  JiraLogo,
  MailchimpLogo,
  MicrosoftTeamsLogo,
  MixpanelLogo,
  NotionLogo,
  OneDriveLogo,
  SalesforceLogo,
  SendgridLogo,
  SentryLogo,
  SlackLogo,
  SnowflakeLogo,
  StripeLogo,
  SupabaseLogo,
  TrelloLogo,
  YouTubeLogo,
  ZendeskLogo,
} from "../../../static/img/logos";
import { OpenAILogo } from "../../../static/img/logos/openai";

// Add keyframes for the filling animation
const fillAnimation = `
  @keyframes fillBolt {
    0% {
      clip-path: polygon(0 100%, 100% 100%, 100% 100%, 0 100%);
    }
    45% {
      clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%);
    }
    50% {
      clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%);
    }
    100% {
      clip-path: polygon(0 100%, 100% 100%, 100% 100%, 0 100%);
    }
  }

  @keyframes glowEffect {
    0% {
      filter: drop-shadow(0 0 2px #22c55e);
    }
    50% {
      filter: drop-shadow(0 0 8px #22c55e);
    }
    100% {
      filter: drop-shadow(0 0 2px #22c55e);
    }
  }

  @keyframes particleRotate1 {
    0%, 45% {
      transform: rotate(0deg) translate(0, 0) scale(0);
      opacity: 0;
    }
    50% {
      transform: rotate(0deg) translate(30px, 0) scale(1);
      opacity: 1;
    }
    100% {
      transform: rotate(360deg) translate(30px, 0) scale(0);
      opacity: 0;
    }
  }

  @keyframes particleRotate2 {
    0%, 45% {
      transform: rotate(120deg) translate(0, 0) scale(0);
      opacity: 0;
    }
    50% {
      transform: rotate(120deg) translate(30px, 0) scale(1);
      opacity: 1;
    }
    100% {
      transform: rotate(480deg) translate(30px, 0) scale(0);
      opacity: 0;
    }
  }

  @keyframes particleRotate3 {
    0%, 45% {
      transform: rotate(240deg) translate(0, 0) scale(0);
      opacity: 0;
    }
    50% {
      transform: rotate(240deg) translate(30px, 0) scale(1);
      opacity: 1;
    }
    100% {
      transform: rotate(600deg) translate(30px, 0) scale(0);
      opacity: 0;
    }
  }

  @keyframes scrollLeft {
    0% {
      transform: translateX(0);
    }
    100% {
      transform: translateX(-33.33%);
    }
  }

  @keyframes scrollRight {
    0% {
      transform: translateX(-33.33%);
    }
    100% {
      transform: translateX(0);
    }
  }

  .scroll-left-animation {
    animation: scrollLeft 25s linear infinite;
  }

  .scroll-right-animation {
    animation: scrollRight 25s linear infinite;
  }

  .animation-paused {
    animation-play-state: paused;
  }

  @media (pointer: coarse) {
    .touch-device-scroll-left {
      animation: scrollLeft 25s linear infinite;
    }
    
    .touch-device-scroll-right {
      animation: scrollRight 25s linear infinite;
    }
  }
`;

const CustomBolt = ({ width = 150, height = 150 }) => {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{
        animation: "glowEffect 1s ease-in-out infinite",
      }}
      aria-labelledby="boltLogoTitle"
    >
      <title id="boltLogoTitle">Lightning Bolt</title>
      {/* Background bolt path */}
      <path
        d="M45 15L20 40H35L30 65L55 40H40L45 15Z"
        fill="rgba(255,255,255,0.1)"
      />
      {/* Animated filling bolt path */}
      <path
        d="M45 15L20 40H35L30 65L55 40H40L45 15Z"
        fill="#00d992"
        style={{
          animation: "fillBolt 3s ease-in-out infinite",
        }}
      />
      {/* Rotating particles */}
      <g
        style={{
          transformOrigin: "center",
          animation: "particleRotate1 3s ease-out infinite",
        }}
      >
        <circle cx="40" cy="40" r="2" fill="#4ade80" />
        <circle cx="40" cy="40" r="1" fill="#fff" />
      </g>
      <g
        style={{
          transformOrigin: "center",
          animation: "particleRotate2 3s ease-out infinite",
        }}
      >
        <circle cx="40" cy="40" r="2" fill="#4ade80" />
        <circle cx="40" cy="40" r="1" fill="#fff" />
      </g>
      <g
        style={{
          transformOrigin: "center",
          animation: "particleRotate3 3s ease-out infinite",
        }}
      >
        <circle cx="40" cy="40" r="2" fill="#4ade80" />
        <circle cx="40" cy="40" r="1" fill="#fff" />
      </g>
    </svg>
  );
};

export function Integrations() {
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const topRowRef = useRef<HTMLDivElement>(null);
  const bottomRowRef = useRef<HTMLDivElement>(null);
  const [isTopRowPaused, setIsTopRowPaused] = useState(false);
  const [isBottomRowPaused, setIsBottomRowPaused] = useState(false);
  const [, setIsTouchDevice] = useState(false);

  // Create arrays of logos with their tooltips
  const topRowLogos = [
    {
      logo: <OpenAILogo key="openai-1" className="w-6 h-6 sm:w-8 sm:h-8" />,
      tooltip: "OpenAI",
    },
    {
      logo: (
        <AnthropicLogo key="anthropic-1" className="w-6 h-6 sm:w-8 sm:h-8" />
      ),
      tooltip: "Anthropic",
    },
    {
      logo: <NotionLogo key="notion-1" className="w-6 h-6 sm:w-8 sm:h-8" />,
      tooltip: "Notion",
    },
    {
      logo: <SupabaseLogo key="supabase-1" className="w-6 h-6 sm:w-8 sm:h-8" />,
      tooltip: "Supabase",
    },
    {
      logo: <StripeLogo key="stripe-1" className="w-6 h-6 sm:w-8 sm:h-8" />,
      tooltip: "Stripe",
    },
    {
      logo: <SlackLogo key="slack-1" className="w-6 h-6 sm:w-8 sm:h-8" />,
      tooltip: "Slack",
    },
    {
      logo: <DropboxLogo key="dropbox-1" className="w-6 h-6 sm:w-8 sm:h-8" />,
      tooltip: "Dropbox",
    },
    {
      logo: <GmailLogo key="gmail-1" className="w-6 h-6 sm:w-8 sm:h-8" />,
      tooltip: "Gmail",
    },
    {
      logo: (
        <OneDriveLogo key="onedrive-1" className="w-6 h-6 sm:w-10 sm:h-10" />
      ),
      tooltip: "OneDrive",
    },
    {
      logo: (
        <GoogleSheetsLogo
          key="google-sheets-1"
          className="w-6 h-6 sm:w-8 sm:h-8"
        />
      ),
      tooltip: "Google Sheets",
    },
    {
      logo: (
        <GoogleDriveLogo
          key="google-drive-1"
          className="w-6 h-6 sm:w-10 sm:h-10"
        />
      ),
      tooltip: "Google Drive",
    },
    {
      logo: (
        <GoogleCalendarLogo
          key="google-calendar-1"
          className="w-6 h-6 sm:w-10 sm:h-10"
        />
      ),
      tooltip: "Google Calendar",
    },
    {
      logo: (
        <MicrosoftTeamsLogo
          key="microsoft-teams-1"
          className="w-6 h-6 sm:w-8 sm:h-8"
        />
      ),
      tooltip: "Microsoft Teams",
    },
    {
      logo: (
        <MailchimpLogo key="mailchimp-1" className="w-6 h-6 sm:w-8 sm:h-8" />
      ),
      tooltip: "Mailchimp",
    },
    {
      logo: (
        <SalesforceLogo
          key="salesforce-1"
          className="w-6 h-6 sm:w-12 sm:h-12"
        />
      ),
      tooltip: "Salesforce",
    },
    {
      logo: <SendgridLogo key="sendgrid-1" className="w-6 h-6 sm:w-8 sm:h-8" />,
      tooltip: "SendGrid",
    },
  ];

  const bottomRowLogos = [
    {
      logo: (
        <GitHubLogo
          key="github-1"
          className="w-6  h-6 text-white sm:w-8 sm:h-8"
        />
      ),
      tooltip: "GitHub",
    },

    {
      logo: <YouTubeLogo key="youtube-1" className="w-6 h-6 sm:w-8 sm:h-8" />,
      tooltip: "YouTube",
    },
    {
      logo: <ZendeskLogo key="zendesk-1" className="w-6 h-6 sm:w-10 sm:h-10" />,
      tooltip: "Zendesk",
    },
    {
      logo: <TrelloLogo key="trello-1" className="w-6 h-6 sm:w-8 sm:h-8" />,
      tooltip: "Trello",
    },
    {
      logo: <JiraLogo key="jira-1" className="w-6 h-6 sm:w-8 sm:h-8" />,
      tooltip: "Jira",
    },
    {
      logo: <IntercomLogo key="intercom-1" className="w-6 h-6 sm:w-8 sm:h-8" />,
      tooltip: "Intercom",
    },
    {
      logo: <HubspotLogo key="hubspot-1" className="w-6 h-6 sm:w-8 sm:h-8" />,
      tooltip: "Hubspot",
    },
    {
      logo: <AirtableLogo key="airtable-1" className="w-6 h-6 sm:w-8 sm:h-8" />,
      tooltip: "Airtable",
    },
    {
      logo: <FigmaLogo key="figma-1" className="w-6 h-6 sm:w-8 sm:h-8" />,
      tooltip: "Figma",
    },
    {
      logo: <AsanaLogo key="asana-1" className="w-6 h-6 sm:w-8 sm:h-8" />,
      tooltip: "Asana",
    },
    {
      logo: <AhrefLogo key="ahref-1" className="w-6 h-6 sm:w-6 sm:h-6" />,
      tooltip: "Ahref",
    },
    {
      logo: <MixpanelLogo key="mixpanel-1" className="w-6 h-6 sm:w-6 sm:h-6" />,
      tooltip: "Mixpanel",
    },
    {
      logo: <SentryLogo key="sentry-1" className="w-6 h-6 sm:w-10 sm:h-10" />,
      tooltip: "Sentry",
    },
    {
      logo: (
        <SnowflakeLogo key="snowflake-1" className="w-6 h-6 sm:w-8 sm:h-8" />
      ),
      tooltip: "Snowflake",
    },
  ];

  // Duplicate logos for continuous scrolling effect
  const duplicatedTopLogos = [...topRowLogos, ...topRowLogos, ...topRowLogos];
  const duplicatedBottomLogos = [
    ...bottomRowLogos,
    ...bottomRowLogos,
    ...bottomRowLogos,
  ];

  // Detect touch device on mount
  useEffect(() => {
    const isTouchCapable =
      "ontouchstart" in window ||
      navigator.maxTouchPoints > 0 ||
      (navigator as any).msMaxTouchPoints > 0;

    setIsTouchDevice(isTouchCapable);
  }, []);

  // Handle pause/resume for hover and touch for each row independently
  const handleTopRowTouchStart = useCallback(() => setIsTopRowPaused(true), []);
  const handleTopRowTouchEnd = useCallback(() => setIsTopRowPaused(false), []);
  const handleTopRowMouseEnter = useCallback(() => setIsTopRowPaused(true), []);
  const handleTopRowMouseLeave = useCallback(
    () => setIsTopRowPaused(false),
    [],
  );

  const handleBottomRowTouchStart = useCallback(
    () => setIsBottomRowPaused(true),
    [],
  );
  const handleBottomRowTouchEnd = useCallback(
    () => setIsBottomRowPaused(false),
    [],
  );
  const handleBottomRowMouseEnter = useCallback(
    () => setIsBottomRowPaused(true),
    [],
  );
  const handleBottomRowMouseLeave = useCallback(
    () => setIsBottomRowPaused(false),
    [],
  );

  useEffect(() => {
    // Add touch event listeners for mobile - top row
    const topElement = topRowRef.current;
    if (topElement) {
      topElement.addEventListener("touchstart", handleTopRowTouchStart, {
        passive: true,
      });
      topElement.addEventListener("touchend", handleTopRowTouchEnd, {
        passive: true,
      });
    }

    // Add touch event listeners for mobile - bottom row
    const bottomElement = bottomRowRef.current;
    if (bottomElement) {
      bottomElement.addEventListener("touchstart", handleBottomRowTouchStart, {
        passive: true,
      });
      bottomElement.addEventListener("touchend", handleBottomRowTouchEnd, {
        passive: true,
      });
    }

    return () => {
      // Clean up top row listeners
      if (topElement) {
        topElement.removeEventListener("touchstart", handleTopRowTouchStart);
        topElement.removeEventListener("touchend", handleTopRowTouchEnd);
      }

      // Clean up bottom row listeners
      if (bottomElement) {
        bottomElement.removeEventListener(
          "touchstart",
          handleBottomRowTouchStart,
        );
        bottomElement.removeEventListener("touchend", handleBottomRowTouchEnd);
      }
    };
  }, [
    handleTopRowTouchStart,
    handleTopRowTouchEnd,
    handleBottomRowTouchStart,
    handleBottomRowTouchEnd,
  ]);

  return (
    <section className="relative w-full overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 landing-xs:mb-16 landing-md:mb-36">
        <div className="flex flex-col">
          <div className="flex flex-col mb-8 sm:mb-12">
            <div className="w-full max-w-5xl">
              <div className="mb-4">
                <h2 className="landing-xs:text-sm landing-md:text-lg landing-xs:mb-2 landing-md:mb-4 font-semibold  text-purple-500 tracking-wide uppercase">
                  INTEGRATIONS
                </h2>
                <h2 className="mt-1 landing-xs:text-2xl landing-md:text-4xl landing-xs:mb-2 landing-md:mb-4 landing-xs:font-bold landing-md:font-extrabold text-white sm:tracking-tight">
                  Easily connect with 40+ apps in no time
                </h2>
                <p className="max-w-3xl  landing-md:text-xl  landing-xs:text-md text-gray-400">
                  Integrate your AI agents with your preferred tools and
                  services effortlessly.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col md:flex-row justify-between items-center gap-8 md:gap-0">
            <div className="w-full flex md:w-[40%] justify-center items-center landing-xs:hidden landing-sm:flex">
              <style>{fillAnimation}</style>
              <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-lg flex items-center justify-center">
                <CustomBolt
                  width={isDesktop ? 200 : 150}
                  height={isDesktop ? 200 : 150}
                />
              </div>
            </div>

            {/* Right side with sliding logos */}
            <div className="w-full md:w-[60%]">
              {/* Top row - scrolling left */}
              <div className="relative mb-4 sm:mb-6">
                <div
                  ref={topRowRef}
                  className="flex overflow-hidden"
                  style={{
                    maxWidth: "100%",
                    scrollbarWidth: "none",
                    msOverflowStyle: "none",
                    WebkitOverflowScrolling: "touch",
                    WebkitMaskImage:
                      "linear-gradient(90deg, transparent 0%, black 5%, black 95%, transparent 100%)",
                    maskImage:
                      "linear-gradient(90deg, transparent 0%, black 5%, black 95%, transparent 100%)",
                  }}
                >
                  <div
                    className={`flex space-x-4 sm:space-x-6 py-2 scroll-left-animation ${
                      isTopRowPaused ? "animation-paused" : ""
                    }`}
                  >
                    {duplicatedTopLogos.map((item, index) => (
                      <div
                        key={`top-logo-${item.tooltip}-${index}`}
                        className="group relative flex-shrink-0 bg-gray-900/50 w-12 h-12 sm:w-16 sm:h-16 flex items-center justify-center rounded-lg cursor-pointer border-solid border-gray-800/40 hover:border-main-emerald transition-all duration-200"
                        onMouseEnter={handleTopRowMouseEnter}
                        onMouseLeave={handleTopRowMouseLeave}
                        onTouchStart={handleTopRowTouchStart}
                        onTouchEnd={handleTopRowTouchEnd}
                      >
                        {item.logo}
                        <div className="absolute opacity-0 group-hover:opacity-100 transition-opacity duration-200 top-0 transform bg-gray-800 text-main-emerald text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2 rounded-md whitespace-nowrap z-20 shadow-lg">
                          {item.tooltip}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Bottom row - scrolling right */}
              <div className="relative">
                <div
                  ref={bottomRowRef}
                  className="flex overflow-hidden"
                  style={{
                    maxWidth: "100%",
                    scrollbarWidth: "none",
                    msOverflowStyle: "none",
                    WebkitOverflowScrolling: "touch",
                    WebkitMaskImage:
                      "linear-gradient(90deg, transparent 0%, black 5%, black 95%, transparent 100%)",
                    maskImage:
                      "linear-gradient(90deg, transparent 0%, black 5%, black 95%, transparent 100%)",
                  }}
                >
                  <div
                    className={`flex space-x-4 sm:space-x-6 py-2 scroll-right-animation ${
                      isBottomRowPaused ? "animation-paused" : ""
                    }`}
                  >
                    {duplicatedBottomLogos.map((item, index) => (
                      <div
                        key={`bottom-logo-${item.tooltip}-${index}`}
                        className="group relative flex-shrink-0 bg-gray-900/50 w-12 h-12 sm:w-16 sm:h-16 flex items-center justify-center rounded-lg cursor-pointer border-solid border-gray-800/40 hover:border-main-emerald transition-all duration-200"
                        onMouseEnter={handleBottomRowMouseEnter}
                        onMouseLeave={handleBottomRowMouseLeave}
                        onTouchStart={handleBottomRowTouchStart}
                        onTouchEnd={handleBottomRowTouchEnd}
                      >
                        {item.logo}
                        <div className="absolute opacity-0 group-hover:opacity-100 transition-opacity duration-200 top-0 transform bg-gray-800 text-main-emerald text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2 rounded-md whitespace-nowrap z-20 shadow-lg">
                          {item.tooltip}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
