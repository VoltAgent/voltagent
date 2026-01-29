import { createTool } from "@voltagent/core";
import { z } from "zod";

type TokenType = "number" | "operator" | "paren";
interface Token {
  type: TokenType;
  value: string | number;
}

function tokenize(expr: string): Token[] {
  const tokens: Token[] = [];
  const chars = expr.replace(/\s/g, "");
  let i = 0;

  while (i < chars.length) {
    const char = chars[i];

    if (/\d/.test(char) || (char === "." && i + 1 < chars.length && /\d/.test(chars[i + 1]))) {
      let num = "";
      while (i < chars.length && (/\d/.test(chars[i]) || chars[i] === ".")) {
        num += chars[i++];
      }
      tokens.push({ type: "number", value: parseFloat(num) });
      continue;
    }

    if ("+-*/".includes(char)) {
      if (char === "*" && chars[i + 1] === "*") {
        tokens.push({ type: "operator", value: "**" });
        i += 2;
      } else {
        tokens.push({ type: "operator", value: char });
        i++;
      }
      continue;
    }

    if ("()".includes(char)) {
      tokens.push({ type: "paren", value: char });
      i++;
      continue;
    }

    throw new Error(`Invalid character: ${char}`);
  }
  return tokens;
}

function parseExpression(tokens: Token[]): number {
  let pos = 0;

  function parseAddSub(): number {
    let left = parseMulDiv();
    while (pos < tokens.length && (tokens[pos].value === "+" || tokens[pos].value === "-")) {
      const op = tokens[pos++].value;
      const right = parseMulDiv();
      left = op === "+" ? left + right : left - right;
    }
    return left;
  }

  function parseMulDiv(): number {
    let left = parsePower();
    while (pos < tokens.length && (tokens[pos].value === "*" || tokens[pos].value === "/")) {
      const op = tokens[pos++].value;
      const right = parsePower();
      left = op === "*" ? left * right : left / right;
    }
    return left;
  }

  function parsePower(): number {
    let left = parseUnary();
    if (pos < tokens.length && tokens[pos].value === "**") {
      pos++;
      const right = parsePower();
      left = Math.pow(left, right);
    }
    return left;
  }

  function parseUnary(): number {
    if (pos < tokens.length && (tokens[pos].value === "+" || tokens[pos].value === "-")) {
      const op = tokens[pos++].value;
      const val = parseUnary();
      return op === "-" ? -val : val;
    }
    return parsePrimary();
  }

  function parsePrimary(): number {
    const token = tokens[pos];
    if (!token) throw new Error("Unexpected end of expression");

    if (token.type === "number") {
      pos++;
      return token.value as number;
    }

    if (token.value === "(") {
      pos++;
      const val = parseAddSub();
      if (!tokens[pos] || tokens[pos].value !== ")") {
        throw new Error("Missing closing parenthesis");
      }
      pos++;
      return val;
    }

    throw new Error(`Unexpected token: ${token.value}`);
  }

  const result = parseAddSub();
  if (pos < tokens.length) {
    throw new Error(`Unexpected token: ${tokens[pos].value}`);
  }
  return result;
}

function safeEvaluate(expression: string): number {
  const tokens = tokenize(expression);
  if (tokens.length === 0) throw new Error("Empty expression");
  return parseExpression(tokens);
}

export const calculatorTool = createTool({
  name: "calculator",
  description:
    "Perform basic arithmetic calculations (addition, subtraction, multiplication, division, exponents, etc.)",
  parameters: z.object({
    expression: z
      .string()
      .describe("Mathematical expression to evaluate (e.g., '2 + 2', '10 * 5', '2 ** 8')"),
  }),
  execute: async ({ expression }) => {
    try {
      const result = safeEvaluate(expression);

      return {
        expression,
        result,
        success: true,
      };
    } catch (err) {
      return {
        expression,
        error: err instanceof Error ? err.message : "Invalid mathematical expression",
        success: false,
      };
    }
  },
});
