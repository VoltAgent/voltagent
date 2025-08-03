import clsx from "clsx";
import React from "react";
import styles from "./styles.module.css";
export default function NavbarSearch({ children, className }) {
  return <div className={clsx(className, styles.navbarSearchContainer)}>{children}</div>;
}
