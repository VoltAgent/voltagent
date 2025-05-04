/**
 * Prompt management utilities for agent prompt tuning
 */

// Type to extract variable names like {{variableName}} from a template string
export type ExtractVariableNames<T extends string> =
  T extends `${string}{{${infer Param}}}${infer Rest}` ? Param | ExtractVariableNames<Rest> : never;

// Base type for allowed variable values
export type AllowedVariableValue = string | number | boolean | undefined | null;

// Type for the variables object based on extracted names from template T
export type TemplateVariables<T extends string> = {
  // Map each extracted variable name K to an allowed value type
  [K in ExtractVariableNames<T>]: AllowedVariableValue;
};

// Conditional type for PromptTemplate.
// If T has no variables (ExtractVariableNames<T> is never),
// variables property is optional and must be an empty record.
// Otherwise, variables property is required and must match TemplateVariables<T>.
export type PromptTemplate<T extends string> = [ExtractVariableNames<T>] extends [never]
  ? {
      template: T;
      variables?: Record<string, never>; // No variables allowed
    }
  : {
      template: T;
      variables: TemplateVariables<T>; // Required variables based on template
    };

// Type for the function returned by createPrompt
// It accepts an optional object with partial variables matching the template
export type PromptCreator<T extends string> = (
  extraVariables?: Partial<TemplateVariables<T>>,
) => string;

/**
 * Creates a type-safe, customizable prompt function from a template string.
 * Variable names are automatically inferred from the template `{{variable}}` syntax.
 *
 * @param template - The template string with `{{variable}}` placeholders.
 * @param variables - An object containing the default values for the template variables.
 * @returns A function that takes optional extra variables and returns the processed prompt string.
 */
export const createPrompt = <T extends string>({
  template,
  variables,
}: PromptTemplate<T>): PromptCreator<T> => {
  // The variables object might be undefined if the template has no variables
  const defaultVariables = variables || {};

  return (extraVariables: Partial<TemplateVariables<T>> = {}) => {
    // Combine default and extra variables, extraVariables override defaults
    const mergedVariables = { ...defaultVariables, ...extraVariables };

    // Replace placeholders {{key}} with values from mergedVariables
    return template.replace(/\{\{([^}]+)\}\}/g, (_, key) => {
      // Trim whitespace from the key and assert its type
      const trimmedKey = key.trim() as keyof TemplateVariables<T>;
      // Get the value, convert to string, or use empty string if null/undefined
      return mergedVariables[trimmedKey]?.toString() || "";
    });
  };
};
