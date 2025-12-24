import { useActiveDocContext } from "@docusaurus/plugin-content-docs/client";
import { useLocation } from "@docusaurus/router";
import { useDocsSidebar } from "@docusaurus/theme-common/internal";
import type { Props } from "@theme/DocRoot/Layout/Main";
import clsx from "clsx";
import React, { useMemo } from "react";

import styles from "./styles.module.css";

export default function DocRootLayoutMain({
  hiddenSidebarContainer,
  children,
}: Props): JSX.Element {
  const sidebar = useDocsSidebar();
  const location = useLocation();
  const { activeDoc } = useActiveDocContext();

  const activeDocId = activeDoc?.id;
  const activeDocPath = activeDoc?.path ?? location.pathname;

  const sectionLabel = useMemo(() => {
    if (!sidebar?.items || (!activeDocId && !activeDocPath)) {
      return null;
    }

    const normalize = (path?: string) => (path ? path.replace(/\/$/, "") : undefined);

    const targetPath = normalize(activeDocPath);

    const findParentLabel = (items: any[], parents: string[] = []): string | null => {
      for (const item of items) {
        if (!item) {
          continue;
        }

        if (item.type === "category") {
          const result = findParentLabel(item.items ?? [], [...parents, item.label]);
          if (result) {
            return result;
          }
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

  return (
    <main
      className={clsx(
        styles.docMainContainer,
        (hiddenSidebarContainer || !sidebar) && styles.docMainContainerEnhanced,
      )}
    >
      <div
        className={clsx(
          styles.docItemWrapper,
          hiddenSidebarContainer && styles.docItemWrapperEnhanced,
        )}
      >
        {sectionLabel && <div className={styles.eyebrowSection}>{sectionLabel}</div>}
        {children}
      </div>
    </main>
  );
}
