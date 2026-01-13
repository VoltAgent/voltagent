import Head from "@docusaurus/Head";
import Link from "@docusaurus/Link";
import {
  ArrowLeftIcon,
  ArrowTopRightOnSquareIcon,
  BuildingOfficeIcon,
  GlobeAltIcon,
  UsersIcon,
} from "@heroicons/react/24/outline";
import { BoltIcon } from "@heroicons/react/24/solid";
import Layout from "@theme/Layout";
import { motion } from "framer-motion";
import React from "react";
import { GitHubLogo } from "../../../static/img/logos/github";
import { DotPattern } from "../../components/ui/dot-pattern";
import { getLogoComponent } from "../../utils/logo-helper";

interface CustomerProjectPageProps {
  customer: {
    customer: {
      name: string;
      logo_url?: string;
      logo?: string;
      website: string;
      industry: string;
      location?: string;
    };
    case_study: {
      title: string;
      use_case: string;
      challenge_paragraph: string;
      solution_paragraph: string;
      results_paragraph: string;
      quote: {
        text: string;
        author: string;
        position: string;
        company: string;
        linkedin?: string;
      };
      useCases?: string[];
      video?: string;
      tech?: string[];
    };
  };
}

type CaseStudyContentPart =
  | { type: "quote"; content: string }
  | { type: "bullets"; content: string[] }
  | { type: "text"; content: string };

const appendTextSections = (rawText: string, parts: CaseStudyContentPart[]): void => {
  const remainingText = rawText.trim();
  if (!remainingText) {
    return;
  }

  if (remainingText.includes(":") && remainingText.includes(";")) {
    const bulletSections: string[][] = [];
    const textParts: string[] = [];

    const sentences = remainingText.split(". ");

    for (const sentence of sentences) {
      if (sentence.includes(":") && sentence.includes(";")) {
        const colonIndex = sentence.indexOf(":");
        const beforeColon = sentence.substring(0, colonIndex + 1);
        const afterColon = sentence.substring(colonIndex + 1);

        if (beforeColon.trim()) {
          textParts.push(beforeColon.trim());
        }

        if (afterColon.trim()) {
          const bulletPoints = afterColon
            .split(";")
            .map((point) => point.trim())
            .filter((point) => point);
          bulletSections.push(bulletPoints);
        }
      } else if (sentence.trim()) {
        textParts.push(sentence.trim() + (sentence === sentences[sentences.length - 1] ? "" : "."));
      }
    }

    for (let j = 0; j < Math.max(textParts.length, bulletSections.length); j++) {
      if (j < textParts.length && textParts[j]) {
        parts.push({
          type: "text",
          content: textParts[j],
        });
      }
      if (j < bulletSections.length && bulletSections[j] && bulletSections[j].length > 0) {
        parts.push({
          type: "bullets",
          content: bulletSections[j],
        });
      }
    }
    return;
  }

  parts.push({ type: "text", content: remainingText });
};

const parseSolutionContent = (content: string): CaseStudyContentPart[] => {
  const parts: CaseStudyContentPart[] = [];
  let currentText = "";
  let inQuote = false;
  let quoteText = "";

  for (let i = 0; i < content.length; i++) {
    const char = content[i];

    if (char === '"' && !inQuote) {
      appendTextSections(currentText, parts);
      currentText = "";
      inQuote = true;
      quoteText = "";
      continue;
    }

    if (char === '"' && inQuote) {
      if (quoteText.trim()) {
        parts.push({
          type: "quote",
          content: quoteText.trim(),
        });
        quoteText = "";
      }
      inQuote = false;
      continue;
    }

    if (inQuote) {
      quoteText += char;
    } else {
      currentText += char;
    }
  }

  appendTextSections(currentText, parts);
  return parts;
};

export default function CustomerProjectPage({ customer }: CustomerProjectPageProps): JSX.Element {
  if (!customer) {
    return (
      <Layout>
        <Head>
          <title>Case Study Not Found - VoltAgent Customer Success</title>
          <meta
            name="description"
            content="The requested customer case study could not be found."
          />
        </Head>
        <main className="flex-1 min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-400 mb-4">Case Study Not Found</h1>
            <Link to="/customers" className="text-[#00d992] hover:underline no-underline">
              Back to Customer Stories
            </Link>
          </div>
        </main>
      </Layout>
    );
  }

  // Create SEO-optimized title and description
  const seoTitle = `${customer.customer.name} Case Study - ${customer.case_study.title} | VoltAgent`;
  const seoDescription = `${customer.case_study.use_case} - Learn how ${customer.customer.name} transformed their workflow with VoltAgent. Read the full case study and customer testimonial.`;
  const keywords = `VoltAgent, ${customer.customer.name}, case study, ${
    customer.customer.industry
  }, AI agents, TypeScript, automation, customer success${
    customer.customer.location ? `, ${customer.customer.location}` : ""
  }`;

  return (
    <Layout>
      <Head>
        <title>{seoTitle}</title>
        <meta name="description" content={seoDescription} />
        <meta name="keywords" content={keywords} />
        <meta name="author" content={customer.customer.name} />

        {/* Open Graph tags */}
        <meta
          property="og:title"
          content={`${customer.customer.name} Case Study - VoltAgent Success Story`}
        />
        <meta property="og:description" content={seoDescription} />
        <meta property="og:type" content="article" />
        <meta property="og:image" content={customer.customer.logo_url} />
        <meta property="article:author" content={customer.customer.name} />
        <meta property="article:tag" content="VoltAgent" />
        <meta property="article:tag" content="Case Study" />
        <meta property="article:tag" content={customer.customer.industry} />

        {/* Twitter Card tags */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta
          name="twitter:title"
          content={`${customer.customer.name} Case Study - VoltAgent Success Story`}
        />
        <meta name="twitter:description" content={seoDescription} />
        <meta name="twitter:image" content={customer.customer.logo_url} />
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
                to="/customers"
                className="flex items-center text-gray-400 hover:text-[#00d992] transition-colors no-underline text-sm sm:text-base"
              >
                <ArrowLeftIcon className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                Back to Customer Stories
              </Link>
            </motion.div>

            {/* Customer Header */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="mb-6 sm:mb-8"
            >
              <div className="flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-6 mb-4 sm:mb-6">
                <div className="flex items-start gap-3 sm:gap-4 flex-1">
                  {(() => {
                    // Check if logo_url exists first
                    if (customer.customer.logo_url) {
                      return (
                        <img
                          src={customer.customer.logo_url}
                          alt={`${customer.customer.name} logo`}
                          className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg border-2 border-[#1e293b] mr-4 sm:mr-6 object-contain"
                        />
                      );
                    }
                    // Fall back to SVG component if logo field exists
                    if (customer.customer.logo) {
                      const LogoComponent = getLogoComponent(customer.customer.logo);
                      return (
                        <LogoComponent className="w-16 h-16 text-[#00d992] sm:w-20 sm:h-20 rounded-lg border-2 border-[#1e293b] mr-4 sm:mr-6" />
                      );
                    }
                    // Final fallback to default icon
                    return (
                      <BuildingOfficeIcon className="w-16 h-16 text-[#00d992] sm:w-20 sm:h-20 rounded-lg border-2 border-[#1e293b] mr-4 sm:mr-6" />
                    );
                  })()}
                  <div className="flex-1 min-w-0">
                    <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl font-bold text-[#00d992] mb-1 sm:mb-2 leading-tight">
                      {customer.customer.name}
                    </h1>
                    <p className="text-gray-400 text-sm sm:text-base lg:text-lg mb-2">
                      {customer.customer.industry}
                    </p>
                  </div>
                </div>
                <a
                  href={customer.customer.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center no-underline px-3 py-2 sm:px-4 bg-gray-800/50 hover:bg-gray-700/50 border border-gray-600 rounded-lg transition-colors self-start"
                >
                  <GlobeAltIcon className="w-4 h-4 mr-2 text-gray-300" />
                  <span className="text-gray-300 font-medium text-sm">Company Profile</span>
                </a>
              </div>

              <div className="space-y-2 sm:space-y-4">
                <h2 className="text-base sm:text-lg md:text-xl lg:text-2xl font-semibold text-white leading-tight">
                  {customer.case_study.title}
                </h2>
                <p className="text-gray-400 text-sm sm:text-base leading-relaxed">
                  {customer.case_study.use_case}
                </p>
              </div>
            </motion.div>
            {/* Customer Testimonial */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <div
                className="border-solid bg-white/5 border-[#1e293b]/40 border-2 rounded-md p-6 mb-8"
                style={{
                  backdropFilter: "blur(4px)",
                  WebkitBackdropFilter: "blur(4px)",
                }}
              >
                <blockquote className="mb-4">
                  <p className="text-sm sm:text-base text-gray-300 italic leading-relaxed">
                    "{customer.case_study.quote.text}"
                  </p>
                </blockquote>
                <div className="border-t flex items-center border-gray-600 pt-4 gap-2">
                  <div className="text-sm sm:text-base font-medium text-[#00d992]">
                    {customer.case_study.quote.linkedin ? (
                      <a
                        href={customer.case_study.quote.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#00d992] hover:text-[#00c182] transition-colors no-underline"
                      >
                        {customer.case_study.quote.author}
                      </a>
                    ) : (
                      customer.case_study.quote.author
                    )}
                  </div>
                  <div className="text-xs sm:text-sm text-gray-400">
                    {customer.case_study.quote.position}
                  </div>
                  <div className="text-xs sm:text-sm text-gray-500">
                    {customer.case_study.quote.company}
                  </div>
                </div>
              </div>
            </motion.div>
            {/* Case Study Content */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="space-y-6 sm:space-y-8"
            >
              {/* Challenge */}
              <div
                className="border-solid bg-white/5 border-[#1e293b]/40 border-2 rounded-lg p-4 sm:p-6"
                style={{
                  backdropFilter: "blur(4px)",
                  WebkitBackdropFilter: "blur(4px)",
                }}
              >
                <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-[#00d992] mb-3 sm:mb-4">
                  The Challenge
                </h3>
                <div className="space-y-4 text-sm sm:text-base text-gray-300 leading-relaxed">
                  {(() => {
                    const content = customer.case_study.challenge_paragraph;
                    const parts = [];
                    let currentText = "";
                    let inQuote = false;
                    let quoteText = "";

                    for (let i = 0; i < content.length; i++) {
                      const char = content[i];

                      if (char === '"' && !inQuote) {
                        // Starting a quote
                        if (currentText.trim()) {
                          parts.push({
                            type: "text",
                            content: currentText.trim(),
                          });
                          currentText = "";
                        }
                        inQuote = true;
                        quoteText = "";
                      } else if (char === '"' && inQuote) {
                        // Ending a quote
                        if (quoteText.trim()) {
                          parts.push({
                            type: "quote",
                            content: quoteText.trim(),
                          });
                          quoteText = "";
                        }
                        inQuote = false;
                      } else if (inQuote) {
                        quoteText += char;
                      } else {
                        currentText += char;
                      }
                    }

                    if (currentText.trim()) {
                      parts.push({ type: "text", content: currentText.trim() });
                    }

                    return parts.map((part) => {
                      if (part.type === "quote") {
                        return (
                          <blockquote
                            key={`challenge-quote-${part.content
                              .substring(0, 30)
                              .replace(/\s+/g, "-")}`}
                            className="border-l-4 border-[#00d992] pl-4 italic text-gray-200"
                          >
                            "{part.content}"
                          </blockquote>
                        );
                      }
                      return (
                        <p
                          key={`challenge-text-${part.content
                            .substring(0, 30)
                            .replace(/\s+/g, "-")}`}
                        >
                          {part.content}
                        </p>
                      );
                    });
                  })()}
                </div>
              </div>

              {/* Solution */}
              <div
                className="border-solid bg-white/5 border-[#1e293b]/40 border-2 rounded-lg p-4 sm:p-6"
                style={{
                  backdropFilter: "blur(4px)",
                  WebkitBackdropFilter: "blur(4px)",
                }}
              >
                <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-[#00d992] mb-3 sm:mb-4">
                  The Solution: VoltAgent + VoltOps
                </h3>
                <div className="space-y-4 text-sm sm:text-base text-gray-300 leading-relaxed">
                  {parseSolutionContent(customer.case_study.solution_paragraph).map((part) => {
                    if (part.type === "quote") {
                      return (
                        <blockquote
                          key={`solution-quote-${part.content
                            .substring(0, 30)
                            .replace(/\s+/g, "-")}`}
                          className="border-l-4 border-[#00d992] pl-4 italic text-gray-200"
                        >
                          "{part.content}"
                        </blockquote>
                      );
                    }
                    if (part.type === "bullets") {
                      return (
                        <ul
                          key={`solution-bullets-${part.content[0]
                            .substring(0, 20)
                            .replace(/\s+/g, "-")}`}
                          className="space-y-2 ml-4"
                        >
                          {part.content.map((bullet, bulletIndex) => (
                            <li
                              key={`bullet-${bullet
                                .substring(0, 15)
                                .replace(/\s+/g, "-")}-${bulletIndex}`}
                            >
                              {bullet}
                            </li>
                          ))}
                        </ul>
                      );
                    }
                    return (
                      <p
                        key={`solution-text-${part.content.substring(0, 30).replace(/\s+/g, "-")}`}
                      >
                        {part.content}
                      </p>
                    );
                  })}
                </div>
              </div>

              {/* Results */}
              <div
                className="border-solid bg-white/5 border-[#1e293b]/40 border-2 rounded-lg p-4 sm:p-6"
                style={{
                  backdropFilter: "blur(4px)",
                  WebkitBackdropFilter: "blur(4px)",
                }}
              >
                <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-[#00d992] mb-3 sm:mb-4">
                  The Outcome
                </h3>
                <div className="space-y-4 text-sm sm:text-base text-gray-300 leading-relaxed">
                  {(() => {
                    const content = customer.case_study.results_paragraph;
                    const parts = [];
                    let currentText = "";
                    let inQuote = false;
                    let quoteText = "";

                    for (let i = 0; i < content.length; i++) {
                      const char = content[i];

                      if (char === '"' && !inQuote) {
                        // Starting a quote
                        if (currentText.trim()) {
                          parts.push({
                            type: "text",
                            content: currentText.trim(),
                          });
                          currentText = "";
                        }
                        inQuote = true;
                        quoteText = "";
                      } else if (char === '"' && inQuote) {
                        // Ending a quote
                        if (quoteText.trim()) {
                          parts.push({
                            type: "quote",
                            content: quoteText.trim(),
                          });
                          quoteText = "";
                        }
                        inQuote = false;
                      } else if (inQuote) {
                        quoteText += char;
                      } else {
                        currentText += char;
                      }
                    }

                    if (currentText.trim()) {
                      parts.push({ type: "text", content: currentText.trim() });
                    }

                    return parts.map((part) => {
                      if (part.type === "quote") {
                        return (
                          <blockquote
                            key={`results-quote-${part.content
                              .substring(0, 30)
                              .replace(/\s+/g, "-")}`}
                            className="border-l-4 border-[#00d992] pl-4 italic text-gray-200"
                          >
                            "{part.content}"
                          </blockquote>
                        );
                      }
                      return (
                        <p
                          key={`results-text-${part.content.substring(0, 30).replace(/\s+/g, "-")}`}
                        >
                          {part.content}
                        </p>
                      );
                    });
                  })()}
                </div>
              </div>

              {/* Use Cases */}
              {customer.case_study.useCases && customer.case_study.useCases.length > 0 && (
                <div
                  className="border-solid bg-white/5 border-[#1e293b]/40 border-2 rounded-lg p-4 sm:p-6"
                  style={{
                    backdropFilter: "blur(4px)",
                    WebkitBackdropFilter: "blur(4px)",
                  }}
                >
                  <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-[#00d992] mb-3 sm:mb-4 flex items-center">
                    <BoltIcon className="w-6 h-6 mr-2 text-[#00d992]" />
                    Key Use Cases
                  </h3>
                  <ul className="space-y-3 text-sm sm:text-base text-gray-300 mb-6">
                    {customer.case_study.useCases.map((useCase) => (
                      <li
                        key={`use-case-${useCase.substring(0, 20).replace(/\s+/g, "-")}`}
                        className="flex items-start"
                      >
                        <span className="text-[#00d992] mr-2 mt-1">•</span>
                        <span>{useCase}</span>
                      </li>
                    ))}
                  </ul>

                  {/* Tech Stack inside Use Cases */}
                  {customer.case_study.tech && customer.case_study.tech.length > 0 && (
                    <div className="border-t border-gray-600 pt-4">
                      <h4 className="text-sm font-semibold text-gray-400 mb-3">Built with</h4>
                      <div className="flex flex-wrap gap-2">
                        {customer.case_study.tech.map((tech) => (
                          <span
                            key={`tech-${tech}`}
                            className="px-3 py-1 bg-[#00d992]/10 border border-[#00d992]/20 rounded-full text-[#00d992] text-sm font-medium"
                          >
                            {tech}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Video */}
              {customer.case_study.video && (
                <div
                  className="border-solid bg-white/5 border-[#1e293b]/40 border-2 rounded-lg p-4 sm:p-6"
                  style={{
                    backdropFilter: "blur(4px)",
                    WebkitBackdropFilter: "blur(4px)",
                  }}
                >
                  <div className="relative w-full pb-[56.25%] h-0 overflow-hidden rounded-lg bg-gray-900">
                    <iframe
                      src={customer.case_study.video}
                      title="Customer Case Study Video"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="absolute top-0 left-0 w-full h-full border-0"
                    />
                  </div>
                </div>
              )}

              {/* Call to Action */}
              <div
                className="border-solid bg-white/5 border-[#1e293b]/40 border-2 rounded-lg p-4 sm:p-6"
                style={{
                  backdropFilter: "blur(4px)",
                  WebkitBackdropFilter: "blur(4px)",
                }}
              >
                <h3 className="text-base sm:text-lg md:text-xl font-bold text-[#00d992] mb-3 sm:mb-4">
                  Ready to Transform Your Workflow?
                </h3>
                <p className="text-gray-400 mb-4 text-xs sm:text-sm">
                  Join hundreds of companies already using VoltAgent to build powerful AI agents.
                </p>
                <a
                  href="/docs/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full text-center px-3 sm:px-4 py-2 bg-emerald-400/10 text-emerald-400 border-solid border-emerald-400/20 font-semibold rounded-lg transition-colors hover:bg-emerald-400/20 no-underline text-xs sm:text-sm"
                >
                  Get Started Today
                </a>
              </div>
            </motion.div>
          </div>
        </section>
      </main>
    </Layout>
  );
}
