/**
 * Numeric enums have a reverse mapping https://www.typescriptlang.org/docs/handbook/enums.html#reverse-mappings
 * whereas string ones don't.
 *
 * This function checks if an enum is fully numeric - i.e all values are numbers or not.
 * And filters out only the actual enum values when a reverse mapping is apparent.
 */
export declare function enumInfo(enumObject: Record<string, string | number>): {
    values: (string | number | undefined)[];
    type: "string" | "numeric" | "mixed";
};
