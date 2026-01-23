import Link from "@docusaurus/Link";
import { useLocation } from "@docusaurus/router";
import { BoltIcon } from "@heroicons/react/24/solid";
import NavbarMobileSidebarSecondaryMenu from "@theme/Navbar/MobileSidebar/SecondaryMenu";
import SearchBar from "@theme/SearchBar";
import clsx from "clsx";
import React, { useEffect, useState } from "react";
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
    id: "home",
    label: "Home",
    href: "/docs/",
    match: (pathname) => pathname === "/docs/",
  },
  {
    id: "voltagent",
    label: "VoltAgent Framework",
    href: "/docs/overview/",
    match: (pathname) => pathname.startsWith("/docs/overview/"),
  },
  {
    id: "models",
    label: "Models",
    href: "/models-docs/",
    match: (pathname) => pathname.startsWith("/models-docs/"),
  },
  {
    id: "observability",
    label: "Observability",
    href: "/observability-docs/",
    match: (pathname) => pathname.startsWith("/observability-docs/"),
  },
  {
    id: "evaluation",
    label: "Evaluation",
    href: "/evaluation-docs/",
    match: (pathname) => pathname.startsWith("/evaluation-docs/"),
  },
  {
    id: "prompt-engineering",
    label: "Prompt Engineering",
    href: "/prompt-engineering-docs/",
    match: (pathname) => pathname.startsWith("/prompt-engineering-docs/"),
  },
  {
    id: "deployment",
    label: "Deployment",
    href: "/deployment-docs/",
    match: (pathname) => pathname.startsWith("/deployment-docs/"),
  },
  {
    id: "recipes",
    label: "Recipes & Guides",
    href: "/recipes-and-guides/",
    match: (pathname) => pathname.startsWith("/recipes-and-guides/"),
  },
];

function getActiveTabFromPathname(pathname: string): string {
  const match = tabs.find((tab) => tab.match(pathname));
  return match?.id ?? "voltagent";
}

function useActiveTab() {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<string>(() => {
    return getActiveTabFromPathname(location.pathname);
  });

  useEffect(() => {
    const pathname = typeof window !== "undefined" ? window.location.pathname : location.pathname;
    setActiveTab(getActiveTabFromPathname(pathname));
  }, [location.pathname]);

  return activeTab;
}

export default function DocNavbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  const activeTab = useActiveTab();

  // biome-ignore lint/correctness/useExhaustiveDependencies: Need to close menu on route change
  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  return (
    <>
      <nav className={styles.docNavbar} aria-label="Documentation navigation">
        <div className={styles.topRow}>
          <Link to="/" className={styles.brandLink} aria-label="VoltAgent home">
            <span className="flex items-center justify-center w-8 h-8 rounded-full border-2 border-solid border-[#00d992] bg-[rgba(0,217,146,0.08)]">
              <BoltIcon className="w-4 h-4 text-[#00d992]" />
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
                activeTab === "home" && styles.mobileNavLinkActive,
              )}
              onClick={() => setIsMenuOpen(false)}
            >
              Home
            </Link>
            <Link
              to="/docs/"
              className={clsx(
                styles.mobileNavLink,
                activeTab === "voltagent" && styles.mobileNavLinkActive,
              )}
              onClick={() => setIsMenuOpen(false)}
            >
              VoltAgent
            </Link>
            <Link
              to="/models-docs/"
              className={clsx(
                styles.mobileNavLink,
                activeTab === "models" && styles.mobileNavLinkActive,
              )}
              onClick={() => setIsMenuOpen(false)}
            >
              Models
            </Link>
            <Link
              to="/observability-docs/"
              className={clsx(
                styles.mobileNavLink,
                activeTab === "observability" && styles.mobileNavLinkActive,
              )}
              onClick={() => setIsMenuOpen(false)}
            >
              Observability
            </Link>
            <Link
              to="/evaluation-docs/"
              className={clsx(
                styles.mobileNavLink,
                activeTab === "evaluation" && styles.mobileNavLinkActive,
              )}
              onClick={() => setIsMenuOpen(false)}
            >
              Evaluation
            </Link>
            <Link
              to="/prompt-engineering-docs/"
              className={clsx(
                styles.mobileNavLink,
                activeTab === "prompt-engineering" && styles.mobileNavLinkActive,
              )}
              onClick={() => setIsMenuOpen(false)}
            >
              Prompt Engineering
            </Link>
            <Link
              to="/deployment-docs/"
              className={clsx(
                styles.mobileNavLink,
                activeTab === "deployment" && styles.mobileNavLinkActive,
              )}
              onClick={() => setIsMenuOpen(false)}
            >
              Deployment
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
          </div>
        </div>
      )}
    </>
  );
}
