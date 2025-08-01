import { useColorMode, useThemeConfig } from "@docusaurus/theme-common";
import ColorModeToggle from "@theme/ColorModeToggle";
import React from "react";
import styles from "./styles.module.css";
export default function NavbarColorModeToggle({ className }) {
  const navbarStyle = useThemeConfig().navbar.style;
  const disabled = useThemeConfig().colorMode.disableSwitch;
  const { colorMode, setColorMode } = useColorMode();
  if (disabled) {
    return null;
  }
  return (
    <ColorModeToggle
      className={className}
      buttonClassName={navbarStyle === "dark" ? styles.darkNavbarColorModeToggle : undefined}
      value={colorMode}
      onChange={setColorMode}
    />
  );
}
