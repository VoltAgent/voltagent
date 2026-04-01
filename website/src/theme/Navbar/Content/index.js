import Link from "@docusaurus/Link";
import { ErrorCauseBoundary, useThemeConfig } from "@docusaurus/theme-common";
import { splitNavbarItems, useNavbarMobileSidebar } from "@docusaurus/theme-common/internal";
import { DiscordLogo } from "@site/static/img/logos/discord";
import { GitHubLogo } from "@site/static/img/logos/github";
import NavbarColorModeToggle from "@theme/Navbar/ColorModeToggle";
import NavbarLogo from "@theme/Navbar/Logo";
import NavbarMobileSidebarToggle from "@theme/Navbar/MobileSidebar/Toggle";
import NavbarSearch from "@theme/Navbar/Search";
import NavbarItem from "@theme/NavbarItem";
import SearchBar from "@theme/SearchBar";
import clsx from "clsx";
import React from "react";
import styles from "./styles.module.css";
function useNavbarItems() {
  // TODO temporary casting until ThemeConfig type is improved
  return useThemeConfig().navbar.items;
}
function NavbarItems({ items }) {
  return (
    <>
      {items.map((item, i) => (
        <ErrorCauseBoundary
          // biome-ignore lint/suspicious/noArrayIndexKey: ignore
          key={i}
          onError={(error) =>
            new Error(
              `A theme navbar item failed to render.
Please double-check the following navbar item (themeConfig.navbar.items) of your Docusaurus config:
${JSON.stringify(item, null, 2)}`,
              { cause: error },
            )
          }
        >
          <NavbarItem {...item} />
        </ErrorCauseBoundary>
      ))}
    </>
  );
}
function NavbarContentLayout({ left, right }) {
  return (
    <div className="navbar__inner">
      <div className="navbar__items">{left}</div>
      <div className="navbar__items navbar__items--right">
        <Link to="/docs/overview" className={clsx(styles.navLink, styles.navLinkActive)}>
          VoltAgent Docs
        </Link>
        <Link to="/observability-docs/" className={styles.navLink}>
          Observability
        </Link>
        <Link to="/evaluation-docs/" className={styles.navLink}>
          Evaluation
        </Link>
        <Link to="/prompt-engineering-docs/" className={styles.navLink}>
          Prompt Engineering
        </Link>
        <Link to="/deployment-docs/" className={styles.navLink}>
          Deployment
        </Link>
        <Link to="/recipes-and-guides/" className={styles.navLink}>
          Recipes & Guides
        </Link>
        <Link
          to="https://github.com/voltagent/voltagent/blob/main/CHANGELOG.md"
          className={styles.navLink}
        >
          Changelog
        </Link>
        {right}
      </div>
    </div>
  );
}
export default function NavbarContent() {
  const mobileSidebar = useNavbarMobileSidebar();
  const items = useNavbarItems();
  const [leftItems] = splitNavbarItems(items);

  return (
    <NavbarContentLayout
      left={
        // TODO stop hardcoding items?
        <>
          {!mobileSidebar.disabled && <NavbarMobileSidebarToggle />}
          <NavbarLogo />
          <Link to="/docs/overview" className={clsx(styles.navLink, styles.navLinkActive)}>
            VoltAgent Docs
          </Link>
          <Link to="/recipes/" className={styles.navLink}>
            Recipes & Guides
          </Link>
          <NavbarItems items={leftItems} />
        </>
      }
      right={
        // TODO stop hardcoding items?
        // Ask the user to add the respective navbar items => more flexible
        <>
          <Link
            to="https://s.voltagent.dev/discord"
            className={styles.socialButton}
            target="_blank"
            rel="noopener noreferrer"
          >
            <DiscordLogo className={styles.socialIcon} />
          </Link>
          <Link
            to="https://github.com/voltagent/voltagent"
            target="_blank"
            className={styles.socialButton}
            rel="noopener noreferrer"
          >
            <GitHubLogo className={styles.socialIcon} />
          </Link>
          <NavbarColorModeToggle className={styles.colorModeToggle} />
        </>
      }
    />
  );
}
