import siteConfig from "@generated/docusaurus.config";
import type * as PrismNamespace from "prismjs";
import { diffHighlight } from "./prism-diff-highlight";

const DIFF_LANGUAGE_REGEX = /^diff-([\w-]+)/i;

export default function prismIncludeLanguages(
  PrismObject: typeof PrismNamespace,
): void {
  const {
    themeConfig: { prism },
  } = siteConfig;
  const { additionalLanguages } = prism as { additionalLanguages: string[] };

  // Prism components work on the Prism instance on the window, while prism-
  // react-renderer uses its own Prism instance. We temporarily mount the
  // instance onto window, import components to enhance it, then remove it to
  // avoid polluting global namespace.
  // You can mutate PrismObject: registering plugins, deleting languages... As
  // long as you don't re-assign it
  globalThis.Prism = PrismObject;

  for (const lang of additionalLanguages) {
    const langMatch = DIFF_LANGUAGE_REGEX.exec(lang);
    if (!langMatch) {
      require(`prismjs/components/prism-${lang}`); // not a language specific diff
    } else {
      if (!PrismObject.languages.diff) {
        console.error(
          "prism-include-languages:",
          "You need to import 'diff' language first to use 'diff-xxxx' languages",
        );
      }
      PrismObject.languages[lang] = PrismObject.languages.diff;
    }
  }

  diffHighlight(PrismObject);

  // biome-ignore lint/performance/noDelete:
  delete globalThis.Prism;
}
