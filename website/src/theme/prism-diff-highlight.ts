import type { EnvConfig, PrismLib } from "prism-react-renderer";
import type { Token, TokenStream } from "prismjs";

const LANGUAGE_REGEX = /^diff-([\w-]+)/i;

const tokenStreamToString = (tokenStream: TokenStream): string => {
  const result: string[] = [];
  const stack: TokenStream[] = [tokenStream];

  while (stack.length > 0) {
    const item = stack.pop();

    if (typeof item === "string") {
      result.push(item);
    } else if (Array.isArray(item)) {
      for (let i = item.length - 1; i >= 0; i--) {
        stack.push(item[i]);
      }
    } else {
      // If it's a Token, convert it to a string and push it
      stack.push(item.content);
    }
  }

  return result.join("");
};

export function diffHighlight(Prism: PrismLib) {
  Prism.hooks.add("after-tokenize", (env: EnvConfig) => {
    let diffLanguage: string | undefined;
    let diffGrammar: Prism.Languages[string];
    const language = env.language;
    if (language !== "diff") {
      const langMatch = LANGUAGE_REGEX.exec(language);
      if (!langMatch) {
        return; // not a language specific diff
      }

      diffLanguage = langMatch[1];
      diffGrammar = Prism.languages[diffLanguage];
      if (!diffGrammar) {
        console.error(
          "prism-diff-highlight:",
          `You need to add language '${diffLanguage}' to use '${language}'`,
        );
        return;
      }
    } else return;

    const newTokens = [];
    for (const token of env.tokens) {
      if (typeof token === "string") {
        newTokens.push(...Prism.tokenize(token, diffGrammar));
      } else if (token.type === "unchanged") {
        newTokens.push(...Prism.tokenize(tokenStreamToString(token), diffGrammar));
      } else if (["deleted-sign", "inserted-sign"].includes(token.type)) {
        token.alias = [
          token.type === "deleted-sign" ? "diff-highlight-deleted" : "diff-highlight-inserted",
        ];
        // diff parser always return "deleted" and "inserted" lines with content of type array
        if (token.content.length > 1) {
          const newTokenContent: Array<string | Token> = [];
          // preserve prefixes and don't parse them again
          // subTokens from diff parser are of type Token
          for (const subToken of token.content as Array<Token>) {
            if (subToken.type === "prefix") {
              newTokenContent.push(subToken);
            } else {
              newTokenContent.push(...Prism.tokenize(tokenStreamToString(subToken), diffGrammar));
            }
          }
          token.content = newTokenContent;
        }
        newTokens.push(token);
      } else if (token.type === "coord") {
        newTokens.push(token);
      }
    }
    env.tokens = newTokens;
  });
}
