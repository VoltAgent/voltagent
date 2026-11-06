/**
 * Simple template engine for basic variable substitution
 */

/**
 * Template engine interface
 */
export type TemplateEngine = {
  /** Process template with variables */
  process: (content: string, variables: Record<string, any>) => string;
  /** Engine name for debugging */
  name: string;
};

/**
 * Escapes regex metacharacters so a template variable name is matched literally
 */
const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Simple mustache-style template engine (built-in, no dependencies)
 * Supports {{variable}} syntax for basic variable substitution
 */
export const createSimpleTemplateEngine = (): TemplateEngine => ({
  name: "simple",
  process: (content: string, variables: Record<string, any>): string => {
    let processed = content;
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`\\{\\{\\s*${escapeRegExp(key)}\\s*\\}\\}`, "g");
      const replacement = String(value);
      processed = processed.replace(regex, () => replacement);
    }
    return processed;
  },
});
