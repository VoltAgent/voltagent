import { DocumentTextIcon } from "@heroicons/react/24/solid";
import { GitHubStarsProvider } from "@site/src/contexts/GitHubStarsContext";
import { useMediaQuery } from "@site/src/hooks/use-media-query";
import React from "react";
import { DiscordLogo } from "../../../static/img/logos/discord";
import { GitHubLogo } from "../../../static/img/logos/github";
import { GitHubStargazersAnimation } from "./GitHubStargazersAnimation";

interface CommunityLink {
  id: string;
  title: string;
  icon: React.ReactNode;
  url: string;
  tooltip: string;
  showLabel?: boolean;
}

const MobileDiscordAnimation = () => {
  const actionLabels = [
    "Ask for help",
    "Share ideas",
    "Learn together",
    "Find teammates",
    "Get feedback",
    "Join events",
    "Solve problems",
    "Build together",
  ];

  return (
    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
      {actionLabels.map((label, i) => {
        const angle = (2 * Math.PI * i) / actionLabels.length;
        const distance = 60;
        return (
          <div
            key={label}
            className="absolute px-2 py-1 text-xs font-medium bg-[#5865F2]/10 text-main-emerald rounded
              animate-[twinkle_10s_ease-in-out_infinite] opacity-0
              transition-all duration-2000 whitespace-nowrap"
            style={{
              left: `calc(50% + ${distance * Math.cos(angle)}px)`,
              top: `calc(50% + ${distance * Math.sin(angle)}px)`,
              animationDelay: `${i * 2.5}s`,
              transform: "translate(-50%, -50%)",
            }}
          >
            {label}
          </div>
        );
      })}
    </div>
  );
};

const DiscordAnimation = () => {
  const actionLabels = [
    "Ask for help",
    "Share ideas",
    "Learn together",
    "Find teammates",
    "Get feedback",
    "Join events",
    "Solve problems",
    "Build together",
  ];

  return (
    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
      {actionLabels.map((label, i) => {
        const angle = (2 * Math.PI * i) / actionLabels.length;
        const distance = 60;
        return (
          <div
            key={label}
            className="absolute px-2 py-1 text-xs font-medium bg-[#5865F2]/10 text-main-emerald rounded opacity-0 
              group-hover:animate-[fadeInOut_4s_ease-in-out_infinite] group-hover:opacity-0
              transition-all duration-300 whitespace-nowrap"
            style={{
              left: `calc(50% + ${distance * Math.cos(angle)}px)`,
              top: `calc(50% + ${distance * Math.sin(angle)}px)`,
              animationDelay: `${i * 0.5}s`,
              transform: "translate(-50%, -50%)",
            }}
          >
            {label}
          </div>
        );
      })}
    </div>
  );
};
const DiscordIcon = () => {
  const isMobile = useMediaQuery("(max-width: 768px)");

  return (
    <div className="relative">
      <DiscordLogo
        className="md:w-20 md:h-20 w-12 h-12 text-[#5865F2] md:group-hover:text-main-emerald md:transition-colors md:duration-300
        animate-[colorPulse_6s_ease-in-out_infinite] md:animate-none"
      />
      {isMobile ? <MobileDiscordAnimation /> : <DiscordAnimation />}
    </div>
  );
};

const COMMUNITY_LINKS: CommunityLink[] = [
  {
    id: "discord",
    title: "Discord",
    icon: <DiscordIcon />,
    url: "https://s.voltagent.dev/discord",
    tooltip: "Join the Server",
  },
  {
    id: "github",
    title: "GitHub",
    icon: (
      <>
        <GitHubLogo
          className="md:w-20
           md:h-20
           w-12 h-12 text-white md:group-hover:text-main-emerald md:transition-colors md:duration-300
          animate-[colorPulseGithub_6s_ease-in-out_infinite] md:animate-none"
        />
        <GitHubStargazersAnimation />
      </>
    ),
    url: "https://github.com/voltagent/voltagent",
    tooltip: "See the Repo",
  },
  {
    id: "docs",
    title: "Docs",
    icon: (
      <DocumentTextIcon
        className="md:w-20 md:h-20 w-12 h-12 text-main-emerald 
      animate-[colorPulseEmerald_6s_ease-in-out_infinite] md:animate-none"
      />
    ),
    url: "/docs",
    tooltip: "See Docs",
    showLabel: true,
  },
];

export function CommunitySection() {
  React.useEffect(() => {
    const style = document.createElement("style");
    style.innerHTML = `
      @keyframes twinkle {
        0%, 100% { opacity: 0; }
        10% { opacity: 0.1; }
        30% { opacity: 0.3; }
        50% { opacity: 1; }
        70% { opacity: 0.3; }
        90% { opacity: 0.1; }
      }

      @keyframes colorPulse {
        0%, 100% { color: #5865F2; }
        50% { color: #10B981; }
      }

      @keyframes colorPulseGithub {
        0%, 100% { color: #FFFFFF; }
        50% { color: #10B981; }
      }

      @keyframes colorPulseEmerald {
        0%, 100% { color: #10B981; }
        50% { color: #047857; }
      }

      @keyframes starPulse {
        0%, 100% { opacity: 0; }
        10% { opacity: 0.1; }
        30% { opacity: 0.5; }
        50% { opacity: 1; }
        70% { opacity: 0.5; }
        90% { opacity: 0.1; }
      }

      @keyframes fadeInOut {
        0%, 100% { opacity: 0; }
        25%, 75% { opacity: 1; }
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return (
    <section className="relative w-full overflow-hidden">
      <GitHubStarsProvider>
        {/* Header with full-width background */}
        <div className="w-full bg-[#101010] landing-xs:py-10 landing-md:py-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="landing-xs:text-sm landing-md:text-lg landing-xs:mb-2 landing-md:mb-4 font-semibold  text-[#b8b3b0] tracking-wide uppercase flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-main-emerald inline-block" />
              Community
            </h2>
            <p className="mt-1 landing-xs:text-2xl landing-md:text-4xl landing-xs:mb-2 landing-md:mb-4 landing-xs:font-normal landing-md:font-normal text-white sm:text-5xl sm:tracking-tight">
              Join the movement
            </p>
            <p className="max-w-3xl  landing-md:text-xl  landing-xs:text-md text-[#8a8380] mb-0">
              Our growing <span className="text-main-emerald">open source</span> community building
              the future of AI agents.
            </p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 landing-xs:mb-16 landing-md:mb-36 mt-12">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-12 landing-xs:mt-12 landing-md:mt-0">
            {COMMUNITY_LINKS.map((link, index) => (
              <a
                key={link.id}
                href={link.url}
                target="_blank"
                rel="noreferrer"
                className={`group relative landing-xs:p-6 landing-md:p-12  landing-md:border-solid border-white/10 no-underline transition-all flex flex-col items-center animate-fade-in landing-xs:unset landing-md:bg-black/20 rounded-lg hover:border-main-emerald hover:bg-black/40
                  ${link.id === "discord" ? "col-span-2 md:col-span-1" : ""}`}
                style={{
                  animationDelay: `${index * 100}ms`,
                  animationFillMode: "both",
                }}
              >
                <div className="flex flex-col justify-center items-center transition-transform duration-300 group-hover:scale-110 relative">
                  {link.icon}
                  {link.showLabel && (
                    <span className="absolute top-0 landing-xs:left-8 landing-md:left-14 text-main-emerald text-xs font-medium translate-x-1/2 translate-y-1/2">
                      docs
                    </span>
                  )}
                </div>
                <div
                  className={`md:absolute md:top-2 md:right-7 text-main-emerald px-3 py-1 rounded md:opacity-0 ${
                    link.id === "discord" || link.id === "github" ? "opacity-0" : "opacity-100"
                  } md:group-hover:opacity-100 transition-opacity duration-300 text-sm font-medium whitespace-nowrap pointer-events-none md:translate-x-1/4 md:-translate-y-1/4 mt-4 md:mt-0`}
                >
                  {link.tooltip}
                </div>
              </a>
            ))}
          </div>
        </div>
      </GitHubStarsProvider>
    </section>
  );
}
