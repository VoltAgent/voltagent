async function ahrefsAnalytics() {
  return {
    name: "docusaurus-plugin-ahrefs",
    injectHtmlTags() {
      return {
        headTags: [
          {
            tagName: "script",
            attributes: {
              src: "https://analytics.ahrefs.com/analytics.js",
              "data-key": "a1KC+Qlh067pBuO4o78nxQ",
              async: true,
            },
          },
        ],
      };
    },
  };
}
exports.default = ahrefsAnalytics;
