import { useLocation } from "@docusaurus/router";
import { useWindowSize } from "@docusaurus/theme-common";
import DocNavbar from "@site/src/components/doc-navbar";
import CustomNavbar from "@site/src/components/navbar";
import React from "react";

export default function Navbar() {
  const location = useLocation();
  const windowSize = useWindowSize();
  const isDocsPage =
    location.pathname.includes("/docs") ||
    location.pathname.includes("/observability-docs") ||
    location.pathname.includes("/evaluation-docs") ||
    location.pathname.includes("/prompt-engineering-docs") ||
    location.pathname.includes("/deployment-docs") ||
    location.pathname.includes("/actions-triggers-docs") ||
    location.pathname.startsWith("/recipes-and-guides/");

  const isMobile = windowSize === "mobile";

  if (isDocsPage) {
    if (isMobile) {
      return <DocNavbar />;
    }
    return null;
  }

  return <CustomNavbar />;
}
