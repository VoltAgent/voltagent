const blogPluginExports = require("@docusaurus/plugin-content-blog");
const utils = require("@docusaurus/utils");
const path = require("node:path");
const fs = require("node:fs");

const defaultBlogPlugin = blogPluginExports.default;

// Helper function to find similar MCPs based on category
function getSimilarMcps(allMcps, metadata) {
  const otherMcps = allMcps.filter((mcp) => mcp.metadata.id !== metadata.id);

  const similarByCategory = otherMcps.filter((mcp) => {
    const mcpCategory = mcp.metadata.category;
    return mcpCategory === metadata.category;
  });

  let similar;

  if (similarByCategory.length > 3) {
    similar = similarByCategory.sort(() => Math.random() - 0.5).slice(0, 3);
  } else {
    similar = similarByCategory;
    const remainingCount = 3 - similarByCategory.length;

    if (remainingCount > 0) {
      const randomMcps = otherMcps
        .filter((mcp) => !similarByCategory.includes(mcp))
        .sort(() => Math.random() - 0.5)
        .slice(0, remainingCount);

      similar = [...similar, ...randomMcps];
    }
  }

  return similar.map((mcp) => ({
    ...mcp.metadata,
    name: mcp.metadata.name,
    id: mcp.metadata.id,
    title: mcp.metadata.title,
    slug: mcp.metadata.slug,
    description: mcp.metadata.description,
    short_description: mcp.metadata.short_description,
    category: mcp.metadata.category,
    logoKey: mcp.metadata.logoKey,
  }));
}

// Read and parse JSON files from the data directory
function loadMcpData() {
  const dataDir = path.join(
    process.cwd(),
    "src",
    "components",
    "mcp-list",
    "data",
  );
  const mcps = [];

  try {
    const files = fs
      .readdirSync(dataDir)
      .filter((file) => file.endsWith(".json"));

    files.forEach((file) => {
      const filePath = path.join(dataDir, file);
      const fileContent = fs.readFileSync(filePath, "utf8");
      const jsonData = JSON.parse(fileContent);

      if (Array.isArray(jsonData)) {
        mcps.push(
          ...jsonData.map((item) => ({
            metadata: {
              ...item,
              id: item.id || `mcp-${Math.random().toString(36).substr(2, 9)}`,
              slug: item.slug,
              title: item.title,
              name: item.name,
              description: item.description,
              short_description: item.short_description,
              category: item.category,
              logoKey: item.logoKey,
            },
            data: item,
          })),
        );
      } else if (jsonData.total_tools) {
        mcps.push({
          metadata: {
            ...jsonData,
            id: `special-${path.basename(file, ".json")}`,
            slug: jsonData.slug,
            title: jsonData.title,
            name: jsonData.name || path.basename(file, ".json"),
            description: jsonData.description || "",
            short_description: jsonData.short_description || "",
            category: jsonData.category || "Other",
            logoKey: jsonData.logoKey || path.basename(file, ".json"),
          },
          data: jsonData,
        });
      }
    });
  } catch (error) {
    console.error("Error loading MCP data:", error);
  }

  return mcps;
}

async function mcpPluginExtended(...pluginArgs) {
  const blogPluginInstance = await defaultBlogPlugin(...pluginArgs);

  return {
    ...blogPluginInstance,
    name: "docusaurus-plugin-content-mcp",

    contentLoaded: async (data) => {
      const { actions } = data;
      const { addRoute, createData } = actions;

      const allMcps = loadMcpData();

      await Promise.all(
        allMcps.map(async (mcp) => {
          const { metadata } = mcp;

          const similarMcps = getSimilarMcps(allMcps, metadata);

          const dataPath = await createData(
            `${utils.docuHash(metadata.id)}.json`,
            JSON.stringify(
              { ...metadata, similarMcps, data: mcp.data },
              null,
              2,
            ),
          );

          addRoute({
            path: `/mcp/${metadata.slug}`,
            component: "@theme/McpItemPage",
            exact: true,
            modules: {
              content: dataPath,
            },
          });
        }),
      );

      const mcpListData = await createData(
        "mcp-list.json",
        JSON.stringify(
          allMcps.map((mcp) => ({
            metadata: mcp.metadata,
            data: mcp.data,
          })),
        ),
      );

      addRoute({
        path: "/mcp",
        component: "@theme/McpListPage",
        exact: true,
        modules: {
          items: mcpListData,
        },
      });

      const categories = {};
      allMcps.forEach((mcp) => {
        const category = mcp.metadata.category;
        if (category) {
          categories[category] = categories[category] || [];
          categories[category].push(mcp);
        }
      });

      const categoriesListData = await createData(
        "categories-list.json",
        JSON.stringify(
          Object.entries(categories).map(([category, items]) => ({
            name: category,
            count: items.length,
            permalink: `/mcp/categories/${category.toLowerCase()}/`,
            items: items.map((mcp) => ({
              metadata: mcp.metadata,
              data: mcp.data,
            })),
          })),
        ),
      );

      addRoute({
        path: "/mcp/categories/",
        component: "@theme/McpCategoriesListPage",
        exact: true,
        modules: {
          categories: categoriesListData,
        },
      });

      await Promise.all(
        Object.entries(categories).map(async ([category, items]) => {
          const fileName = `mcp-category-${category.toLowerCase()}.json`;
          const categoryData = await createData(
            fileName,
            JSON.stringify(
              items.map((mcp) => ({
                metadata: mcp.metadata,
                data: mcp.data,
              })),
            ),
          );

          addRoute({
            path: `/mcp/categories/${category.toLowerCase()}/`,
            component: "@theme/McpListPage",
            exact: true,
            modules: {
              items: categoryData,
            },
          });
        }),
      );
    },
  };
}

module.exports = {
  ...blogPluginExports,
  default: mcpPluginExtended,
};
