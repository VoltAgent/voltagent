import Link from "@docusaurus/Link";
import { useActiveDocContext } from "@docusaurus/plugin-content-docs/client";
import { useLocation } from "@docusaurus/router";
import { useDocsSidebar } from "@docusaurus/theme-common/internal";
import { DiscordLogo } from "@site/static/img/logos/discord";
import { GitHubLogo } from "@site/static/img/logos/github";
import type { Props } from "@theme/DocRoot/Layout/Main";
import clsx from "clsx";
import React, { useMemo } from "react";

import { ArrowRightIcon, HomeIcon } from "@heroicons/react/24/outline";
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

  // No nav content in header anymore per spec; only icons.

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
      <div className={styles.docHeader}>
        <div className={styles.leftGroup}>
          <div className={styles.tabList} role="tablist" aria-label="Documentation sections">
            <Link
              to="/docs/"
              className={clsx(
                styles.tab,
                location.pathname.startsWith("/docs/") && styles.tabActive,
              )}
            >
              VoltAgent Docs
            </Link>
            <Link
              to="/observability-docs/"
              className={clsx(
                styles.tab,
                location.pathname.startsWith("/observability-docs/") && styles.tabActive,
              )}
            >
              Observability
            </Link>
            <Link
              to="/actions-triggers-docs/"
              className={clsx(
                styles.tab,
                location.pathname.startsWith("/actions-triggers-docs/") && styles.tabActive,
              )}
            >
              Actions & Triggers
            </Link>
            <Link
              to="/evaluation-docs/"
              className={clsx(
                styles.tab,
                location.pathname.startsWith("/evaluation-docs/") && styles.tabActive,
              )}
            >
              Evaluation
            </Link>
            <Link
              to="/prompt-engineering-docs/"
              className={clsx(
                styles.tab,
                location.pathname.startsWith("/prompt-engineering-docs/") && styles.tabActive,
              )}
            >
              Prompt Engineering
            </Link>
            <Link
              to="/deployment-docs/"
              className={clsx(
                styles.tab,
                location.pathname.startsWith("/deployment-docs/") && styles.tabActive,
              )}
            >
              Deployment
            </Link>
            <Link
              to="/recipes-and-guides/"
              className={clsx(
                styles.tab,
                location.pathname.startsWith("/recipes-and-guides/") && styles.tabActive,
              )}
            >
              Recipes & Guides
            </Link>
          </div>
        </div>
        <div className={styles.actionGroup}>
          <Link
            to="https://console.voltagent.dev/"
            className={clsx(styles.socialButton, styles.ctaButton)}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Try VoltOps"
          >
            <span>Try VoltOps</span>
            <ArrowRightIcon className={styles.ctaIcon} />
          </Link>
          <Link to="/" className={styles.socialButton} aria-label="Home">
            <HomeIcon className={styles.socialIconHome} />
          </Link>
          <Link
            to="https://s.voltagent.dev/discord"
            className={styles.socialButton}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Discord"
          >
            <DiscordLogo className={styles.socialIconDiscord} />
          </Link>
          <Link
            to="https://github.com/voltagent/voltagent"
            className={styles.socialButton}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub"
          >
            <GitHubLogo className={styles.socialIconGitHub} />
          </Link>
        </div>
      </div>
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
