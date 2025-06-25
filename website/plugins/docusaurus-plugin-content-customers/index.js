const path = require("node:path");
const fs = require("node:fs");

function loadCustomers(contentPath) {
  const customersFilePath = path.join(contentPath, "customers.json");

  if (!fs.existsSync(customersFilePath)) {
    throw new Error(`Customers file not found at ${customersFilePath}`);
  }

  const customersData = JSON.parse(fs.readFileSync(customersFilePath, "utf8"));

  return customersData.map((customer) => ({
    id: customer.id,
    metadata: {
      ...customer,
      permalink: `/customers/${customer.slug}`,
    },
  }));
}

async function customersPluginExtended(context, options) {
  const { siteDir } = context;
  const { contentPath = "src/components/customers" } = options;

  const contentDir = path.resolve(siteDir, contentPath);

  return {
    name: "docusaurus-plugin-content-customers",

    async loadContent() {
      const customers = loadCustomers(contentDir);
      return {
        customers,
      };
    },

    contentLoaded: async ({ content, actions }) => {
      const { addRoute, createData } = actions;
      const { customers } = content;

      // Create customers list page
      const customersListPath = await createData(
        "customers-list.json",
        JSON.stringify(
          customers.map((c) => c.metadata),
          null,
          2,
        ),
      );

      addRoute({
        path: "/customers",
        component: "@theme/CustomerListPage",
        exact: true,
        modules: {
          customers: customersListPath,
        },
      });

      // Create individual customer pages using slug
      await Promise.all(
        customers.map(async (customer) => {
          const { metadata } = customer;

          const customerDataPath = await createData(
            `customer-${customer.id}.json`,
            JSON.stringify(metadata, null, 2),
          );

          addRoute({
            path: metadata.permalink,
            component: "@theme/CustomerProjectPage",
            exact: true,
            modules: {
              customer: customerDataPath,
            },
          });
        }),
      );
    },

    getPathsToWatch() {
      return [path.join(contentDir, "customers.json")];
    },
  };
}

module.exports = customersPluginExtended;
