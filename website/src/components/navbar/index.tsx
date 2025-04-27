import React, { useState } from "react";
import styles from "./styles.module.css";
import Link from "@docusaurus/Link";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import { useLocation } from "@docusaurus/router";
import { DiscordLogo } from "../../../static/img/logos/discord";
import { GitHubLogo } from "../../../static/img/logos/github";
import { BoltIcon } from "@heroicons/react/24/solid";
import { StarIcon } from "@heroicons/react/24/solid";
import { useGitHubStars } from "../../contexts/GitHubStarsContext";
import { useMediaQuery } from "@site/src/hooks/use-media-query";

export default function Navbar() {
  const { siteConfig } = useDocusaurusContext();
  const appUrl = (siteConfig.customFields?.appURL as string) || "";
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
            <Link
              to="/manifesto/"
              className={`${styles.navLink} ${
                isActive("/manifesto/") ? styles.active : ""
              }`}
            >
              Manifesto
            </Link>
            <Link
              to="/docs/"
              className={`${styles.navLink} ${
                isActive("/docs/") ? styles.active : ""
              }`}
            >
              Documentation
            </Link>
            <Link
              to="https://github.com/voltagent/voltagent/tree/main/examples"
              className={`${styles.navLink} ${
                isActive("/docs/") ? styles.active : ""
              }`}
            >
              Examples
            </Link>
            <Link
              to="/blog/"
              className={`${styles.navLink} ${
                isActive("/blog/") ? styles.active : ""
              }`}
            >
              Blog
            </Link>
            <div
              className={`${styles.navLink} ${styles.navLinkDisabled} relative group cursor-pointer flex items-center`}
            >
              AI Agent Marketplace
              <span className="absolute left-full ml-2 px-1.5 py-0.5 text-xs font-semibold text-emerald-400 border-solid border-emerald-400 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">
                Coming Soon
              </span>
            </div>
          </div>
        </div>
        <div className={styles.navbarRight}>
          <Link
            to="https://github.com/voltagent/voltagent"
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
                              href="https://github.com/voltagent/voltagent/stargazers"
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
              to="https://s.voltagent.dev/discord"
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
          <div className={styles.mobileLogo}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className={styles.logoIcon}
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M14.615 1.595a.75.75 0 01.359.852L12.982 9.75h7.268a.75.75 0 01.548 1.262l-10.5 11.25a.75.75 0 01-1.272-.71l1.992-7.302H3.75a.75.75 0 01-.548-1.262l10.5-11.25a.75.75 0 01.913-.143z"
                clipRule="evenodd"
              />
            </svg>
            <span className={styles.logoText}>VoltAgent</span>
          </div>
          <Link
            to="/manifesto/"
            className={`${styles.mobileNavLink} ${
              isActive("/manifesto/") ? styles.active : ""
            }`}
          >
            Manifesto
          </Link>
          <Link
            to="/docs/"
            className={`${styles.mobileNavLink} ${
              isActive("/docs/") ? styles.active : ""
            }`}
          >
            Documentation
          </Link>
          <Link
            to="https://github.com/voltagent/voltagent/tree/main/examples"
            className={`${styles.mobileNavLink} ${
              isActive("/docs/") ? styles.active : ""
            }`}
          >
            Examples
          </Link>
          <div
            className={`${styles.mobileNavLink} ${styles.navLinkDisabled} flex items-center justify-center cursor-default`}
          >
            AI Agent Marketplace
            <span className="ml-2 px-1.5 py-0.5 text-xs font-semibold text-emerald-400 border border-emerald-400 rounded-full whitespace-nowrap">
              Coming Soon
            </span>
          </div>
          <Link
            to="/blog/"
            className={`${styles.mobileNavLink} ${
              isActive("/blog/") ? styles.active : ""
            }`}
          >
            Blog
          </Link>
          <div className={styles.mobileButtons}>
            <Link to={`${appUrl}/login`} className={styles.mobileLoginButton}>
              Log in Developer Console
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
