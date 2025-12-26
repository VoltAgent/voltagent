import Link from "@docusaurus/Link";
import { BoltIcon } from "@heroicons/react/24/solid";
import React from "react";
import styles from "./styles.module.css";

// Santa Claus Icon Component
const SantaIcon = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Face */}
    <circle cx="12" cy="13" r="8" fill="#FDBF6F" />
    {/* Hat */}
    <path d="M4 11C4 11 5 4 12 4C19 4 20 11 20 11L12 9L4 11Z" fill="#CC0000" />
    <ellipse cx="12" cy="11" rx="9" ry="2" fill="white" />
    {/* Hat pom-pom */}
    <circle cx="19" cy="5" r="2.5" fill="white" />
    {/* Hat tip curve */}
    <path d="M12 4C12 4 16 3 19 5" stroke="#CC0000" strokeWidth="3" strokeLinecap="round" />
    {/* Eyes */}
    <circle cx="9" cy="12" r="1" fill="#333" />
    <circle cx="15" cy="12" r="1" fill="#333" />
    {/* Rosy cheeks */}
    <circle cx="7" cy="14" r="1.2" fill="#FF9999" opacity="0.6" />
    <circle cx="17" cy="14" r="1.2" fill="#FF9999" opacity="0.6" />
    {/* Nose */}
    <circle cx="12" cy="14" r="1.2" fill="#E88" />
    {/* Beard */}
    <path
      d="M4 15C4 15 4 22 12 22C20 22 20 15 20 15C20 15 18 16 12 16C6 16 4 15 4 15Z"
      fill="white"
    />
    {/* Mustache */}
    <path
      d="M7 15.5C7 15.5 9 16.5 12 16.5C15 16.5 17 15.5 17 15.5C17 15.5 15 17 12 17C9 17 7 15.5 7 15.5Z"
      fill="white"
    />
  </svg>
);

export default function NavbarLogo() {
  return (
    <Link to="/" className={styles.logoContainer}>
      <div className={styles.logoIcon}>
        <SantaIcon className={styles.boltIcon} />
      </div>
      <span className={styles.logoText}>voltagent</span>
      <span className={styles.frameworkText}>Framework</span>
      <span className={styles.docsText}>Docs</span>
      <div className={styles.versionBadge}>v1.0.x</div>
    </Link>
  );
}
