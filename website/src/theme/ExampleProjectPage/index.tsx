import Head from "@docusaurus/Head";
import Link from "@docusaurus/Link";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import CodeBlock from "@theme/CodeBlock";
import Layout from "@theme/Layout";
import { motion } from "framer-motion";
import React from "react";
import ReactMarkdown from "react-markdown";
import { DotPattern } from "../../components/ui/dot-pattern";

interface ExampleProjectPageProps {
  example: {
    id: number;
    slug: string;
    title: string;
    description: string;
    tags?: string[];
    content: string;
    published?: boolean;
  };
}

export default function ExampleProjectPage({ example }: ExampleProjectPageProps): JSX.Element {
  if (!example) {
    return (
      <Layout>
        <Head>
          <title>Example Not Found - VoltAgent Examples</title>
          <meta name="description" content="The requested example could not be found." />
        </Head>
        <main className="flex-1 min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-400 mb-4">Example Not Found</h1>
            <Link to="/examples" className="text-[#00d992] hover:underline no-underline">
              Back to Examples
            </Link>
          </div>
        </main>
      </Layout>
    );
  }

  const seoTitle = `${example.title} - VoltAgent Example | TypeScript AI Framework`;
  const seoDescription = `${example.description} - Learn how to build this with VoltAgent. Complete code example with installation and usage instructions.`;

  return (
    <Layout>
      <Head>
        <title>{seoTitle}</title>
        <meta name="description" content={seoDescription} />
        <meta
          name="keywords"
          content={`VoltAgent, ${example.title}, example, ${example.tags?.join(
            ", ",
          )}, TypeScript, AI agents, tutorial`}
        />
        <meta property="og:title" content={`${example.title} - VoltAgent Example`} />
        <meta property="og:description" content={seoDescription} />
        <meta property="og:type" content="article" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={`${example.title} - VoltAgent Example`} />
        <meta name="twitter:description" content={seoDescription} />
      </Head>
      <main className="flex-1">
        <DotPattern dotColor="#94a3b8" dotSize={1.2} spacing={20} />

        <section className="relative py-20">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 md:px-8">
            {/* Back Button */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
              className="mb-8"
            >
              <Link
                to="/examples"
                className="flex items-center text-gray-400 hover:text-[#00d992] transition-colors no-underline text-sm sm:text-base"
              >
                <ArrowLeftIcon className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                Back to Examples
              </Link>
            </motion.div>

            {/* Example Header */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="mb-8"
            >
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#00d992] mb-4">
                {example.title}
              </h1>
              <p className="text-gray-400 text-base sm:text-lg">{example.description}</p>
              {example.tags && example.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {example.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-3 py-1 bg-gray-800/50 text-gray-300 text-sm rounded-full border border-gray-700"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </motion.div>

            {/* Markdown Content */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <div>
                <ReactMarkdown
                  components={{
                    h2: ({ children }) => (
                      <h2 className="text-2xl font-bold text-white mt-8 mb-4">{children}</h2>
                    ),
                    h3: ({ children }) => (
                      <h3 className="text-xl font-bold text-white mt-6 mb-3">{children}</h3>
                    ),
                    p: ({ children }) => (
                      <p className="text-gray-300 mb-4 leading-relaxed">{children}</p>
                    ),
                    a: ({ href, children }) => (
                      <a
                        href={href}
                        target={href?.startsWith("http") ? "_blank" : undefined}
                        rel={href?.startsWith("http") ? "noopener noreferrer" : undefined}
                        className="text-[#00d992] hover:text-[#00c182] underline"
                      >
                        {children}
                      </a>
                    ),
                    ul: ({ children }) => (
                      <ul className="list-disc list-inside space-y-2 mb-4 text-gray-300">
                        {children}
                      </ul>
                    ),
                    ol: ({ children }) => (
                      <ol className="list-decimal list-inside space-y-2 mb-4 text-gray-300">
                        {children}
                      </ol>
                    ),
                    li: ({ children }) => <li className="text-gray-300">{children}</li>,
                    blockquote: ({ children }) => (
                      <blockquote className="border-l-4 border-[#00d992] pl-4 py-2 my-4 text-gray-400 italic">
                        {children}
                      </blockquote>
                    ),
                    code: ({ className, children, ...props }: any) => {
                      const match = /language-(\w+)/.exec(className || "");
                      const language = match ? match[1] : "";
                      const isInline = !className;

                      if (!isInline && language) {
                        return (
                          <CodeBlock language={language} className="my-6">
                            {String(children).replace(/\n$/, "")}
                          </CodeBlock>
                        );
                      }

                      return (
                        <code
                          className="px-1.5 py-0.5 bg-gray-800 text-[#00d992] rounded text-sm"
                          {...props}
                        >
                          {children}
                        </code>
                      );
                    },
                    pre: ({ children }: any) => {
                      // Pre elementi için özel render, sadece children'ı döndür
                      return <>{children}</>;
                    },
                  }}
                >
                  {example.content}
                </ReactMarkdown>
              </div>
            </motion.div>

            {/* Call to Action */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="mt-12"
            >
              <div
                className="border-solid bg-white/5 border-[#1e293b]/40 border-2 rounded-lg p-6"
                style={{
                  backdropFilter: "blur(4px)",
                  WebkitBackdropFilter: "blur(4px)",
                }}
              >
                <h3 className="text-lg font-bold text-[#00d992] mb-3">
                  Ready to Build Your Own AI Agent?
                </h3>
                <p className="text-gray-400 mb-4 text-sm">
                  Start building powerful AI agents with VoltAgent's TypeScript-native framework.
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <a
                    href="/docs/"
                    className="flex-1 text-center px-4 py-2 bg-emerald-400/10 text-emerald-400 border-solid border-emerald-400/20 font-semibold rounded-lg transition-colors hover:bg-emerald-400/20 no-underline text-sm"
                  >
                    View Documentation
                  </a>
                  <a
                    href="https://github.com/voltagent/voltagent"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 text-center px-4 py-2 bg-gray-800/50 text-gray-300 border-solid border-gray-600 font-semibold rounded-lg transition-colors hover:bg-gray-700/50 no-underline text-sm"
                  >
                    View on GitHub
                  </a>
                </div>
              </div>
            </motion.div>
          </div>
        </section>
      </main>
    </Layout>
  );
}
