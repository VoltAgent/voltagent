import Link from "@docusaurus/Link";
import { translate } from "@docusaurus/Translate";
import { useLocation } from "@docusaurus/router";
import { ThemeClassNames } from "@docusaurus/theme-common";
import { useAnnouncementBar, useScrollPosition } from "@docusaurus/theme-common/internal";
import { BoltIcon } from "@heroicons/react/24/solid";
import DocSidebarItems from "@theme/DocSidebarItems";
import SearchBar from "@theme/SearchBar";
import clsx from "clsx";
import React, { useState } from "react";
import styles from "./styles.module.css";

// Santa Claus Icon Component
const SantaIcon = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <circle cx="12" cy="13" r="8" fill="#FDBF6F" />
    <path d="M4 11C4 11 5 4 12 4C19 4 20 11 20 11L12 9L4 11Z" fill="#CC0000" />
    <ellipse cx="12" cy="11" rx="9" ry="2" fill="white" />
    <circle cx="19" cy="5" r="2.5" fill="white" />
    <path d="M12 4C12 4 16 3 19 5" stroke="#CC0000" strokeWidth="3" strokeLinecap="round" />
    <circle cx="9" cy="12" r="1" fill="#333" />
    <circle cx="15" cy="12" r="1" fill="#333" />
    <circle cx="7" cy="14" r="1.2" fill="#FF9999" opacity="0.6" />
    <circle cx="17" cy="14" r="1.2" fill="#FF9999" opacity="0.6" />
    <circle cx="12" cy="14" r="1.2" fill="#E88" />
    <path
      d="M4 15C4 15 4 22 12 22C20 22 20 15 20 15C20 15 18 16 12 16C6 16 4 15 4 15Z"
      fill="white"
    />
    <path
      d="M7 15.5C7 15.5 9 16.5 12 16.5C15 16.5 17 15.5 17 15.5C17 15.5 15 17 12 17C9 17 7 15.5 7 15.5Z"
      fill="white"
    />
  </svg>
);

function useShowAnnouncementBar() {
  const { isActive } = useAnnouncementBar();
  const [showAnnouncementBar, setShowAnnouncementBar] = useState(isActive);
  useScrollPosition(
    ({ scrollY }) => {
      if (isActive) {
        setShowAnnouncementBar(scrollY === 0);
      }
    },
    [isActive],
  );
  return isActive && showAnnouncementBar;
}

export default function DocSidebarDesktopContent({ path, sidebar, className }) {
  const showAnnouncementBar = useShowAnnouncementBar();
  const location = useLocation();
  const isVoltOpsDoc = location.pathname.includes("/observability-docs/");

  return (
    <div className={styles.contentWrapper}>
      {/* Desktop header - hidden on mobile */}
      <div className={styles.sidebarHeader}>
        <div className={styles.logoRow}>
          <Link
            to={isVoltOpsDoc ? "/observability-docs/" : "/docs/"}
            className={styles.sidebarLogo}
          >
            <div className={styles.logoContainer}>
              <div className={styles.logoIcon}>
                <SantaIcon className={styles.boltIcon} />
              </div>
              <span className={styles.logoText}>{isVoltOpsDoc ? "voltops" : "voltagent"}</span>
              <span className={styles.frameworkText}>
                {isVoltOpsDoc ? "Observability" : "Framework"}
              </span>
              <span className={styles.docsText}>Docs</span>
            </div>
          </Link>
        </div>
        <div className={styles.searchRow}>
          <div className={styles.searchContainer}>
            <SearchBar />
          </div>
          {!isVoltOpsDoc && <div className={styles.versionBadge}>v1.0.x</div>}
        </div>
      </div>

      <nav
        aria-label={translate({
          id: "theme.docs.sidebar.navAriaLabel",
          message: "Docs sidebar",
          description: "The ARIA label for the sidebar navigation",
        })}
        className={clsx(
          "menu thin-scrollbar",
          styles.menu,
          showAnnouncementBar && styles.menuWithAnnouncementBar,
          className,
        )}
      >
        <ul className={clsx(ThemeClassNames.docs.docSidebarMenu, "menu__list")}>
          <DocSidebarItems items={sidebar} activePath={path} level={1} />
        </ul>
      </nav>
    </div>
  );
}
