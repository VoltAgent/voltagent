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
  const isVoltOpsDoc = location.pathname.includes("/voltops-llm-observability-docs/");

  return (
    <div className={styles.contentWrapper}>
      {/* Desktop header - hidden on mobile */}
      <div className={styles.sidebarHeader}>
        <div className={styles.logoRow}>
          <Link
            to={isVoltOpsDoc ? "/voltops-llm-observability-docs/" : "/docs/"}
            className={styles.sidebarLogo}
          >
            <div className={styles.logoContainer}>
              <div className={styles.logoIcon}>
                <BoltIcon className={styles.boltIcon} />
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
