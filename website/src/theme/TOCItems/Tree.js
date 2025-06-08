import Link from "@docusaurus/Link";
import React from "react";

// Recursive component rendering the toc tree
function TOCItemTree({
  toc,
  className,
  linkClassName,
  linkActiveClassName,
  isChild,
}) {
  if (!toc.length) {
    return null;
  }
  return (
    <ul className={isChild ? undefined : className}>
      {toc.map((heading) => {
        const isActive = heading.isActive;
        const activeClassName = isActive ? linkActiveClassName : "";
        const combinedClassName = `${linkClassName ?? ""} ${
          activeClassName ?? ""
        }`.trim();

        return (
          <li key={heading.id}>
            <Link
              to={`#${heading.id}`}
              className={combinedClassName || undefined}
              // biome-ignore lint/security/noDangerouslySetInnerHtml: ignore
              dangerouslySetInnerHTML={{ __html: heading.value }}
            />
            <TOCItemTree
              isChild
              toc={heading.children}
              className={className}
              linkClassName={linkClassName}
              linkActiveClassName={linkActiveClassName}
            />
          </li>
        );
      })}
    </ul>
  );
}

// Memo only the tree root is enough
export default React.memo(TOCItemTree);
