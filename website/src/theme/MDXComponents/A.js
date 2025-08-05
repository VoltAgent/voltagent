import Link from "@docusaurus/Link";
import isInternalUrl from "@docusaurus/isInternalUrl";
import { useLocation } from "@docusaurus/router";
import React from "react";

export default function MDXA(props) {
  const rel = getLinkRel(props?.href);

  const _location = useLocation();

  return <Link {...props} rel={rel} />;
}

/**
 * This function will generate rel attribute for links.
 * @param {string} URL to be dest for link
 */
export const getLinkRel = (URL) => {
  let rel = "noopener noreferrer nofollow";

  const isInternalURL = isInternalUrl(URL);

  if (isInternalURL || URL?.includes("voltagent.dev")) {
    rel = "noopener dofollow";
  }

  return rel;
};
