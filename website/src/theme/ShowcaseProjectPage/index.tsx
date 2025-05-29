import React from "react";
import Head from "@docusaurus/Head";
import Layout from "@theme/Layout";
import Link from "@docusaurus/Link";
import { motion } from "framer-motion";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import { GitHubLogo } from "../../../static/img/logos/github";
import { Footer } from "../../components/footer";
import { DotPattern } from "../../components/ui/dot-pattern";

interface ShowcaseProjectPageProps {
  project: any;
}

export default function ShowcaseProjectPage({
  project,
}: ShowcaseProjectPageProps): JSX.Element {
  if (!project) {
    return (
      <Layout>
        <Head>
          <title>Project Not Found - VoltAgent Showcase</title>
          <meta
            name="description"
            content="The requested project could not be found in the VoltAgent showcase."
          />
        </Head>
        <main className="flex-1 min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-400 mb-4">
              Project Not Found
            </h1>
            <Link
              to="/showcase"
              className="text-[#00d992] hover:underline no-underline"
            >
              Back to Showcase
            </Link>
          </div>
        </main>
      </Layout>
    );
  }

  // Create SEO-optimized title and description
  const seoTitle = `${project.name} - AI Agent by ${project.creator} | VoltAgent Showcase`;
  const seoDescription = `${project.description.substring(
    0,
    150,
  )}... Built with VoltAgent by ${
    project.creator
  }. Explore source code and implementation details.`;
  const techStack = project.tech?.join(", ") || "";
  const keywords = `VoltAgent, ${project.creator}, AI agent, ${techStack}, TypeScript, artificial intelligence, automation, ${project.name}`;

  return (
    <Layout>
      <Head>
        <title>{seoTitle}</title>
        <meta name="description" content={seoDescription} />
        <meta name="keywords" content={keywords} />
        <meta name="author" content={project.creator} />

        {/* Open Graph tags */}
        <meta
          property="og:title"
          content={`${project.name} - AI Agent by ${project.creator}`}
        />
        <meta property="og:description" content={seoDescription} />
        <meta property="og:type" content="article" />
        <meta property="og:image" content={project.screenshot} />
        <meta property="article:author" content={project.creator} />
        <meta property="article:tag" content="VoltAgent" />
        <meta property="article:tag" content="AI Agent" />
        {project.tech?.map((tech) => (
          <meta key={tech} property="article:tag" content={tech} />
        ))}

        {/* Twitter Card tags */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta
          name="twitter:title"
          content={`${project.name} - AI Agent by ${project.creator}`}
        />
        <meta name="twitter:description" content={seoDescription} />
        <meta name="twitter:image" content={project.screenshot} />
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
                to="/showcase"
                className="flex items-center text-gray-400 hover:text-[#00d992] transition-colors no-underline text-sm sm:text-base"
              >
                <ArrowLeftIcon className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                Back to Showcase
              </Link>
            </motion.div>

            {/* Project Header */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="mb-8"
            >
              <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-[#00d992] mb-4">
                {project.name}
              </h1>

              {/* Creator Info */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                  <img
                    src={project.avatar}
                    alt={`${project.creator}'s avatar`}
                    className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 border-[#1e293b] mr-3 sm:mr-4"
                  />
                  <div>
                    <span className="text-gray-500 text-xs sm:text-sm">
                      Created by
                    </span>
                    <div className="text-base sm:text-lg font-medium text-gray-300">
                      {project.creator}
                    </div>
                  </div>
                </div>

                {/* GitHub Link */}
                <a
                  href={project.githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center no-underline px-3 sm:px-4 py-2 bg-gray-800/50 hover:bg-gray-700/50 border-solid border-gray-600 rounded-lg transition-colors"
                >
                  <GitHubLogo className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                  <span className="text-gray-300 font-medium text-sm sm:text-base">
                    Source Code
                  </span>
                </a>
              </div>
            </motion.div>

            {/* Cover Image/Video */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="mb-8"
            >
              <div className="relative rounded-lg overflow-hidden border-2 border-[#1e293b]/40">
                {project.video ? (
                  <iframe
                    width="1040"
                    height="585"
                    src={project.video}
                    title={project.name}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    referrerPolicy="strict-origin-when-cross-origin"
                    allowFullScreen
                    className="w-full h-52 sm:h-64 md:h-80 lg:h-96 xl:h-[500px]"
                  />
                ) : (
                  <img
                    src={project.screenshot}
                    alt={`${project.name} screenshot`}
                    className="w-full h-52 sm:h-64 md:h-80 lg:h-96 xl:h-[500px] object-cover"
                  />
                )}
              </div>
            </motion.div>

            {/* Project Details */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-8"
            >
              {/* Description */}
              <div className="lg:col-span-2">
                <div
                  className="border-solid border-[#1e293b]/40 border-2 rounded-lg p-6 mb-8"
                  style={{
                    backdropFilter: "blur(4px)",
                    WebkitBackdropFilter: "blur(4px)",
                    backgroundColor: "rgba(58, 66, 89, 0.3)",
                  }}
                >
                  <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-[#00d992] mb-4">
                    About This Project
                  </h2>
                  <p className="text-sm sm:text-base text-gray-300 leading-relaxed">
                    {project.description}
                  </p>
                </div>

                {/* Use Cases */}
                <div
                  className="border-solid border-[#1e293b]/40 border-2 rounded-lg p-6"
                  style={{
                    backdropFilter: "blur(4px)",
                    WebkitBackdropFilter: "blur(4px)",
                    backgroundColor: "rgba(58, 66, 89, 0.3)",
                  }}
                >
                  <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-[#00d992] mb-4">
                    Use Cases
                  </h2>
                  <ul className="space-y-2 pl-2">
                    {project.useCases?.map((useCase) => (
                      <li key={useCase} className="flex items-start">
                        <span className="text-[#00d992] mr-2 ">•</span>
                        <span className="text-sm sm:text-base text-gray-300">
                          {useCase}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Tech Stack */}
              <div className="lg:col-span-1 space-y-8">
                <div
                  className="border-solid border-[#1e293b]/40 border-2 rounded-lg p-6"
                  style={{
                    backdropFilter: "blur(4px)",
                    WebkitBackdropFilter: "blur(4px)",
                    backgroundColor: "rgba(58, 66, 89, 0.3)",
                  }}
                >
                  <h3 className="text-base sm:text-lg md:text-xl font-bold text-[#00d992] mb-4">
                    Tech Stack
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {project.tech?.map((tech) => (
                      <span
                        key={tech}
                        className={`px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm rounded-md font-medium ${
                          tech === "VoltAgent"
                            ? "bg-[#00d992]/20 text-[#00d992] border-solid border-[#00d992]/30"
                            : "bg-gray-700/50 text-gray-300 border-solid border-gray-600/30"
                        }`}
                      >
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Call to Action */}
                <div
                  className="border-solid border-[#1e293b]/40 border-2 rounded-lg p-6"
                  style={{
                    backdropFilter: "blur(4px)",
                    WebkitBackdropFilter: "blur(4px)",
                    backgroundColor: "rgba(58, 66, 89, 0.3)",
                  }}
                >
                  <h3 className="text-base sm:text-lg md:text-xl font-bold text-[#00d992] mb-4">
                    Inspired by this project?
                  </h3>
                  <p className="text-gray-400 mb-4 text-xs sm:text-sm">
                    Build your own AI agent with VoltAgent and share it with the
                    community.
                  </p>
                  <a
                    href="https://github.com/orgs/VoltAgent/discussions/154/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full text-center px-3 sm:px-4 py-2 bg-emerald-400/10 text-emerald-400 border-solid border-emerald-400/20 font-semibold rounded-lg transition-colors hover:bg-emerald-400/20 no-underline text-xs sm:text-sm"
                  >
                    Submit Your Project
                  </a>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        <Footer />
      </main>
    </Layout>
  );
}
