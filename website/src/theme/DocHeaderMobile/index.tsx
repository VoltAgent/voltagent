import Link from "@docusaurus/Link";
import { useActiveDocContext } from "@docusaurus/plugin-content-docs/client";
import { useLocation } from "@docusaurus/router";
import { useDocsSidebar, useNavbarMobileSidebar } from "@docusaurus/theme-common/internal";
import NavbarColorModeToggle from "@theme/Navbar/ColorModeToggle";
import React, { useMemo } from "react";
import styles from "./styles.module.css";

function useSectionLabel(): string | null {
  const sidebar = useDocsSidebar();
  const location = useLocation();
  const { activeDoc } = useActiveDocContext();

  const activeDocId = activeDoc?.id;
  const activeDocPath = activeDoc?.path ?? location.pathname;

  return useMemo(() => {
    if (!sidebar?.items || (!activeDocId && !activeDocPath)) return null;

    const normalize = (path?: string) => (path ? path.replace(/\/$/, "") : undefined);
    const targetPath = normalize(activeDocPath);

    const findParentLabel = (items: any[], parents: string[] = []): string | null => {
      for (const item of items) {
        if (!item) continue;
        if (item.type === "category") {
          const res = findParentLabel(item.items ?? [], [...parents, item.label]);
          if (res) return res;
        } else {
          const itemPath = normalize(item.href ?? item.path);
          const matchesDocId =
            (item.type === "doc" && (item.id === activeDocId || item.docId === activeDocId)) ||
            (item.type === "ref" && item.id === activeDocId);
          const matchesPath = itemPath && targetPath && itemPath === targetPath;
          if (matchesDocId || matchesPath) {
            const lastParent = parents.length > 0 ? parents[parents.length - 1] : null;
            return lastParent;
          }
        }
      }
      return null;
    };

    return findParentLabel(sidebar.items) ?? null;
  }, [sidebar?.items, activeDocId, activeDocPath]);
}

export default function DocHeaderMobile() {
  const mobileSidebar = useNavbarMobileSidebar();
  const section = useSectionLabel();

  return (
    <div className={styles.header}>
      <button
        type="button"
        aria-label="Open navigation"
        className={styles.hamburger}
        onClick={() => mobileSidebar.toggle()}
      >
        <span className={styles.hamburgerBar} />
        <span className={styles.hamburgerBar} />
        <span className={styles.hamburgerBar} />
      </button>
      <div className={styles.title} aria-live="polite">
        {section ?? "Docs"}
      </div>
      <div className={styles.actions}>
        <button
          type="button"
          aria-label="Search"
          className={styles.iconBtn}
          onClick={() => {
            const el = document.querySelector(".DocSearch-Button");
            if (el && el instanceof HTMLElement) el.click();
          }}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </button>
        <Link
          to="https://s.voltagent.dev/discord"
          className={styles.iconBtn}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Discord"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M20.317 4.369A19.791 19.791 0 0016.885 3c-.2.363-.431.85-.59 1.237a18.27 18.27 0 00-4.59 0A7.553 7.553 0 0011.115 3c-1.242.227-2.42.62-3.432 1.143C4.803 7.297 4.257 10.37 4.5 13.41c1.29 1.004 2.54 1.617 3.74 2.02.3-.41.567-.848.793-1.309-.436-.165-.85-.37-1.236-.607.104-.076.206-.155.305-.236 2.388 1.117 4.97 1.117 7.35 0 .1.082.202.16.305.236-.386.236-.8.442-1.236.607.226.461.493.9.793 1.31 1.2-.404 2.45-1.017 3.74-2.02.307-3.86-.654-6.9-1.937-9.041zM9.5 12.5c-.55 0-1-.56-1-1.25s.45-1.25 1-1.25 1 .56 1 1.25-.45 1.25-1 1.25zm5 0c-.55 0-1-.56-1-1.25s.45-1.25 1-1.25 1 .56 1 1.25-.45 1.25-1 1.25z" />
          </svg>
        </Link>
        <Link
          to="https://github.com/voltagent/voltagent"
          className={styles.iconBtn}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="GitHub"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M12 .5C5.73.5.98 5.24.98 11.5c0 4.86 3.15 8.98 7.52 10.43.55.1.75-.24.75-.53 0-.26-.01-.95-.02-1.86-3.06.66-3.71-1.47-3.71-1.47-.5-1.28-1.22-1.62-1.22-1.62-.99-.67.07-.66.07-.66 1.1.08 1.68 1.13 1.68 1.13.98 1.67 2.58 1.19 3.2.91.1-.72.38-1.2.69-1.48-2.44-.28-5.01-1.22-5.01-5.43 0-1.2.43-2.18 1.13-2.95-.11-.28-.49-1.42.11-2.96 0 0 .93-.3 3.05 1.13a10.5 10.5 0 015.56 0c2.12-1.43 3.05-1.13 3.05-1.13.6 1.54.22 2.68.11 2.96.7.77 1.13 1.75 1.13 2.95 0 4.22-2.58 5.15-5.03 5.42.39.33.74.99.74 2 0 1.44-.01 2.6-.01 2.95 0 .29.2.64.76.53A10.52 10.52 0 0023 11.5C23 5.24 18.27.5 12 .5z" />
          </svg>
        </Link>
        <NavbarColorModeToggle className={styles.colorMode} />
      </div>
    </div>
  );
}
