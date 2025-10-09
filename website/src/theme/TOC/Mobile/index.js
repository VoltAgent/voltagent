import TOCItems from "@theme/TOCItems";
import clsx from "clsx";
import React, { useState } from "react";
import styles from "./styles.module.css";

export default function TOCMobile({ toc, ...props }) {
  if (!toc || toc.length === 0) return null;
  const [open, setOpen] = useState(false);

  return (
    <div className={styles.container}>
      <button
        type="button"
        className={styles.header}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className={styles.title}>On this page</span>
        <span className={clsx(styles.chevron, open && styles.chevronOpen)} aria-hidden>
          ▾
        </span>
      </button>

      {open && (
        <nav className={styles.content} aria-label="Table of contents">
          <TOCItems
            {...props}
            toc={toc}
            linkClassName={styles.link}
            linkActiveClassName={styles.linkActive}
            className={styles.list}
          />
        </nav>
      )}
    </div>
  );
}
