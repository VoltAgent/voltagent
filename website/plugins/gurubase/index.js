module.exports = (context) => ({
  name: "docusaurus-plugin-gurubase-widget", // Feel free to change this name
  injectHtmlTags() {
    return {
      postBodyTags: [
        {
          tagName: "script",
          innerHTML: `
                (function() {
                  // Configuration options: https://github.com/Gurubase/gurubase-widget
                  // Only activate on docs endpoint
                  if (window.location.pathname.startsWith('/docs/')) {
                    const script = document.createElement('script');
                    script.src = "https://widget.gurubase.io/widget.latest.min.js";
                    script.setAttribute("data-widget-id", "nOtwLZ6c3y2LJH7SGQ3YzrXBr40WJzTU-GghkMBr84Q");
                    script.setAttribute("data-text", "Ask AI");
                    script.setAttribute("data-margins", '{"bottom": "20px", "right": "20px"}');
                    script.setAttribute("data-light-mode", "auto");
                    script.setAttribute("data-overlap-content", "true");
                    script.setAttribute("defer", "true");
                    script.id = "guru-widget-id";
                    document.body.appendChild(script);
                  }
                })();
              `,
        },
      ],
    };
  },
});
