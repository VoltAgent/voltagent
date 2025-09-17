const path = require("node:path");
const fs = require("node:fs");

function loadUseCases(contentPath) {
  const useCasesFilePath = path.join(contentPath, "usecases.json");

  if (!fs.existsSync(useCasesFilePath)) {
    throw new Error(`Use cases file not found at ${useCasesFilePath}`);
  }

  const useCasesData = JSON.parse(fs.readFileSync(useCasesFilePath, "utf8"));

  return useCasesData.map((useCase) => ({
    id: useCase.id,
    metadata: {
      ...useCase,
      permalink: `/use-cases/${useCase.slug}`,
    },
  }));
}

async function useCasesPluginExtended(context, options) {
  const { siteDir } = context;
  const { contentPath = "src/components/usecases" } = options;

  const contentDir = path.resolve(siteDir, contentPath);

  return {
    name: "docusaurus-plugin-content-usecases",

    async loadContent() {
      const useCases = loadUseCases(contentDir);
      return {
        useCases,
      };
    },

    contentLoaded: async ({ content, actions }) => {
      const { addRoute, createData } = actions;
      const { useCases } = content;

      // Create individual use case pages using slug
      await Promise.all(
        useCases.map(async (useCase) => {
          const { metadata } = useCase;

          const useCaseDataPath = await createData(
            `usecase-${useCase.id}.json`,
            JSON.stringify(metadata, null, 2),
          );

          addRoute({
            path: metadata.permalink,
            component: "@theme/UseCasePage",
            exact: true,
            modules: {
              useCase: useCaseDataPath,
            },
          });
        }),
      );
    },

    getPathsToWatch() {
      return [path.join(contentDir, "usecases.json")];
    },
  };
}

module.exports = useCasesPluginExtended;
