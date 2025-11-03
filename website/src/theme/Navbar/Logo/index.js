import Link from "@docusaurus/Link";
import { BoltIcon } from "@heroicons/react/24/solid";
import React from "react";
import styles from "./styles.module.css";

export default function NavbarLogo() {
  return (
    <Link to="/" className={styles.logoContainer}>
      <div className={styles.logoIcon}>
        <BoltIcon className={styles.boltIcon} />
      </div>
      <span className={styles.logoText}>voltagent</span>
      <span className={styles.frameworkText}>Framework</span>
      <span className={styles.docsText}>Docs</span>
      <div className={styles.versionBadge}>v1.0.x</div>
    </Link>
  );
}
