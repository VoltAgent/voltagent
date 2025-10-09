import Link from "@docusaurus/Link";
import { useLocation } from "@docusaurus/router";
import { BoltIcon } from "@heroicons/react/24/solid";
import NavbarMobileSidebarSecondaryMenu from "@theme/Navbar/MobileSidebar/SecondaryMenu";
import SearchBar from "@theme/SearchBar";
import clsx from "clsx";
import React, { useEffect, useMemo, useState } from "react";
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
              <BoltIcon className={styles.brandIcon} />
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
