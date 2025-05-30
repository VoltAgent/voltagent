import React, { useState } from "react";
import styles from "./styles.module.css";
import Link from "@docusaurus/Link";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import { useLocation } from "@docusaurus/router";
import { DiscordLogo } from "../../../static/img/logos/discord";
import { GitHubLogo } from "../../../static/img/logos/github";
import { BoltIcon } from "@heroicons/react/24/solid";
import SearchBar from "@theme/SearchBar";

import NavbarMobileSidebarSecondaryMenu from "@theme/Navbar/MobileSidebar/SecondaryMenu";
import { cn } from "../../utils";

export default function DocNavbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();

  React.useEffect(() => {
    setIsMenuOpen(false);
  }, [location]);

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
            <Link to="/" className={styles.logoLink}>
              <div className="flex items-center border-solid border-1 border-main-emerald rounded-full  p-1">
                <BoltIcon className="w-4 h-4  text-main-emerald" />
              </div>
              <span className={styles.logoText}>voltagent</span>
            </Link>
            <div className={styles.separator} />
            <div className={styles.navLinks}>
              <Link
                to="/docs/"
                className={`${styles.navLink} ${
                  isActive("/docs/") ? styles.active : ""
                }`}
              >
                Framework Docs
              </Link>
              <Link
                to="/docs-observability/"
                className={`${styles.navLink} ${
                  isActive("/docs-observability/") ? styles.active : ""
                }`}
              >
                LLM Observability Platform Docs
              </Link>
            </div>
          </div>

          <div className={styles.docNavbarRight}>
            <div className={styles.navLinks}>
              <Link
                to="https://github.com/voltagent/voltagent/blob/main/CHANGELOG.md"
                className={`${styles.navLink}`}
              >
                Changelog
              </Link>
            </div>
            <div className={styles.searchBarContainer}>
              <SearchBar />
            </div>
            <div className={styles.versionBadge}>v0.1.x</div>
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
            <div className={styles.versionBadgeMobile}>v0.1.x</div>
            <Link
              to="/docs/"
              className={`${styles.mobileNavLink} ${
                isActive("/docs/") ? styles.active : ""
              }`}
              onClick={() => setIsMenuOpen(false)}
            >
              Framework Docs
            </Link>
            <Link
              to="/docs-observability/"
              className={`${styles.mobileNavLink} ${
                isActive("/docs-observability/") ? styles.active : ""
              }`}
              onClick={() => setIsMenuOpen(false)}
            >
              LLM Observability Platform Docs
            </Link>
            <Link
              to="https://github.com/voltagent/voltagent/blob/main/CHANGELOG.md"
              className={`${styles.navLink} ${
                isActive("/changelog/") ? styles.active : ""
              }`}
            >
              Changelog
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
