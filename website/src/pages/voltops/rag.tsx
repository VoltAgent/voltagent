import Head from "@docusaurus/Head";
import { ArrowRightIcon, CircleStackIcon } from "@heroicons/react/24/outline";
import { DotPattern } from "@site/src/components/ui/dot-pattern";
import { Button } from "@site/src/components/voltops/Button";
import Layout from "@theme/Layout";
import { motion } from "framer-motion";
import type React from "react";

// Reusable components
const Section = ({
  children,
  className = "",
}: { children: React.ReactNode; className?: string }) => (
  <section className={`py-8 md:py-10 lg:py-16 ${className}`}>{children}</section>
);

const Container = ({
  children,
  className = "",
}: { children: React.ReactNode; className?: string }) => (
  <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 ${className}`}>{children}</div>
);

const features = [
  {
    title: "Upload Your Docs",
    description:
      "Drop your files and start querying. Supports PDF, DOCX, DOC, PPTX, PPT, XLSX, XLS, CSV, HTML, HTM, XML, MD, MDX, TXT, JSON, VTT, and PROPERTIES. You can also sync from Notion or crawl websites.",
    image: "https://cdn.voltagent.dev/website/rag/create.png",
  },
  {
    title: "One Line to Add RAG",
    description:
      "Set retriever on your agent for automatic context injection, or add retriever.tool to let the LLM decide when to search. Both options work with a single line of code.",
    image: "https://cdn.voltagent.dev/website/rag/usage.png",
  },
  {
    title: "Automatic Chunking",
    description:
      "Documents are automatically chunked and embedded. Configure chunk size and overlap if needed, or use the defaults.",
    image: "https://cdn.voltagent.dev/website/rag/create-base.png",
  },
];

export default function RAGPage(): JSX.Element {
  return (
    <Layout>
      <Head>
        <title>VoltOps RAG - Retrieval Augmented Generation | VoltAgent</title>
        <meta
          name="description"
          content="Build powerful RAG pipelines with VoltOps. Manage knowledge bases, vector search, and retrieval for your AI agents."
        />
        <meta property="og:title" content="VoltOps RAG - Retrieval Augmented Generation" />
        <meta
          property="og:description"
          content="Build powerful RAG pipelines with VoltOps. Manage knowledge bases, vector search, and retrieval for your AI agents."
        />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="VoltOps RAG - Retrieval Augmented Generation" />
        <meta
          name="twitter:description"
          content="Build powerful RAG pipelines with VoltOps. Manage knowledge bases, vector search, and retrieval for your AI agents."
        />
      </Head>

      <main className="flex-1 bg-[#080f11d9] relative overflow-hidden">
        {/* Global Background Effects */}
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/3 via-transparent to-cyan-500/3" />
          <div className="absolute top-[10%] left-[15%] w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[120px] animate-pulse" />
          <div
            className="absolute top-[50%] right-[10%] w-[400px] h-[400px] bg-cyan-500/8 rounded-full blur-[100px] animate-pulse"
            style={{ animationDelay: "2s" }}
          />
          <div
            className="absolute bottom-[20%] left-[25%] w-[450px] h-[450px] bg-emerald-400/8 rounded-full blur-[110px] animate-pulse"
            style={{ animationDelay: "4s" }}
          />
        </div>

        <DotPattern dotColor="#94a3b8" dotSize={1.2} spacing={20} />

        {/* Hero Section */}
        <Section className="relative pt-12 md:pt-16">
          <Container>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center relative z-10">
              {/* Left side - Content */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
              >
                <div className="mb-4">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium text-emerald-400 border-solid border-emerald-500/20">
                    <CircleStackIcon className="w-4 h-4 mr-2" />
                    VoltOps RAG
                  </span>
                </div>
                <h1 className="text-3xl sm:text-4xl md:text-5xl tracking-[-0.025em] font-normal text-white mb-4 sm:mb-6 leading-tight">
                  Give Your Agent a <span className="text-emerald-400">Knowledge Base</span>
                </h1>
                <p className="text-base sm:text-lg md:text-xl text-gray-400 mb-6 sm:mb-8 leading-relaxed">
                  Upload docs, connect your agent, and start querying. No vector database setup
                  required.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button href="https://console.voltagent.dev" variant="primary" target="_blank">
                    Get Started
                    <ArrowRightIcon className="w-5 h-5 ml-2" />
                  </Button>
                  <Button href="/docs/" variant="secondary">
                    View Documentation
                  </Button>
                </div>
              </motion.div>

              {/* Right side - Image */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="relative"
              >
                <img
                  src="https://cdn.voltagent.dev/website/rag/hero.png"
                  alt="VoltOps RAG Dashboard"
                  className="w-full h-auto rounded-xl object-cover"
                />
              </motion.div>
            </div>
          </Container>
        </Section>

        {/* Features Section */}
        <Section className="relative">
          <Container className="relative z-10">
            <div className="space-y-16 lg:space-y-20">
              {features.map((feature, index) => (
                <motion.div
                  key={`${feature.title}-${index}`}
                  initial={{ opacity: 0, y: 40 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.6,
                    delay: 0.15 + index * 0.1,
                    type: "spring",
                    stiffness: 80,
                  }}
                  className="group"
                >
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
                    {/* Feature Image */}
                    <div className={`relative ${index % 2 === 1 ? "lg:order-2" : ""}`}>
                      <img
                        src={feature.image}
                        alt={feature.title}
                        className="w-full h-auto rounded-xl object-cover"
                      />
                    </div>
                    {/* Feature Content */}
                    <div className={`${index % 2 === 1 ? "lg:order-1" : ""}`}>
                      <div className="flex items-center gap-4 mb-5">
                        <h3 className="text-xl sm:text-2xl md:text-3xl font-normal text-white leading-tight mb-0">
                          {feature.title}
                        </h3>
                      </div>
                      <p className="text-gray-400 text-base sm:text-lg md:text-xl mb-0">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                  {/* Divider between features */}
                  {index < features.length - 1 && (
                    <div className="mt-16 lg:mt-20 border-t border-solid border-gray-800/50" />
                  )}
                </motion.div>
              ))}
            </div>
          </Container>
        </Section>
      </main>
    </Layout>
  );
}
