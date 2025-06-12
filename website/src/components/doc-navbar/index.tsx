import Link from "@docusaurus/Link";
import { useLocation } from "@docusaurus/router";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import { BoltIcon } from "@heroicons/react/24/solid";
import SearchBar from "@theme/SearchBar";
import React, { useState } from "react";
import { DiscordLogo } from "../../../static/img/logos/discord";
import { GitHubLogo } from "../../../static/img/logos/github";
import styles from "./styles.module.css";

import NavbarMobileSidebarSecondaryMenu from "@theme/Navbar/MobileSidebar/SecondaryMenu";
import { cn } from "../../utils";

export default function DocNavbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();

  React.useEffect(() => {
    setIsMenuOpen(false);
  }, []);

  const isActive = (path: string) => {
    const currentPath = location.pathname.endsWith("/")
      ? location.pathname
      : `${location.pathname}/`;
    const checkPath = path.endsWith("/") ? path : `${path}/`;
    return currentPath.startsWith(checkPath);
  };

  return (
    <>
      <nav className={styles.docNavbar}>
        <div className={styles.docNavbarInner}>
          <div className={styles.docNavbarLeft}>
            <div className={styles.navLinks}>
              {/* Show Framework Docs only when NOT on observability docs */}
              {!isActive("/voltops-llm-observability-docs/") && (
                <Link to="/docs/" className={`${styles.logoLink}`}>
                  <div className="flex items-center">
                    <div className="flex items-center justify-center border-2 border-solid border-[#00d992] rounded-full p-1">
                      <BoltIcon className="w-4 h-4 text-[#00d992]" />
                    </div>
                    <div className="flex items-center">
                      <span className="text-xl landing-xs:text-lg landing-sm:text-2xl font-bold text-[#00d992] ml-2">
                        voltagent
                      </span>
                    </div>
                    <span className="text-gray-400 mx-2 mt-1 text-base">
                      Framework
                    </span>
                    <span className="text-main-emerald  mt-1 font-semibold text-base">
                      Docs
                    </span>
                  </div>
                </Link>
              )}

              {!isActive("/docs/") && (
                <Link
                  to="/voltops-llm-observability-docs/"
                  className={`${styles.logoLink}`}
                >
                  <div className="flex items-center">
                    <div className="flex items-center justify-center border-2 border-solid border-[#00d992] rounded-full p-1">
                      <BoltIcon className="w-4 h-4 text-[#00d992]" />
                    </div>
                    <div className="flex items-center">
                      <span className="text-xl landing-xs:text-lg landing-sm:text-2xl font-bold text-[#00d992] ml-2">
                        volt
                      </span>
                      <span className="text-xl landing-xs:text-lg landing-sm:text-2xl font-bold text-gray-500">
                        ops
                      </span>
                    </div>
                    <span className="text-gray-400 mt-1 mx-2 text-base ">
                      LLM Observability
                    </span>
                    <span className="text-main-emerald mt-1 font-semibold text-base">
                      Docs
                    </span>
                  </div>
                </Link>
              )}
            </div>
          </div>

          <div className={styles.docNavbarRight}>
            <div className={styles.navLinks}>
              {/* Show link to VoltOps docs when on regular docs */}
              {isActive("/docs/") && (
                <Link
                  to="/voltops-llm-observability-docs/"
                  className={`${styles.navLink}`}
                >
                  VoltOps Docs
                </Link>
              )}

              {/* Show link to Voltagent docs when on observability docs */}
              {isActive("/voltops-llm-observability-docs/") && (
                <Link to="/docs/" className={`${styles.navLink}`}>
                  Voltagent Docs
                </Link>
              )}

              {/* Show changelog only when NOT on observability docs */}
              {!isActive("/voltops-llm-observability-docs/") && (
                <Link
                  to="https://github.com/voltagent/voltagent/blob/main/CHANGELOG.md"
                  className={`${styles.navLink}`}
                >
                  Changelog
                </Link>
              )}
            </div>
            <div className={styles.searchBarContainer}>
              <SearchBar />
            </div>
            {/* Show version badge only when NOT on observability docs */}
            {!isActive("/voltops-llm-observability-docs/") && (
              <div className={styles.versionBadge}>v0.1.x</div>
            )}
            <Link
              to="https://s.voltagent.dev/discord"
              className={styles.socialButton}
              target="_blank"
              rel="noopener noreferrer"
            >
              <DiscordLogo className="w-6 h-6 text-[#5865F2]" />
            </Link>
            <Link
              to="https://github.com/voltagent/voltagent"
              target="_blank"
              className={styles.socialButton}
              rel="noopener noreferrer"
            >
              <GitHubLogo className="w-6 h-6 text-white" />
            </Link>

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
      </nav>

      {isMenuOpen && (
        <div className={styles.mobileMenu}>
          <NavbarMobileSidebarSecondaryMenu />
          <div className={cn("h-px", "bg-gray-600/50", "w-full")} />
          <div className={cn("flex", "flex-col", "items-start", "gap-4")}>
            {/* Show mobile version badge only when NOT on observability docs */}
            {!isActive("/voltops-llm-observability-docs/") && (
              <div className={styles.versionBadgeMobile}>v0.1.x</div>
            )}
            {!isActive("/voltops-llm-observability-docs/") && (
              <Link
                to="/docs/"
                className={`${styles.mobileNavLink} ${
                  isActive("/docs/") ? styles.active : ""
                }`}
                onClick={() => setIsMenuOpen(false)}
              >
                Framework Docs
              </Link>
            )}

            {!isActive("/docs/") && (
              <Link
                to="/voltops-llm-observability-docs/"
                className={`${styles.mobileNavLink} ${
                  isActive("/voltops-llm-observability-docs/")
                    ? styles.active
                    : ""
                }`}
                onClick={() => setIsMenuOpen(false)}
              >
                VoltOps LLM Observability Platform
              </Link>
            )}
            {/* Show changelog only when NOT on observability docs */}
            {!isActive("/voltops-llm-observability-docs/") && (
              <Link
                to="https://github.com/voltagent/voltagent/blob/main/CHANGELOG.md"
                className={`${styles.navLink} ${
                  isActive("/changelog/") ? styles.active : ""
                }`}
              >
                Changelog
              </Link>
            )}
          </div>
        </div>
      )}
    </>
  );
}
