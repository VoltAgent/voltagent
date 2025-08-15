import Head from "@docusaurus/Head";
import Link from "@docusaurus/Link";
import { ArrowLeftIcon, CodeBracketIcon, CommandLineIcon } from "@heroicons/react/24/outline";
import Layout from "@theme/Layout";
import { motion } from "framer-motion";
import React from "react";
import SyntaxHighlightedCode from "../../components/examples/SyntaxHighlightedCode";
import { DotPattern } from "../../components/ui/dot-pattern";

interface ExampleProjectPageProps {
  example: {
    id: number;
    slug: string;
    title: string;
    description: string;
    tags: string[];
    features?: string[];
    code: string;
    usage: {
      step: number;
      title: string;
      description?: string;
      commands: string[];
    }[];
    prompts?: string[];
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
              <div className="flex items-start justify-between gap-4 mb-4">
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#00d992]">
                  {example.title}
                </h1>
                <a
                  href={`https://github.com/voltagent/voltagent/tree/main/examples/${example.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 bg-gray-800/50 hover:bg-gray-700/50 border border-gray-600 rounded-lg transition-colors text-gray-300 hover:text-white text-sm font-medium no-underline"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                  </svg>
                  View on GitHub
                </a>
              </div>
              <p className="text-gray-400 text-base sm:text-lg">{example.description}</p>
            </motion.div>

            {/* Features */}
            {example.features && example.features.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="mb-8"
              >
                <div
                  className="border-solid bg-white/5 border-[#1e293b]/40 border-2 rounded-lg p-6"
                  style={{
                    backdropFilter: "blur(4px)",
                    WebkitBackdropFilter: "blur(4px)",
                  }}
                >
                  <p className="text-gray-300 text-sm sm:text-base mb-4">
                    Build an AI-powered recipe assistant that analyzes your available ingredients
                    and generates customized recipes. This agent uses MCP tools to search recipe
                    databases and provides complete cooking instructions tailored to your needs.
                  </p>
                  <p className="text-gray-400 text-sm sm:text-base font-semibold mb-3">
                    Try these prompts:
                  </p>
                  <ul className="space-y-2">
                    {example.prompts?.map((prompt) => (
                      <li key={prompt} className="flex items-start">
                        <span className="text-[#00d992] mr-2 mt-0.5">•</span>
                        <span className="text-gray-300 text-sm sm:text-base italic">
                          "{prompt}"
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            )}

            {/* Code */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="mb-8"
            >
              <div
                className="border-solid bg-white/5 border-[#1e293b]/40 border-2 rounded-lg overflow-hidden"
                style={{
                  backdropFilter: "blur(4px)",
                  WebkitBackdropFilter: "blur(4px)",
                }}
              >
                <div className="p-6">
                  <SyntaxHighlightedCode code={example.code} language="typescript" />
                </div>
              </div>
            </motion.div>

            {/* Usage */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="mb-8"
            >
              <div
                className="border-solid bg-white/5 border-[#1e293b]/40 border-2 rounded-lg overflow-hidden"
                style={{
                  backdropFilter: "blur(4px)",
                  WebkitBackdropFilter: "blur(4px)",
                }}
              >
                <div className="px-6 py-4 border-b border-[#1e293b]/40">
                  <h2 className="text-lg sm:text-xl font-bold text-white flex items-center">
                    <CommandLineIcon className="w-5 h-5 mr-2 text-[#00d992]" />
                    Usage
                  </h2>
                </div>
                <div className="p-6">
                  {/* Usage Steps */}
                  <div className="space-y-6">
                    {example.usage.map((step) => (
                      <div key={step.step} className="space-y-3">
                        <div className="flex items-start gap-3">
                          <span className="flex-shrink-0 w-8 h-8 bg-[#00d992]/20 border border-[#00d992]/40 rounded-full flex items-center justify-center text-[#00d992] font-semibold text-sm">
                            {step.step}
                          </span>
                          <div className="flex-1">
                            <h3 className="text-white font-semibold text-base mb-1">
                              {step.title}
                            </h3>
                            {step.description && (
                              <p className="text-gray-400 text-sm mb-3">{step.description}</p>
                            )}
                            <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
                              <pre className="text-sm text-gray-300 font-mono whitespace-pre-wrap">
                                {step.commands.join("\n")}
                              </pre>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Step 4: CLI Output */}
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <span className="flex-shrink-0 w-8 h-8 bg-[#00d992]/20 border border-[#00d992]/40 rounded-full flex items-center justify-center text-[#00d992] font-semibold text-sm">
                          4
                        </span>
                        <div className="flex-1">
                          <h3 className="text-white font-semibold text-base mb-1">
                            Test your agent
                          </h3>
                          <p className="text-gray-400 text-sm mb-3">
                            Once you see the server started message, open the VoltOps Console to
                            test your agent.
                          </p>
                          <div className="space-y-3">
                            <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
                              <pre className="text-xs sm:text-sm text-gray-300 font-mono whitespace-pre">{`══════════════════════════════════════════════════
  VOLTAGENT SERVER STARTED SUCCESSFULLY
══════════════════════════════════════════════════
  ✓ HTTP Server:  http://localhost:3141
  ✓ Swagger UI:   http://localhost:3141/ui

  Test your agents with VoltOps Console: https://console.voltagent.dev
══════════════════════════════════════════════════`}</pre>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-400">
                              <span>→ Go to</span>
                              <a
                                href="https://console.voltagent.dev"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[#00d992] hover:text-[#00c182] underline"
                              >
                                https://console.voltagent.dev
                              </a>
                              <span>to test your agent</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Call to Action */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
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
