import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

// Simple Tool interface for MCP
interface MCPTool<T = any> {
  name: string;
  description: string;
  parameters: z.ZodSchema<T>;
  execute: (args: T) => Promise<any>;
}

// Helper to create tools
function createMCPTool<T>(config: MCPTool<T>): MCPTool<T> {
  return config;
}

// Get package root directory - compatible with both ESM and CJS
function getDirname(): string {
  try {
    // ESM environment
    return path.dirname(fileURLToPath(import.meta.url));
  } catch {
    // CJS environment - fallback to current working directory
    return process.cwd();
  }
}

const __dirname = getDirname();
const packageRoot = path.resolve(__dirname, "..");

// Types for search results
export type DocumentationSearchResult = {
  filepath: string;
  title: string;
  excerpt: string;
  section: string;
};

export type ExampleSearchResult = {
  name: string;
  description: string;
  technologies: string[];
  path: string;
};

export type ExampleContent = {
  description: string;
  files: Array<{ path: string; content: string; type: string }>;
  technologies: string[];
  readme?: string;
};

export type ExampleInfo = {
  name: string;
  description: string;
  technologies: string[];
  category: string;
};

// Get paths - now always uses bundled content
export function getVoltAgentPaths(): {
  docsPath: string;
  examplesPath: string;
  packagesPath: string;
  workspaceRoot: string;
} {
  return {
    docsPath: path.join(packageRoot, "docs"),
    examplesPath: path.join(packageRoot, "examples"),
    packagesPath: path.join(packageRoot, "packages"),
    workspaceRoot: packageRoot,
  };
}

// Tool to search VoltAgent documentation
export const searchDocumentationTool = createMCPTool({
  name: "search_voltagent_docs",
  description:
    "Search through VoltAgent documentation by topic or keyword. Returns relevant documentation content.",
  parameters: z.object({
    query: z.string().describe("The search query or topic to find in documentation"),
    section: z
      .string()
      .optional()
      .describe(
        "Specific documentation section to search in (e.g., 'agents', 'tools', 'getting-started')",
      ),
  }),
  execute: async ({ query, section }: { query: string; section?: string }) => {
    try {
      const paths = getVoltAgentPaths();
      const searchResults = await searchDocumentation(paths.docsPath, query, section);

      if (searchResults.length === 0) {
        return {
          message: `No documentation found for query: "${query}"`,
          results: [],
        };
      }

      return {
        message: `Found ${searchResults.length} documentation results for "${query}"`,
        results: searchResults,
      };
    } catch (error) {
      return {
        error: `Failed to search documentation: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
});

// Tool to get specific documentation content
export const getDocumentationTool = createMCPTool({
  name: "get_voltagent_doc",
  description: "Get the full content of a specific VoltAgent documentation file.",
  parameters: z.object({
    filepath: z
      .string()
      .describe(
        "The relative path to the documentation file (e.g., 'agents/overview.md', 'getting-started/quick-start.md')",
      ),
  }),
  execute: async ({ filepath }: { filepath: string }) => {
    try {
      const paths = getVoltAgentPaths();
      const docsPath = paths.docsPath;
      const fullPath = path.join(docsPath, filepath);

      // Security check to prevent path traversal
      if (!fullPath.startsWith(docsPath)) {
        return { error: "Invalid file path - access denied" };
      }

      if (!fs.existsSync(fullPath)) {
        return { error: `Documentation file not found: ${filepath}` };
      }

      const content = fs.readFileSync(fullPath, "utf-8");
      const stats = fs.statSync(fullPath);

      return {
        filepath,
        content,
        lastModified: stats.mtime.toISOString(),
        size: stats.size,
      };
    } catch (error) {
      return {
        error: `Failed to read documentation: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
});

// Tool to list available documentation files
export const listDocumentationTool = createMCPTool({
  name: "list_voltagent_docs",
  description: "List all available VoltAgent documentation files and their structure.",
  parameters: z.object({
    section: z
      .string()
      .optional()
      .describe(
        "Specific section to list (e.g., 'agents', 'getting-started'). If not provided, lists all sections.",
      ),
  }),
  execute: async ({ section }: { section?: string }) => {
    try {
      const paths = getVoltAgentPaths();
      const docsPath = paths.docsPath;
      const structure = await getDocumentationStructure(docsPath, section);

      return {
        message: section
          ? `Documentation structure for section: ${section}`
          : "Complete VoltAgent documentation structure",
        structure,
      };
    } catch (error) {
      return {
        error: `Failed to list documentation: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
});

// Tool to search VoltAgent examples
export const searchExamplesTool = createMCPTool({
  name: "search_voltagent_examples",
  description: "Search through VoltAgent examples by name, description, or technology used.",
  parameters: z.object({
    query: z.string().describe("The search query to find relevant examples"),
    technology: z
      .string()
      .optional()
      .describe("Specific technology to filter by (e.g., 'nextjs', 'anthropic', 'supabase')"),
  }),
  execute: async ({ query, technology }: { query: string; technology?: string }) => {
    try {
      const paths = getVoltAgentPaths();
      const examplesPath = paths.examplesPath;
      const searchResults = await searchExamples(examplesPath, query, technology);

      if (searchResults.length === 0) {
        return {
          message: `No examples found for query: "${query}"${technology ? ` with technology: ${technology}` : ""}`,
          results: [],
        };
      }

      return {
        message: `Found ${searchResults.length} examples for "${query}"${technology ? ` with technology: ${technology}` : ""}`,
        results: searchResults,
      };
    } catch (error) {
      return {
        error: `Failed to search examples: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
});

// Tool to get specific example content
export const getExampleTool = createMCPTool({
  name: "get_voltagent_example",
  description: "Get the complete content and files of a specific VoltAgent example.",
  parameters: z.object({
    exampleName: z
      .string()
      .describe("The name of the example directory (e.g., 'with-nextjs', 'with-anthropic')"),
  }),
  execute: async ({ exampleName }: { exampleName: string }) => {
    try {
      const paths = getVoltAgentPaths();
      const examplesPath = paths.examplesPath;
      const examplePath = path.join(examplesPath, exampleName);

      if (!fs.existsSync(examplePath)) {
        return { error: `Example not found: ${exampleName}` };
      }

      const exampleContent = await getExampleContent(examplePath);

      return {
        exampleName,
        ...exampleContent,
      };
    } catch (error) {
      return {
        error: `Failed to get example: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
});

// Tool to list all available examples
export const listExamplesTool = createMCPTool({
  name: "list_voltagent_examples",
  description:
    "List all available VoltAgent examples with their descriptions and technologies used.",
  parameters: z.object({
    category: z
      .string()
      .optional()
      .describe("Filter examples by category or technology (e.g., 'voice', 'ai', 'database')"),
  }),
  execute: async ({ category }: { category?: string }) => {
    try {
      const paths = getVoltAgentPaths();
      const examplesPath = paths.examplesPath;
      const examples = await listExamples(examplesPath, category);

      return {
        message: category
          ? `VoltAgent examples in category: ${category}`
          : "All available VoltAgent examples",
        totalCount: examples.length,
        examples,
      };
    } catch (error) {
      return {
        error: `Failed to list examples: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
});

// Tool to list all available changelog files
export const listChangelogsTool = createMCPTool({
  name: "list_voltagent_changelogs",
  description:
    "List all available VoltAgent package changelogs to check for bug fixes and updates.",
  parameters: z.object({}),
  execute: async () => {
    try {
      const paths = getVoltAgentPaths();
      const changelogs = await listPackageChangelogs(paths.packagesPath);

      return {
        message: "Available VoltAgent package changelogs",
        totalCount: changelogs.length,
        changelogs,
      };
    } catch (error) {
      return {
        error: `Failed to list changelogs: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
});

// Tool to get specific package changelog
export const getChangelogTool = createMCPTool({
  name: "get_voltagent_changelog",
  description:
    "Get the changelog content for a specific VoltAgent package to check for bug fixes and recent updates.",
  parameters: z.object({
    packageName: z
      .string()
      .describe("The name of the package (e.g., 'core', 'cli', 'voice', 'anthropic-ai')"),
    maxEntries: z
      .number()
      .optional()
      .describe("Maximum number of changelog entries to return (default: 10)"),
  }),
  execute: async ({
    packageName,
    maxEntries = 10,
  }: {
    packageName: string;
    maxEntries?: number;
  }) => {
    try {
      const paths = getVoltAgentPaths();
      const changelogPath = path.join(paths.packagesPath, packageName, "CHANGELOG.md");

      if (!fs.existsSync(changelogPath)) {
        return { error: `Changelog not found for package: ${packageName}` };
      }

      const content = fs.readFileSync(changelogPath, "utf-8");
      const entries = parseChangelogEntries(content, maxEntries);
      const stats = fs.statSync(changelogPath);

      return {
        packageName,
        changelogPath: `packages/${packageName}/CHANGELOG.md`,
        totalSize: stats.size,
        lastModified: stats.mtime.toISOString(),
        entries,
      };
    } catch (error) {
      return {
        error: `Failed to get changelog: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
});

// Tool to search across all changelogs for specific issues or keywords
export const searchChangelogsTool = createMCPTool({
  name: "search_voltagent_changelogs",
  description:
    "Search across all VoltAgent package changelogs for specific bug fixes, features, or keywords.",
  parameters: z.object({
    query: z
      .string()
      .describe(
        "The search query to find in changelogs (e.g., 'bug fix', 'error', 'authentication')",
      ),
    packages: z
      .array(z.string())
      .optional()
      .describe("Specific packages to search in (if not provided, searches all packages)"),
  }),
  execute: async ({ query, packages }: { query: string; packages?: string[] }) => {
    try {
      const paths = getVoltAgentPaths();
      const results = await searchInChangelogs(paths.packagesPath, query, packages);

      return {
        message: `Found ${results.length} changelog entries matching "${query}"`,
        query,
        results,
      };
    } catch (error) {
      return {
        error: `Failed to search changelogs: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
});

// Helper function to search documentation
async function searchDocumentation(
  docsPath: string,
  query: string,
  section?: string,
): Promise<DocumentationSearchResult[]> {
  const results: DocumentationSearchResult[] = [];

  const searchPath = section ? path.join(docsPath, section) : docsPath;

  if (!fs.existsSync(searchPath)) {
    return results;
  }

  const searchInDirectory = (dirPath: string, currentSection = "") => {
    const items = fs.readdirSync(dirPath, { withFileTypes: true });

    for (const item of items) {
      const fullPath = path.join(dirPath, item.name);

      if (item.isDirectory()) {
        const sectionName = currentSection ? `${currentSection}/${item.name}` : item.name;
        searchInDirectory(fullPath, sectionName);
      } else if (item.name.endsWith(".md") || item.name.endsWith(".mdx")) {
        try {
          const content = fs.readFileSync(fullPath, "utf-8");
          const lowercaseContent = content.toLowerCase();
          const lowercaseQuery = query.toLowerCase();

          if (lowercaseContent.includes(lowercaseQuery)) {
            const lines = content.split("\n");
            const titleLine = lines.find((line) => line.startsWith("# ")) || lines[0];
            const title = titleLine?.replace(/^#\s*/, "") || item.name;

            // Find context around the match
            const matchIndex = lowercaseContent.indexOf(lowercaseQuery);
            const start = Math.max(0, matchIndex - 150);
            const end = Math.min(content.length, matchIndex + 150);
            const excerpt = content.slice(start, end).trim();

            results.push({
              filepath: path.relative(docsPath, fullPath),
              title,
              excerpt: `...${excerpt}...`,
              section: currentSection || path.dirname(path.relative(docsPath, fullPath)),
            });
          }
        } catch (error) {
          console.warn(`Error reading file ${fullPath}:`, error);
        }
      }
    }
  };

  searchInDirectory(searchPath);
  return results;
}

// Helper function to get documentation structure
async function getDocumentationStructure(
  docsPath: string,
  section?: string,
): Promise<Record<string, any>> {
  const structure: Record<string, any> = {};

  const buildStructure = (dirPath: string, obj: Record<string, any>) => {
    if (!fs.existsSync(dirPath)) return;

    const items = fs.readdirSync(dirPath, { withFileTypes: true });

    for (const item of items) {
      const fullPath = path.join(dirPath, item.name);

      if (item.isDirectory()) {
        obj[item.name] = {};
        buildStructure(fullPath, obj[item.name]);
      } else if (item.name.endsWith(".md") || item.name.endsWith(".mdx")) {
        try {
          const content = fs.readFileSync(fullPath, "utf-8");
          const lines = content.split("\n");
          const titleLine = lines.find((line) => line.startsWith("# ")) || lines[0];
          const title = titleLine?.replace(/^#\s*/, "") || item.name;

          obj[item.name] = {
            title,
            path: path.relative(docsPath, fullPath),
            size: fs.statSync(fullPath).size,
          };
        } catch {
          obj[item.name] = {
            title: item.name,
            path: path.relative(docsPath, fullPath),
            error: "Could not read file",
          };
        }
      }
    }
  };

  const targetPath = section ? path.join(docsPath, section) : docsPath;
  buildStructure(targetPath, structure);

  return structure;
}

// Helper function to search examples
async function searchExamples(
  examplesPath: string,
  query: string,
  technology?: string,
): Promise<ExampleSearchResult[]> {
  const results: ExampleSearchResult[] = [];

  if (!fs.existsSync(examplesPath)) {
    return results;
  }

  const items = fs.readdirSync(examplesPath, { withFileTypes: true });
  const lowercaseQuery = query.toLowerCase();

  for (const item of items) {
    if (item.isDirectory()) {
      const examplePath = path.join(examplesPath, item.name);

      try {
        const packageJsonPath = path.join(examplePath, "package.json");
        const readmePath = path.join(examplePath, "README.md");

        let description = "";
        let technologies: string[] = [];

        // Extract info from package.json
        if (fs.existsSync(packageJsonPath)) {
          const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
          description = packageJson.description || "";

          // Extract technologies from dependencies
          const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
          technologies = Object.keys(deps).filter(
            (dep) =>
              dep.includes("voltagent") ||
              dep.includes("ai") ||
              dep.includes("anthropic") ||
              dep.includes("openai") ||
              dep.includes("vercel") ||
              dep.includes("next") ||
              dep.includes("react") ||
              dep.includes("supabase") ||
              dep.includes("postgres"),
          );
        }

        // Extract description from README if not found in package.json
        if (!description && fs.existsSync(readmePath)) {
          const readmeContent = fs.readFileSync(readmePath, "utf-8");
          const descriptionMatch = readmeContent.match(/^#{1,2}\s*(.+?)$/m);
          description = descriptionMatch?.[1] || "";
        }

        // Check if this example matches the search criteria
        const matchesQuery =
          item.name.toLowerCase().includes(lowercaseQuery) ||
          description.toLowerCase().includes(lowercaseQuery) ||
          technologies.some((tech) => tech.toLowerCase().includes(lowercaseQuery));

        const matchesTechnology =
          !technology ||
          item.name.toLowerCase().includes(technology.toLowerCase()) ||
          technologies.some((tech) => tech.toLowerCase().includes(technology.toLowerCase()));

        if (matchesQuery && matchesTechnology) {
          results.push({
            name: item.name,
            description: description || `VoltAgent example: ${item.name}`,
            technologies,
            path: item.name,
          });
        }
      } catch (error) {
        console.warn(`Error processing example ${item.name}:`, error);
      }
    }
  }

  return results;
}

// Helper function to get example content
async function getExampleContent(examplePath: string): Promise<ExampleContent> {
  const result: ExampleContent = {
    description: "",
    files: [],
    technologies: [],
    readme: undefined,
  };

  // Discover all relevant files dynamically
  const filesToRead = await discoverExampleFiles(examplePath);

  for (const fileName of filesToRead) {
    const filePath = path.join(examplePath, fileName);
    if (fs.existsSync(filePath)) {
      try {
        const content = fs.readFileSync(filePath, "utf-8");

        if (fileName === "package.json") {
          const packageJson = JSON.parse(content);
          result.description = packageJson.description || "";
          const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
          result.technologies = Object.keys(deps);
        }

        if (fileName === "README.md") {
          result.readme = content;
        }

        result.files.push({
          path: fileName.replace(/\\/g, "/"), // Normalize to forward slashes
          content,
          type: path.extname(fileName).slice(1) || "text",
        });
      } catch (error) {
        console.warn(`Error reading file ${fileName}:`, error);
      }
    }
  }

  return result;
}

// Helper function to discover all voltagent relevant files in an example
async function discoverExampleFiles(examplePath: string): Promise<string[]> {
  const files = new Set<string>();

  // Original hardcoded key files (maintain backwards compatibility)
  const keyFiles = [
    "package.json",
    "README.md",
    "src/index.ts",
    "src/index.js",
    "index.ts",
    "index.js",
  ];

  for (const file of keyFiles) {
    if (await fileExists(path.join(examplePath, file))) {
      files.add(file);
    }
  }

  // Helper function to recursively find .ts files in a directory with depth limit
  const findTsFiles = async (
    dirPath: string,
    relativePath = "",
    currentDepth = 0,
  ): Promise<void> => {
    if (currentDepth >= 4 || !(await fileExists(dirPath))) return;

    try {
      const items = await fs.promises.readdir(dirPath, { withFileTypes: true });

      for (const item of items) {
        const itemPath = path.join(dirPath, item.name);
        const relativeItemPath = relativePath ? path.join(relativePath, item.name) : item.name;

        if (item.isDirectory()) {
          // Recursively search subdirectories with depth tracking (sequential)
          await findTsFiles(itemPath, relativeItemPath, currentDepth + 1);
        } else if (item.isFile() && item.name.endsWith(".ts")) {
          // Only include .ts files, Set handles deduplication automatically
          files.add(relativeItemPath.replace(/\\/g, "/"));
        }
      }
    } catch (error) {
      console.warn(`Error reading directory ${dirPath}:`, error);
    }
  };

  // Apply glob patterns sequentially: src/*.ts and src/**/*.ts
  await findTsFiles(path.join(examplePath, "src"), "src");

  // Apply glob pattern: app/**/*.ts
  await findTsFiles(path.join(examplePath, "app"), "app");

  // Apply glob pattern: voltagent/*.ts
  await findTsFiles(path.join(examplePath, "voltagent"), "voltagent");

  return [...files];
}

// Utility function for async file existence check
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.promises.access(filePath);
    return true;
  } catch {
    return false;
  }
}

// Helper function to list examples
async function listExamples(examplesPath: string, category?: string): Promise<ExampleInfo[]> {
  const examples: ExampleInfo[] = [];

  if (!fs.existsSync(examplesPath)) {
    return examples;
  }

  const items = fs.readdirSync(examplesPath, { withFileTypes: true });

  for (const item of items) {
    if (item.isDirectory()) {
      const examplePath = path.join(examplesPath, item.name);

      try {
        const packageJsonPath = path.join(examplePath, "package.json");

        let description = "";
        let technologies: string[] = [];
        let exampleCategory = "general";

        if (fs.existsSync(packageJsonPath)) {
          const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
          description = packageJson.description || `VoltAgent example: ${item.name}`;

          const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
          technologies = Object.keys(deps);

          // Categorize based on name or dependencies
          if (item.name.includes("voice")) exampleCategory = "voice";
          else if (
            item.name.includes("ai") ||
            item.name.includes("anthropic") ||
            item.name.includes("openai")
          )
            exampleCategory = "ai";
          else if (
            item.name.includes("database") ||
            item.name.includes("postgres") ||
            item.name.includes("supabase")
          )
            exampleCategory = "database";
          else if (item.name.includes("nextjs") || item.name.includes("vercel"))
            exampleCategory = "web";
          else if (item.name.includes("mcp")) exampleCategory = "mcp";
          else if (item.name.includes("tool")) exampleCategory = "tools";
        }

        // Filter by category if specified
        if (
          !category ||
          exampleCategory.includes(category.toLowerCase()) ||
          item.name.toLowerCase().includes(category.toLowerCase())
        ) {
          examples.push({
            name: item.name,
            description,
            technologies,
            category: exampleCategory,
          });
        }
      } catch (error) {
        console.warn(`Error processing example ${item.name}:`, error);
      }
    }
  }

  return examples.sort((a, b) => a.name.localeCompare(b.name));
}

// Helper function to list package changelogs
async function listPackageChangelogs(
  packagesPath: string,
): Promise<
  Array<{ packageName: string; hasChangelog: boolean; lastModified?: string; size?: number }>
> {
  const packages: Array<{
    packageName: string;
    hasChangelog: boolean;
    lastModified?: string;
    size?: number;
  }> = [];

  if (!fs.existsSync(packagesPath)) {
    return packages;
  }

  const items = fs.readdirSync(packagesPath, { withFileTypes: true });

  for (const item of items) {
    if (item.isDirectory()) {
      const changelogPath = path.join(packagesPath, item.name, "CHANGELOG.md");
      const hasChangelog = fs.existsSync(changelogPath);

      let lastModified: string | undefined;
      let size: number | undefined;

      if (hasChangelog) {
        try {
          const stats = fs.statSync(changelogPath);
          lastModified = stats.mtime.toISOString();
          size = stats.size;
        } catch {
          // Continue without stats
        }
      }

      packages.push({
        packageName: item.name,
        hasChangelog,
        lastModified,
        size,
      });
    }
  }

  return packages.sort((a, b) => a.packageName.localeCompare(b.packageName));
}

// Helper function to parse changelog entries
function parseChangelogEntries(
  content: string,
  maxEntries: number,
): Array<{ version: string; date?: string; changes: string[]; content: string }> {
  const entries: Array<{ version: string; date?: string; changes: string[]; content: string }> = [];
  const lines = content.split("\n");
  let currentEntry: { version: string; date?: string; changes: string[]; content: string } | null =
    null;
  let currentSection = "";

  for (const line of lines) {
    // Match version headers like ## [1.0.0] - 2023-12-01 or ## 1.0.0
    const versionMatch = line.match(
      /^##\s*(?:\[)?([0-9]+\.[0-9]+\.[0-9]+(?:-[a-zA-Z0-9.-]+)?)\]?\s*(?:-\s*(\d{4}-\d{2}-\d{2}))?/,
    );

    if (versionMatch) {
      // Save previous entry if exists
      if (currentEntry) {
        entries.push({
          ...currentEntry,
          content: currentEntry.content.trim(),
        });

        if (entries.length >= maxEntries) {
          break;
        }
      }

      // Start new entry
      currentEntry = {
        version: versionMatch[1],
        date: versionMatch[2],
        changes: [],
        content: `${line}\n`,
      };
      currentSection = "";
    } else if (currentEntry) {
      currentEntry.content += `${line}\n`;

      // Track section headers like ### Added, ### Fixed, etc.
      const sectionMatch = line.match(/^###\s*(.+)/);
      if (sectionMatch) {
        currentSection = sectionMatch[1].toLowerCase();
      }

      // Track bullet points
      const bulletMatch = line.match(/^[-*]\s*(.+)/);
      if (bulletMatch) {
        const changeText = bulletMatch[1];
        const changeWithSection = currentSection ? `${currentSection}: ${changeText}` : changeText;
        currentEntry.changes.push(changeWithSection);
      }
    }
  }

  // Add the last entry
  if (currentEntry && entries.length < maxEntries) {
    entries.push({
      ...currentEntry,
      content: currentEntry.content.trim(),
    });
  }

  return entries;
}

// Helper function to search in changelogs
async function searchInChangelogs(
  packagesPath: string,
  query: string,
  packages?: string[],
): Promise<
  Array<{
    packageName: string;
    version: string;
    date?: string;
    matchedContent: string;
    context: string;
  }>
> {
  const results: Array<{
    packageName: string;
    version: string;
    date?: string;
    matchedContent: string;
    context: string;
  }> = [];

  if (!fs.existsSync(packagesPath)) {
    return results;
  }

  const items = fs.readdirSync(packagesPath, { withFileTypes: true });
  const lowercaseQuery = query.toLowerCase();

  for (const item of items) {
    if (item.isDirectory()) {
      // Skip if specific packages are requested and this isn't one of them
      if (packages && !packages.includes(item.name)) {
        continue;
      }

      const changelogPath = path.join(packagesPath, item.name, "CHANGELOG.md");

      if (fs.existsSync(changelogPath)) {
        try {
          const content = fs.readFileSync(changelogPath, "utf-8");
          const entries = parseChangelogEntries(content, 50); // Parse more entries for search

          for (const entry of entries) {
            const entryContent = entry.content.toLowerCase();

            if (entryContent.includes(lowercaseQuery)) {
              // Find the specific match context
              const lines = entry.content.split("\n");
              let matchedContent = "";
              let context = "";

              for (const line of lines) {
                if (line.toLowerCase().includes(lowercaseQuery)) {
                  matchedContent = line.trim();
                  break;
                }
              }

              // Get some context around the match
              const contextLines = lines.slice(0, Math.min(lines.length, 5));
              context = contextLines.join("\n").trim();

              results.push({
                packageName: item.name,
                version: entry.version,
                date: entry.date,
                matchedContent,
                context,
              });
            }
          }
        } catch (error) {
          console.warn(`Error reading changelog for ${item.name}:`, error);
        }
      }
    }
  }

  return results.sort((a, b) => {
    // Sort by package name first, then by version (newest first)
    if (a.packageName !== b.packageName) {
      return a.packageName.localeCompare(b.packageName);
    }
    return b.version.localeCompare(a.version);
  });
}

// Export all tools as an array for easy consumption
export const voltAgentDocsTools = [
  searchDocumentationTool,
  getDocumentationTool,
  listDocumentationTool,
  searchExamplesTool,
  getExampleTool,
  listExamplesTool,
  listChangelogsTool,
  getChangelogTool,
  searchChangelogsTool,
];
