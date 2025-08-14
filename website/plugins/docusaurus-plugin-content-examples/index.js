const path = require("node:path");
const fs = require("node:fs");

function loadExamples(contentPath) {
  const examplesFilePath = path.join(contentPath, "examples.json");

  if (!fs.existsSync(examplesFilePath)) {
    throw new Error(`Examples file not found at ${examplesFilePath}`);
  }

  const examplesData = JSON.parse(fs.readFileSync(examplesFilePath, "utf8"));

  return examplesData.map((example) => ({
    id: example.id,
    metadata: {
      ...example,
      permalink: `/examples/${example.slug}`,
    },
  }));
}

async function examplesPluginExtended(context, options) {
  const { siteDir } = context;
  const { contentPath = "src/components/examples" } = options;

  const contentDir = path.resolve(siteDir, contentPath);

  return {
    name: "docusaurus-plugin-content-examples",

    async loadContent() {
      const examples = loadExamples(contentDir);
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
          publishedExamples.map((e) => e.metadata),
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
          const { metadata } = example;

          const exampleDataPath = await createData(
            `example-${example.id}.json`,
            JSON.stringify(metadata, null, 2),
          );

          addRoute({
            path: metadata.permalink,
            component: "@theme/ExampleProjectPage",
            exact: true,
            modules: {
              example: exampleDataPath,
            },
          });
        }),
      );
    },

    getPathsToWatch() {
      return [path.join(contentDir, "examples.json")];
    },
  };
}

module.exports = examplesPluginExtended;
