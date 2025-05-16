import React, { useEffect, useRef, useState, type FC } from "react";
import mermaid from "mermaid";
import Panzoom from "@panzoom/panzoom";

interface ZoomableMermaidProps {
  chart: string;
}

// Helper to ensure SVG has an ID for Panzoom
const ensureSvgId = (
  svgContainer: HTMLElement,
  baseId: string,
): string | null => {
  const svgElement = svgContainer.querySelector("svg");
  if (svgElement) {
    if (!svgElement.id) {
      svgElement.id = `${baseId}-svg-element`;
    }
    return svgElement.id;
  }
  return null;
};

const ZoomableMermaid: FC<ZoomableMermaidProps> = ({ chart }) => {
  const svgContainerRef = useRef<HTMLDivElement>(null);
  // Use a more robust way to generate a unique ID or pass it as a prop if needed for SSR
  const [mermaidRenderId] = useState(
    () => `mermaid-render-${Math.random().toString(36).substring(2, 9)}`,
  );
  const [panzoomSvgId, setPanzoomSvgId] = useState<string | null>(null);

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: "loose",
      theme: "default",
      // Mermaid theme can be 'dark' or 'light' based on Docusaurus theme
      // const currentTheme = document.documentElement.getAttribute('data-theme');
      // theme: currentTheme === 'dark' ? 'dark' : 'default',
    });
  }, []);

  useEffect(() => {
    if (chart && svgContainerRef.current) {
      // Clear previous render to avoid ID clashes or stale content
      svgContainerRef.current.innerHTML = "";
      try {
        // Mermaid's render function inserts the SVG into the provided element directly
        // and returns the SVG code as a string.
        mermaid
          .render(mermaidRenderId, chart)
          .then(({ svg, bindFunctions }) => {
            if (svgContainerRef.current) {
              svgContainerRef.current.innerHTML = svg;
              const actualSvgId = ensureSvgId(
                svgContainerRef.current,
                mermaidRenderId,
              );
              if (actualSvgId) {
                setPanzoomSvgId(actualSvgId);
                if (bindFunctions) {
                  // bindFunctions expects the SVG element itself, not the container
                  const svgElement =
                    svgContainerRef.current.querySelector("svg");
                  if (svgElement) {
                    bindFunctions(svgElement);
                  }
                }
              }
            }
          })
          .catch((error) => {
            console.error("Mermaid rendering error:", error);
            if (svgContainerRef.current) {
              svgContainerRef.current.innerHTML = `<p style="color: red;">Error rendering diagram. Check console. Details: ${
                error.message || error
              }</p>`;
            }
          });
      } catch (error) {
        // Catch synchronous errors from mermaid.render if any (though it returns a promise)
        console.error("Synchronous Mermaid rendering error:", error);
        if (svgContainerRef.current) {
          svgContainerRef.current.innerHTML = `<p style="color: red;">Error preparing diagram. Check console. Details: ${
            error.message || error
          }</p>`;
        }
      }
    }
    return () => {
      // Cleanup if the component unmounts or chart changes before rendering finishes
      // This might be too aggressive if mermaid.render is quick
      // but can prevent updates to unmounted components.
      // if (svgContainerRef.current) {
      //   svgContainerRef.current.innerHTML = '';
      // }
    };
  }, [chart, mermaidRenderId]);

  useEffect(() => {
    if (panzoomSvgId && svgContainerRef.current) {
      const svgElement = svgContainerRef.current.querySelector(
        `svg#${panzoomSvgId}`,
      );

      if (svgElement) {
        const panzoomInstance = Panzoom(svgElement as SVGElement, {
          maxScale: 7,
          minScale: 0.3,
          contain: "outside",
          canvas: true, // Recommended for SVG to improve rendering performance
        });

        const wheelListener = (event: WheelEvent) => {
          if (!event.shiftKey) {
            event.preventDefault(); // Prevent page scroll if zooming
            panzoomInstance.zoomWithWheel(event);
          }
        };

        // Panzoom works better if attached to the parent of the panzoom'd element for wheel events
        const parentElement = svgElement.parentElement;
        parentElement?.addEventListener("wheel", wheelListener, {
          passive: false,
        });

        return () => {
          panzoomInstance.destroy();
          parentElement?.removeEventListener("wheel", wheelListener);
        };
      }
    }
  }, [panzoomSvgId]);

  // Provide a unique key to the div if chart changes to help React with re-renders,
  // though useEffect dependencies should handle this.
  // The container for mermaid to render into, distinct from mermaidRenderId which is for the render call.
  return (
    <div
      ref={svgContainerRef}
      key={mermaidRenderId}
      style={{
        width: "100%",
        height: "auto",
        minHeight: "150px",
        cursor: "grab",
      }}
    />
  );
};

export default ZoomableMermaid;
