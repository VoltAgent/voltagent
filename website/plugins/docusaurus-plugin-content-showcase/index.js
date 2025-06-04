const path = require("node:path");
const fs = require("node:fs");

function loadProjects(contentPath) {
  const projectsFilePath = path.join(contentPath, "projects.json");

  if (!fs.existsSync(projectsFilePath)) {
    throw new Error(`Projects file not found at ${projectsFilePath}`);
  }

  const projectsData = JSON.parse(fs.readFileSync(projectsFilePath, "utf8"));

  return projectsData.map((project) => ({
    id: project.id,
    metadata: {
      ...project,
      permalink: `/showcase/${project.slug}`,
    },
  }));
}

async function showcasePluginExtended(context, options) {
  const { siteDir } = context;
  const { contentPath = "src/components/showcase" } = options;

  const contentDir = path.resolve(siteDir, contentPath);

  return {
    name: "docusaurus-plugin-content-showcase",

    async loadContent() {
      const projects = loadProjects(contentDir);
      return {
        projects,
      };
    },

    contentLoaded: async ({ content, actions }) => {
      const { addRoute, createData } = actions;
      const { projects } = content;

      // Create showcase list page
      const showcaseListPath = await createData(
        "showcase-list.json",
        JSON.stringify(
          projects.map((p) => p.metadata),
          null,
          2,
        ),
      );

      addRoute({
        path: "/showcase",
        component: "@theme/ShowcaseListPage",
        exact: true,
        modules: {
          projects: showcaseListPath,
        },
      });

      // Create individual project pages using slug
      await Promise.all(
        projects.map(async (project) => {
          const { metadata } = project;

          const projectDataPath = await createData(
            `project-${project.id}.json`,
            JSON.stringify(metadata, null, 2),
          );

          addRoute({
            path: metadata.permalink,
            component: "@theme/ShowcaseProjectPage",
            exact: true,
            modules: {
              project: projectDataPath,
            },
          });
        }),
      );
    },

    getPathsToWatch() {
      return [path.join(contentDir, "projects.json")];
    },
  };
}

module.exports = showcasePluginExtended;
