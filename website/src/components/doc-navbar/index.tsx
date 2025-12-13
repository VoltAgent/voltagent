import Link from "@docusaurus/Link";
import { useLocation } from "@docusaurus/router";
import NavbarMobileSidebarSecondaryMenu from "@theme/Navbar/MobileSidebar/SecondaryMenu";
import SearchBar from "@theme/SearchBar";
import clsx from "clsx";
import React, { useEffect, useMemo, useState } from "react";

// Santa Claus Icon Component
const SantaIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Face */}
    <circle cx="12" cy="13" r="8" fill="#FDBF6F" />
    {/* Hat */}
    <path d="M4 11C4 11 5 4 12 4C19 4 20 11 20 11L12 9L4 11Z" fill="#CC0000" />
    <ellipse cx="12" cy="11" rx="9" ry="2" fill="white" />
    {/* Hat pom-pom */}
    <circle cx="19" cy="5" r="2.5" fill="white" />
    {/* Hat tip curve */}
    <path d="M12 4C12 4 16 3 19 5" stroke="#CC0000" strokeWidth="3" strokeLinecap="round" />
    {/* Eyes */}
    <circle cx="9" cy="12" r="1" fill="#333" />
    <circle cx="15" cy="12" r="1" fill="#333" />
    {/* Rosy cheeks */}
    <circle cx="7" cy="14" r="1.2" fill="#FF9999" opacity="0.6" />
    <circle cx="17" cy="14" r="1.2" fill="#FF9999" opacity="0.6" />
    {/* Nose */}
    <circle cx="12" cy="14" r="1.2" fill="#E88" />
    {/* Beard */}
    <path
      d="M4 15C4 15 4 22 12 22C20 22 20 15 20 15C20 15 18 16 12 16C6 16 4 15 4 15Z"
      fill="white"
    />
    {/* Mustache */}
    <path
      d="M7 15.5C7 15.5 9 16.5 12 16.5C15 16.5 17 15.5 17 15.5C17 15.5 15 17 12 17C9 17 7 15.5 7 15.5Z"
      fill="white"
    />
  </svg>
);
import { DiscordLogo } from "../../../static/img/logos/discord";
import { GitHubLogo } from "../../../static/img/logos/github";
import styles from "./styles.module.css";

type TabConfig = {
  id: string;
  label: string;
  href: string;
  external?: boolean;
  match: (pathname: string) => boolean;
};

const tabs: TabConfig[] = [
  {
    id: "voltagent",
    label: "VoltAgent Docs",
    href: "/docs/",
    match: (pathname) => pathname.startsWith("/docs/"),
  },
  {
    id: "recipes",
    label: "Recipes & Guides",
    href: "/recipes-and-guides/",
    match: (pathname) => pathname.startsWith("/recipes-and-guides/"),
  },
  {
    id: "voltops",
    label: "VoltOps Docs",
    href: "/voltops-llm-observability-docs/",
    match: (pathname) => pathname.startsWith("/voltops-llm-observability-docs/"),
  },
  // Changelog tab removed for mobile doc navbar
];

function useActiveTab(pathname: string) {
  return useMemo(() => {
    const match = tabs.find((tab) => tab.match(pathname));
    return match?.id ?? "voltagent";
  }, [pathname]);
}

export default function DocNavbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  const activeTab = useActiveTab(location.pathname);

  // biome-ignore lint/correctness/useExhaustiveDependencies: Need to close menu on route change
  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  return (
    <>
      <nav className={styles.docNavbar} aria-label="Documentation navigation">
        <div className={styles.topRow}>
          <Link to="/" className={styles.brandLink} aria-label="VoltAgent home">
            <span className={styles.brandMark}>
              <SantaIcon className={styles.brandIcon} />
            </span>
          </Link>
          <div className={styles.actions}>
            <Link
              to="https://s.voltagent.dev/discord"
              className={styles.iconButton}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Discord"
            >
              <DiscordLogo className={styles.iconGlyphDiscord} />
            </Link>
            <Link
              to="https://github.com/voltagent/voltagent"
              className={styles.iconButton}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub"
            >
              <GitHubLogo className={styles.iconGlyphGithub} />
            </Link>
            <div className={styles.searchWrapper}>
              <SearchBar />
            </div>
            <button
              type="button"
              className={clsx(styles.menuButton, isMenuOpen && styles.menuButtonOpen)}
              onClick={() => setIsMenuOpen((prev) => !prev)}
              aria-label="Toggle menu"
            >
              <span className={styles.menuBar} />
              <span className={styles.menuBar} />
              <span className={styles.menuBar} />
            </button>
          </div>
        </div>
        <div className={styles.tabList} role="tablist" aria-label="Documentation sections">
          {tabs.map((tab) => (
            <Link
              key={tab.id}
              to={tab.href}
              className={clsx(styles.tab, activeTab === tab.id && styles.tabActive)}
              target={tab.external ? "_blank" : undefined}
              rel={tab.external ? "noopener noreferrer" : undefined}
            >
              {tab.label}
            </Link>
          ))}
        </div>
      </nav>

      {isMenuOpen && (
        <div className={styles.mobileMenu}>
          <NavbarMobileSidebarSecondaryMenu />
          <div className={styles.mobileDivider} />
          <div className={styles.mobileLinks}>
            <Link
              to="/docs/"
              className={clsx(
                styles.mobileNavLink,
                activeTab === "voltagent" && styles.mobileNavLinkActive,
              )}
              onClick={() => setIsMenuOpen(false)}
            >
              Framework Docs
            </Link>
            <Link
              to="/recipes-and-guides/"
              className={clsx(
                styles.mobileNavLink,
                activeTab === "recipes" && styles.mobileNavLinkActive,
              )}
              onClick={() => setIsMenuOpen(false)}
            >
              Recipes & Guides
            </Link>
            <Link
              to="/voltops-llm-observability-docs/"
              className={clsx(
                styles.mobileNavLink,
                activeTab === "voltops" && styles.mobileNavLinkActive,
              )}
              onClick={() => setIsMenuOpen(false)}
            >
              VoltOps LLM Observability Platform
            </Link>
            {/* Changelog removed from mobile links */}
          </div>
        </div>
      )}
    </>
  );
}
