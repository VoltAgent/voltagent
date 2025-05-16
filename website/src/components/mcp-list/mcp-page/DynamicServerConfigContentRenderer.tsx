import type React from "react";
import CodeBlock from "./CodeBlock"; // Import the extracted CodeBlock

// Define the structure for each content item
export interface ServerConfigContentItem {
  type: "heading" | "text" | "code";
  value: string;
  title?: string; // For code block captions or alternative heading text
  language?: string; // For code blocks
}

// Define props for the renderer component
interface DynamicServerConfigContentRendererProps {
  content: ServerConfigContentItem[];
  placeholders: Record<string, string>;
}

// Helper function to replace placeholders in a string
const replacePlaceholders = (
  text: string,
  placeholders: Record<string, string>,
): string => {
  let result = text;
  for (const key in placeholders) {
    result = result.replace(
      new RegExp(key.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&"), "g"),
      placeholders[key],
    );
  }
  return result;
};

const DynamicServerConfigContentRenderer: React.FC<
  DynamicServerConfigContentRendererProps
> = ({ content, placeholders }) => {
  if (!content || content.length === 0) {
    return (
      <p className="text-gray-400 text-sm my-2">
        Content not available for this configuration.
      </p>
    );
  }

  return (
    <>
      {content.map((item, index) => {
        const itemValue = replacePlaceholders(item.value, placeholders);
        const itemTitle = item.title
          ? replacePlaceholders(item.title, placeholders)
          : undefined;
        const key = `${item.type}-${index}-${itemValue.slice(0, 20)}`; // More unique key

        switch (item.type) {
          case "heading":
            return (
              <h3
                key={key}
                className="text-xl font-semibold text-white mt-6 mb-3"
              >
                {itemTitle || itemValue}{" "}
                {/* Use title if available, otherwise value for heading */}
              </h3>
            );
          case "text":
            return (
              <p
                key={key}
                className="text-gray-300 my-2 whitespace-pre-line text-sm leading-relaxed"
              >
                {itemValue}
              </p>
            );
          case "code":
            return (
              <div key={key} className="my-4">
                {itemTitle && (
                  <p className="text-gray-400 text-xs mb-1 font-mono">
                    {itemTitle}
                  </p>
                )}
                <CodeBlock code={itemValue} />
                {/* language prop for CodeBlock is not used by current CodeBlock, but kept in interface for future use */}
              </div>
            );
          default:
            return null;
        }
      })}
    </>
  );
};

export default DynamicServerConfigContentRenderer;
