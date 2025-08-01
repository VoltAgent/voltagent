import Link from "@docusaurus/Link";
import clsx from "clsx";
import React from "react";
import styles from "./styles.module.css";
export default function Tag({ permalink, label, count }) {
  return (
    <Link className="no-underline hover:no-underline" href={permalink} key={permalink}>
      <div className="w-fit px-[2px] py-[2px] mb-1 mr-1 bg-primary-black text-primary-black  border-primary-black   dark:bg-primary-yellow  dark:border-primary-yellow  dark:text-primary-yellow">
        <div className=" px-[1rem] pt-[4px] pb-[4px] bg-primary-yellow dark:bg-primary-black">
          {label} {count && <span>{count}</span>}
        </div>
      </div>
    </Link>
  );
}
