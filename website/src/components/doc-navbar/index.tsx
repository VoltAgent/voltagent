import { useEffect } from "react";

function useZeroNavbarHeight() {
  useEffect(() => {
    const root = document.documentElement;
    const previous = root.style.getPropertyValue("--ifm-navbar-height");
    root.style.setProperty("--ifm-navbar-height", "0px");
    return () => {
      if (previous) {
        root.style.setProperty("--ifm-navbar-height", previous);
      } else {
        root.style.removeProperty("--ifm-navbar-height");
      }
    };
  }, []);
}

export default function DocNavbar() {
  useZeroNavbarHeight();
  return null;
}
