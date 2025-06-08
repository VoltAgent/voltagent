import { useLocation } from "@docusaurus/router";
import DocNavbar from "@site/src/components/doc-navbar";
import CustomNavbar from "@site/src/components/navbar";
import React from "react";

export default function Navbar() {
  const location = useLocation();
  const isDocsPage = location.pathname.includes("/docs");

  if (isDocsPage) {
    return <DocNavbar />;
  }

  return <CustomNavbar />;
}
