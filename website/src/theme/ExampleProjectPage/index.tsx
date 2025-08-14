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
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#00d992] mb-4">
                {example.title}
              </h1>
              <p className="text-gray-400 text-base sm:text-lg mb-4">{example.description}</p>
              {example.tags && example.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {example.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-3 py-1 bg-[#00d992]/10 border border-[#00d992]/20 rounded-full text-[#00d992] text-sm"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
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
                    This example shows how to create an intelligent recipe recommendation system
                    that provides detailed, personalized recipes based on your ingredients, dietary
                    preferences, and time constraints. The agent combines culinary knowledge,
                    nutritional data, and cooking techniques to deliver comprehensive cooking
                    instructions.
                  </p>
                  <p className="text-gray-400 text-sm sm:text-base font-semibold mb-3">
                    Example prompts to try:
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
