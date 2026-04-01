const path = require("node:path");

async function newYearModal() {
  return {
    name: "docusaurus-plugin-new-year-modal",
    getClientModules() {
      return [path.resolve(__dirname, "client.js")];
    },
  };
}

exports.default = newYearModal;
