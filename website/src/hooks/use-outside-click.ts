import type { RefObject } from "react";

import { useEffect } from "react";

type Handler = (event: MouseEvent) => void;

export const useOutsideClick = <T extends HTMLElement = HTMLElement>(
  ref: RefObject<T>,
  callback: Handler,
) => {
  // biome-ignore lint/correctness/useExhaustiveDependencies: ignore
  useEffect(() => {
    const handleClick = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        event.preventDefault();
        callback(event);
      }
    };

    document.addEventListener("click", handleClick, true);

    return () => {
      document.removeEventListener("click", handleClick, true);
    };
  }, [ref]);

  return ref;
};
