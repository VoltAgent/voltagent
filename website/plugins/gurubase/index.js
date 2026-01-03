module.exports = (_context) => ({
  name: "docusaurus-plugin-gurubase-widget",
  injectHtmlTags() {
    return {
      postBodyTags: [
        {
          tagName: "script",
          innerHTML: `
                (function() {
                  // Configuration options: https://github.com/Gurubase/gurubase-widget
                  // Only activate on docs endpoint
                  var widgetInitialized = false;

                  function initWidget() {
                    if (widgetInitialized) return;
                    if (!window.location.pathname.startsWith('/docs/')) return;

                    var existingScript = document.getElementById('guru-widget-id');
                    if (existingScript) return;

                    var script = document.createElement('script');
                    script.src = "https://widget.gurubase.io/widget.latest.min.js";
                    script.setAttribute("data-widget-id", "nOtwLZ6c3y2LJH7SGQ3YzrXBr40WJzTU-GghkMBr84Q");
                    script.setAttribute("data-text", "Ask AI");
                    script.setAttribute("data-margins", '{"bottom": "20px", "right": "20px"}');
                    script.setAttribute("data-light-mode", "auto");
                    script.setAttribute("data-overlap-content", "true");
                    script.setAttribute("defer", "true");
                    script.id = "guru-widget-id";
                    document.body.appendChild(script);
                    widgetInitialized = true;
                  }

                  function destroyWidget() {
                    if (!widgetInitialized) return;

                    // Use widget's destroy method if available (future-proof)
                    if (window.chatWidget && typeof window.chatWidget.destroy === 'function') {
                      window.chatWidget.destroy();
                    }

                    // Remove the script tag
                    var script = document.getElementById('guru-widget-id');
                    if (script) script.remove();

                    // Remove widget instance
                    if (window.chatWidget) {
                      delete window.chatWidget;
                    }
                    if (window.ChatWidget) {
                      delete window.ChatWidget;
                    }

                    // Remove all widget-related DOM elements
                    // The widget creates elements with these patterns
                    var selectors = [
                      '#guru-widget-id',                    // The script tag
                      '#gurubase-chat-widget-container'     // The widget container
                    ];
                    
                    selectors.forEach(function(selector) {
                      try {
                        document.querySelectorAll(selector).forEach(function(el) {
                          el.remove();
                        });
                      } catch (e) {}
                    });

                    widgetInitialized = false;
                  }

                  function handleRouteChange() {
                    if (window.location.pathname.startsWith('/docs/')) {
                      initWidget();
                    } else {
                      destroyWidget();
                    }
                  }

                  // Check on initial page load
                  handleRouteChange();

                  // Hook into History API for SPA client-side navigation
                  var originalPushState = history.pushState;
                  history.pushState = function() {
                    originalPushState.apply(this, arguments);
                    setTimeout(handleRouteChange, 0);
                  };

                  var originalReplaceState = history.replaceState;
                  history.replaceState = function() {
                    originalReplaceState.apply(this, arguments);
                    setTimeout(handleRouteChange, 0);
                  };

                  // Handle browser back/forward buttons
                  window.addEventListener('popstate', function() {
                    setTimeout(handleRouteChange, 0);
                  });
                })();
              `,
        },
      ],
    };
  },
});
