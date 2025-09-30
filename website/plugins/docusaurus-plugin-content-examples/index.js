const path = require("node:path");
const fs = require("node:fs").promises;
const matter = require("gray-matter");
const { aliasedSitePath } = require("@docusaurus/utils");

async function loadExamples(contentPath, siteDir) {
  try {
    const files = await fs.readdir(contentPath);
    const mdFiles = files.filter((file) => file.endsWith(".md") || file.endsWith(".mdx"));

    const examples = await Promise.all(
      mdFiles.map(async (file) => {
        const filePath = path.join(contentPath, file);
        const content = await fs.readFile(filePath, "utf8");
        const { data: frontMatter } = matter(content);

        return {
          id: frontMatter.id || file.replace(/\.mdx?$/, ""),
          metadata: {
            ...frontMatter,
            permalink: `/examples/agents/${frontMatter.slug || file.replace(/\.mdx?$/, "")}`,
            fileName: file,
            repository: frontMatter.repository,
          },
          source: aliasedSitePath(filePath, siteDir),
        };
      }),
    );

    return examples.sort((a, b) => (a.metadata.id || 0) - (b.metadata.id || 0));
  } catch (error) {
    console.error("Error loading examples:", error);
    return [];
  }
}

async function examplesPluginExtended(context, options) {
  const { siteDir, siteConfig } = context;
  const { contentPath = "examples" } = options;

  const contentDir = path.resolve(siteDir, contentPath);

  return {
    name: "docusaurus-plugin-content-examples",

    async loadContent() {
      const examples = await loadExamples(contentDir, siteDir);
      return {
        examples,
      };
    },

    contentLoaded: async ({ content, actions }) => {
      const { addRoute, createData } = actions;
      const { examples } = content;

      // Create examples list page - only include published examples
      const publishedExamples = examples.filter((example) => example.metadata.published !== false);
      const examplesListPath = await createData(
        "examples-list.json",
        JSON.stringify(
          publishedExamples.map((e) => ({
            ...e.metadata,
          })),
          null,
          2,
        ),
      );

      addRoute({
        path: "/examples",
        component: "@theme/ExampleListPage",
        exact: true,
        modules: {
          examples: examplesListPath,
        },
      });

      // Create individual example pages using slug
      await Promise.all(
        examples.map(async (example) => {
          const { metadata, source } = example;

          const exampleDataPath = await createData(
            `example-${example.id}.json`,
            JSON.stringify({ ...metadata }, null, 2),
          );

          addRoute({
            path: metadata.permalink,
            component: "@theme/ExampleProjectPage",
            exact: true,
            modules: {
              example: exampleDataPath,
              content: source,
            },
          });
        }),
      );
    },

    configureWebpack() {
      const staticDirs = (siteConfig.staticDirectories || []).map((dir) =>
        path.resolve(siteDir, dir),
      );

      return {
        module: {
          rules: [
            {
              test: /\.mdx?$/i,
              include: [contentDir],
              use: [
                {
                  loader: require.resolve("@docusaurus/mdx-loader"),
                  options: {
                    siteDir,
                    staticDirs,
                    markdownConfig: siteConfig.markdown,
                  },
                },
              ],
            },
          ],
        },
      };
    },

    getPathsToWatch() {
      return [`${contentDir}/**/*.{md,mdx}`];
    },
  };
}

module.exports = examplesPluginExtended;
