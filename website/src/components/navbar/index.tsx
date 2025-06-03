import React, { useState } from "react";
import styles from "./styles.module.css";
import Link from "@docusaurus/Link";
import { useLocation } from "@docusaurus/router";
import { DiscordLogo } from "../../../static/img/logos/discord";
import { GitHubLogo } from "../../../static/img/logos/github";
import { BoltIcon, StarIcon, ChevronDownIcon } from "@heroicons/react/24/solid";
import {} from "@heroicons/react/24/solid";
import {
  ShoppingBagIcon,
  ServerIcon,
  CommandLineIcon,
  ComputerDesktopIcon,
  ShoppingCartIcon,
} from "@heroicons/react/24/outline";
import { useGitHubStars } from "../../contexts/GitHubStarsContext";
import { useMediaQuery } from "@site/src/hooks/use-media-query";

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const isMobile = useMediaQuery("(max-width: 768px)");

  const location = useLocation();
  const {
    stars,
    recent_stargazers,
    loading: isLoadingStars,
    error: starsError,
  } = useGitHubStars();

  const isActive = (path: string) => {
    const currentPath = location.pathname.endsWith("/")
      ? location.pathname
      : `${location.pathname}/`;
    const checkPath = path.endsWith("/") ? path : `${path}/`;
    return currentPath.startsWith(checkPath);
  };

  // Helper function to format star count
  const formatStarCount = (count: number | null | undefined): string => {
    if (count === null || count === undefined) return "✨";
    try {
      return new Intl.NumberFormat("en-US", {
        notation: "compact",
        maximumFractionDigits: 1,
      }).format(count);
    } catch (error) {
      console.error("Error formatting star count:", error);
      return count.toString();
    }
  };

  return (
    <nav className={styles.navbar}>
      <div className={styles.navbarInner}>
        <div className={styles.navbarLeft}>
          <Link to="/" className={styles.logoLink}>
            <div className="flex items-center border-solid border-1 border-main-emerald rounded-full  p-1">
              <BoltIcon className="w-4 h-4  text-main-emerald" />
            </div>
            <span className={styles.logoText}>voltagent</span>
          </Link>
          <div
            className={`${styles.navLinks} ${
              isMenuOpen ? styles.navLinksOpen : ""
            }`}
          >
            <div className={`${styles.navLink} group relative`}>
              <div className="flex items-center cursor-pointer">
                PRODUCTS
                <ChevronDownIcon className="w-4 h-4 ml-1 text-inherit group-hover:text-emerald-400" />
              </div>
              <div className="absolute left-0 top-full mt-2 bg-[#0E1618] border border-solid border-gray-800 rounded-md shadow-xl  w-[280px] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                <Link to="/ai-agent-monitoring/" className="no-underline">
                  <div className="p-3 hover:bg-gray-800/50 cursor-pointer text-[#DCDCDC] hover:text-emerald-400 flex items-center transition-colors duration-200 rounded-t-md border-solid border-r-0 border-t-0 border-b-0 border-l-2 border-transparent hover:border-emerald-400">
                    <ComputerDesktopIcon className="w-5 h-5 mr-3 text-[#00d992]" />
                    <span className="text-sm">Developer Console</span>
                  </div>
                </Link>
                <div className="cursor-pointer p-3 hover:bg-gray-800/50  text-[#DCDCDC] hover:text-emerald-400 flex items-center justify-between transition-colors border-solid border-r-0 border-t-0 border-b-0 duration-200 border-l-2 border-transparent hover:border-emerald-400">
                  <Link
                    to="/ai-agent-marketplace/"
                    className="flex items-center no-underline text-inherit "
                  >
                    <ShoppingCartIcon className="w-5 h-5 mr-3 text-[#00d992]" />
                    <span className="text-sm">Marketplace</span>
                  </Link>
                </div>
                <div className="p-3 hover:bg-gray-800/50 text-[#DCDCDC] hover:text-emerald-400 flex items-center justify-between transition-colors border-solid border-r-0 border-t-0 border-b-0 duration-200 border-l-2 border-transparent hover:border-emerald-400">
                  <div className="flex items-center">
                    <ServerIcon className="w-5 h-5 mr-3 text-[#00d992]" />
                    <span className="text-sm">Deployment</span>
                  </div>
                  <span className="ml-2 px-2 py-0.5 text-xs bg-emerald-400/10 text-emerald-400 rounded-full">
                    Soon
                  </span>
                </div>

                <div className="p-3 hover:bg-gray-800/50 text-[#DCDCDC] hover:text-emerald-400 flex items-center justify-between transition-colors rounded-b-md border-solid border-r-0 border-t-0 border-b-0 duration-200 border-l-2 border-transparent hover:border-emerald-400">
                  <div className="flex items-center">
                    <CommandLineIcon className="w-5 h-5 mr-3 text-[#00d992]" />
                    <span className="text-sm">Agentic App Builder</span>
                  </div>
                  <span className="ml-2 px-2 py-0.5 text-xs bg-emerald-400/10 text-emerald-400 rounded-full">
                    Soon
                  </span>
                </div>
              </div>
            </div>
            <Link
              to="/about/"
              className={`${styles.navLink} ${
                isActive("/about/") ? styles.active : ""
              }`}
            >
              ABOUT US
            </Link>
            <Link
              to="/docs/"
              className={`${styles.navLink} ${
                isActive("/docs/") ? styles.active : ""
              }`}
            >
              DOCUMENTATION
            </Link>
            <Link
              to="https://github.com/voltagent/voltagent/tree/main/examples/"
              className={`${styles.navLink} ${
                isActive("/docs/") ? styles.active : ""
              }`}
            >
              EXAMPLES
            </Link>

            <Link
              to="/blog/"
              className={`${styles.navLink} ${
                isActive("/blog/") ? styles.active : ""
              }`}
            >
              BLOG
            </Link>
          </div>
        </div>
        <div className={styles.navbarRight}>
          <Link
            to="https://github.com/voltagent/voltagent/"
            target="_blank"
            className={`${styles.navbarButton} group relative no-underline flex hover:border-emerald-400  hover:text-[#00d992] items-center border-solid border-1 border-[#DCDCDC] rounded-3xl p-1 rounded-full text-[#DCDCDC] hover:text-[#00d992]`}
            rel="noopener noreferrer"
          >
            <GitHubLogo className="w-6 h-6 " />

            {/* Stargazer Avatars Container - Only show on non-mobile */}
            {!isMobile && (
              <div className="absolute left-0 top-1/2 -translate-x-full -translate-y-1/2 flex items-center opacity-0 group-hover:opacity-100 group-hover:translate-x-[-80%] transition-all duration-300 pointer-events-none">
                {/* Display only if not loading, no error, and stargazers exist */}
                {!isLoadingStars &&
                  !starsError &&
                  recent_stargazers &&
                  recent_stargazers.length > 0 && (
                    <>
                      <span className="text-xs text-emerald-400 cursor-pointer px-2 py-1 rounded whitespace-nowrap mr-1">
                        Thank you!
                      </span>
                      <div className="flex space-x-[-10px]">
                        {recent_stargazers
                          .slice(0, 5)
                          .map((stargazer, index) => (
                            <a
                              key={stargazer.login}
                              href="https://github.com/voltagent/voltagent/stargazers/"
                              target="_blank"
                              rel="noopener noreferrer"
                              title={stargazer.login}
                              className="block w-6 h-6 rounded-full overflow-hidden border border-gray-600 hover:scale-110 transition-transform duration-200 pointer-events-auto"
                              style={{ zIndex: 3 - index }}
                            >
                              <img
                                src={stargazer.avatar_url}
                                alt={`${stargazer.login} avatar`}
                                className="w-full h-full object-cover"
                                loading="lazy"
                              />
                            </a>
                          ))}
                      </div>
                    </>
                  )}
              </div>
            )}

            <div className="flex items-center ml-2 font-medium text-sm">
              <span className="">
                {isLoadingStars
                  ? "✨"
                  : starsError
                    ? "-"
                    : formatStarCount(stars)}
              </span>
              <StarIcon className="w-4 h-4 ml-1 text-yellow-400 group-hover:animate-bounce" />
            </div>
          </Link>
          {!isMobile && (
            <Link
              to="https://s.voltagent.dev/discord/"
              className={`${styles.navbarButton} group relative flex items-center`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <DiscordLogo className="w-6 h-6 text-[#5865F2] hover:text-[#00d992]" />
            </Link>
          )}

          <button
            type="button"
            className={`${styles.menuButton} ${
              isMenuOpen ? styles.menuButtonOpen : ""
            }`}
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Toggle menu"
          >
            <svg
              width="30"
              height="30"
              viewBox="0 0 30 30"
              aria-hidden="true"
              className={styles.menuIcon}
            >
              <path
                stroke="currentColor"
                strokeLinecap="round"
                strokeMiterlimit="10"
                strokeWidth="2"
                d="M4 7h22M4 15h22M4 23h22"
              />
            </svg>
          </button>
        </div>
      </div>
      {isMenuOpen && (
        <div className={styles.mobileMenu}>
          <div className={styles.mobileNavLink}>
            <button
              type="button"
              className="flex items-center px-0  w-full cursor-pointer bg-transparent border-none text-inherit"
              onClick={() => {
                const elem = document.getElementById(
                  "mobile-products-dropdown",
                );
                if (elem) {
                  elem.classList.toggle("hidden");
                }
              }}
            >
              <span className="font-['IBM_Plex_Mono'] font-semibold">
                PRODUCTS
              </span>
              <ChevronDownIcon className="w-5 h-5 ml-1" />
            </button>
            <div id="mobile-products-dropdown" className="hidden  mt-4 mb-2 ">
              <Link to="/ai-agent-monitoring/" className="no-underline">
                <div className="p-3 hover:bg-gray-800/50 cursor-pointer text-[#DCDCDC] hover:text-emerald-400 flex items-center transition-colors duration-200 rounded-t-md border-solid border-r-0 border-t-0 border-b-0 border-l-2 border-transparent hover:border-emerald-400">
                  <ComputerDesktopIcon className="w-5 h-5 mr-2 text-[#00d992]" />
                  <span className="text-sm">Developer Console</span>
                </div>
              </Link>
              <div className="p-3 hover:bg-gray-800/50 cursor-pointer text-[#DCDCDC] hover:text-emerald-400 flex items-center justify-between transition-colors border-solid border-r-0 border-t-0 border-b-0 duration-200 border-l-2 border-transparent hover:border-emerald-400">
                <div className="flex items-center">
                  <ServerIcon className="w-5 h-5 mr-2 text-[#00d992]" />
                  <span className="text-sm">Deployment</span>
                </div>
                <span className="ml-2 px-2 py-0.5 text-xs bg-emerald-400/10 text-emerald-400 rounded-full">
                  Soon
                </span>
              </div>

              <div className="p-3 hover:bg-gray-800/50 cursor-pointer text-[#DCDCDC] hover:text-emerald-400 flex items-center justify-between transition-colors border-solid border-r-0 border-t-0 border-b-0 duration-200 border-l-2 border-transparent hover:border-emerald-400 rounded-b-md">
                <div className="flex items-center">
                  <ShoppingCartIcon className="w-5 h-5 mr-2 text-[#00d992]" />
                  <Link
                    to="/ai-agent-marketplace/"
                    className="text-sm no-underline text-inherit"
                  >
                    Marketplace
                  </Link>
                </div>
              </div>
              <div className="p-3 hover:bg-gray-800/50 cursor-pointer text-[#DCDCDC] hover:text-emerald-400 flex items-center justify-between transition-colors border-solid border-r-0 border-t-0 border-b-0 duration-200 border-l-2 border-transparent hover:border-emerald-400">
                <div className="flex items-center">
                  <CommandLineIcon className="w-5 h-5 mr-2 text-[#00d992]" />
                  <span className="text-sm">Agentic App Builder</span>
                </div>
                <span className="ml-2 px-2 py-0.5 text-xs bg-emerald-400/10 text-emerald-400 rounded-full">
                  Soon
                </span>
              </div>
            </div>
          </div>
          <Link
            to="/about/"
            className={`${styles.mobileNavLink} ${
              isActive("/about/") ? styles.active : ""
            }`}
          >
            ABOUT US
          </Link>
          <Link
            to="/docs/"
            className={`${styles.mobileNavLink} ${
              isActive("/docs/") ? styles.active : ""
            }`}
          >
            DOCUMENTATION
          </Link>
          <Link
            to="https://github.com/voltagent/voltagent/tree/main/examples/"
            className={`${styles.mobileNavLink} ${
              isActive("/docs/") ? styles.active : ""
            }`}
          >
            EXAMPLES
          </Link>

          <Link
            to="/blog/"
            className={`${styles.mobileNavLink} ${
              isActive("/blog/") ? styles.active : ""
            }`}
          >
            BLOG
          </Link>
          <div className={styles.mobileButtons}>
            <Link
              to="https://console.voltagent.dev/demo"
              className={styles.mobileLoginButton}
            >
              Log in to Developer Console
            </Link>
            <Link
              to="https://s.voltagent.dev/discord/"
              className={styles.mobileDiscordButton}
              target="_blank"
              rel="noopener noreferrer"
            >
              <DiscordLogo className="w-5 h-5" />
              <span>Discord Community</span>
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
