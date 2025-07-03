import Head from "@docusaurus/Head";
import Link from "@docusaurus/Link";
import {
  ArrowLeftIcon,
  BuildingOfficeIcon,
  RocketLaunchIcon,
  UserGroupIcon,
  BoltIcon,
} from "@heroicons/react/24/outline";
import Layout from "@theme/Layout";
import { motion } from "framer-motion";
import React from "react";
import { DotPattern } from "../../components/ui/dot-pattern";

export default function DifferentCustomerPage(): JSX.Element {
  // Different company data
  const customer = {
    name: "Different",
    industry: "Property Management / Real Estate",
    website: "https://different.com.au/",
    logo_url: "https://cdn.voltagent.dev/website/customers/different-logo.png",
  };

  const caseStudy = {
    title:
      "How Different Built Reliable Property Management Agents with VoltAgent + VoltOps",
    use_case:
      "LLM-powered internal tools for property communications, task routing, and expert assistance",
  };

  const quote = {
    text: "We couldn't afford black-box behavior in tools that impact real customer operations. Having insight into how our agents think and act has helped us build with more confidence and catch problems early.",
    author: "Michael Klevansky",
    position: "CEO",
    company: "Different",
  };

  // SEO
  const seoTitle = `${customer.name} Case Study - ${caseStudy.title} | VoltAgent`;
  const seoDescription = `${caseStudy.use_case} - Learn how ${customer.name} transformed their workflow with VoltAgent. Read the full case study and customer testimonial.`;
  const keywords = `VoltAgent, ${customer.name}, case study, ${customer.industry}, AI agents, TypeScript, automation, customer success`;

  return (
    <Layout>
      <Head>
        <title>{seoTitle}</title>
        <meta name="description" content={seoDescription} />
        <meta name="keywords" content={keywords} />
        <meta name="author" content={customer.name} />

        {/* Open Graph tags */}
        <meta
          property="og:title"
          content={`${customer.name} Case Study - VoltAgent Success Story`}
        />
        <meta property="og:description" content={seoDescription} />
        <meta property="og:type" content="article" />
        <meta property="og:image" content={customer.logo_url} />
        <meta property="article:author" content={customer.name} />
        <meta property="article:tag" content="VoltAgent" />
        <meta property="article:tag" content="Case Study" />
        <meta property="article:tag" content={customer.industry} />

        {/* Twitter Card tags */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta
          name="twitter:title"
          content={`${customer.name} Case Study - VoltAgent Success Story`}
        />
        <meta name="twitter:description" content={seoDescription} />
        <meta name="twitter:image" content={customer.logo_url} />
      </Head>
      <main className="flex-1">
        <DotPattern dotColor="#94a3b8" dotSize={1.2} spacing={20} />

        <section className="relative py-20">
          <div className="max-w-5xl mx-auto px-2 sm:px-4 md:px-6 lg:px-8 w-full">
            {/* Back Button */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
              className="mb-8 w-full"
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
                  <BuildingOfficeIcon className="w-16 h-16 text-[#00d992] sm:w-20 sm:h-20 rounded-lg border-2 border-[#1e293b] p-3" />
                  <div className="flex-1 min-w-0">
                    <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl font-bold text-[#00d992] mb-1 sm:mb-2 leading-tight">
                      {customer.name}
                    </h1>
                    <p className="text-gray-400 text-sm sm:text-base lg:text-lg mb-2">
                      {customer.industry}
                    </p>
                  </div>
                </div>
                <a
                  href={customer.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center no-underline px-3 py-2 sm:px-4 bg-gray-800/50 hover:bg-gray-700/50 border border-gray-600 rounded-lg transition-colors self-start"
                >
                  <BoltIcon className="w-4 h-4 mr-2 text-gray-300" />
                  <span className="text-gray-300 font-medium text-sm">
                    Visit Website
                  </span>
                </a>
              </div>

              <div className="space-y-2 sm:space-y-4">
                <h2 className="text-base sm:text-lg md:text-xl lg:text-2xl font-semibold text-white leading-tight">
                  {caseStudy.title}
                </h2>
                <p className="text-gray-400 text-sm sm:text-base leading-relaxed">
                  {caseStudy.use_case}
                </p>
              </div>
            </motion.div>

            {/* Customer Testimonial */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="w-full"
            >
              <div
                className="border-solid bg-white/5 border-[#1e293b]/40 border-2 rounded-md p-3 sm:p-4 md:p-6 mb-8 w-full max-w-full min-w-0"
                style={{
                  backdropFilter: "blur(4px)",
                  WebkitBackdropFilter: "blur(4px)",
                  wordWrap: "break-word",
                  overflowWrap: "break-word",
                }}
              >
                <blockquote className="mb-4">
                  <p className="text-xs sm:text-sm md:text-base text-gray-300 italic leading-relaxed break-words hyphens-auto">
                    "{quote.text}"
                  </p>
                </blockquote>
                <div className="border-t flex flex-col sm:flex-row flex-wrap items-start sm:items-center border-gray-600 pt-3 gap-1">
                  <div className="text-xs sm:text-sm md:text-base font-medium text-[#00d992] break-words">
                    {quote.author}
                  </div>
                  <div className="text-xs sm:text-sm text-gray-400 break-words">
                    {quote.position}
                  </div>
                  <div className="text-xs sm:text-sm text-gray-500 break-words">
                    {quote.company}
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Case Study Content */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="space-y-6 sm:space-y-8 w-full"
            >
              {/* Challenge */}
              <div
                className="border-solid bg-white/5 border-[#1e293b]/40 border-2 rounded-lg p-3 sm:p-4 md:p-6 w-full max-w-full min-w-0"
                style={{
                  backdropFilter: "blur(4px)",
                  WebkitBackdropFilter: "blur(4px)",
                  wordWrap: "break-word",
                  overflowWrap: "break-word",
                }}
              >
                <h3 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-[#00d992] mb-3 sm:mb-4 break-words">
                  The Challenge
                </h3>
                <div className="space-y-4 text-xs sm:text-sm md:text-base text-gray-300 leading-relaxed">
                  <p>
                    As the team at Different began integrating LLMs into their
                    internal operations such as summarizing property
                    communications, routing tasks, and assisting their property
                    experts they quickly ran into the classic problem:
                  </p>
                  <blockquote className="border-l-4 border-[#00d992] pl-4 italic text-gray-200">
                    "We couldn't afford black-box behavior in tools that impact
                    real customer operations."
                  </blockquote>
                  <p>
                    With multiple tools, prompts, and logic paths involved,
                    debugging and understanding agent decisions became a growing
                    challenge. They needed a framework that gave them both
                    structure and visibility.
                  </p>
                </div>
              </div>

              {/* Solution */}
              <div
                className="border-solid bg-white/5 border-[#1e293b]/40 border-2 rounded-lg p-3 sm:p-4 md:p-6 w-full max-w-full min-w-0"
                style={{
                  backdropFilter: "blur(4px)",
                  WebkitBackdropFilter: "blur(4px)",
                  wordWrap: "break-word",
                  overflowWrap: "break-word",
                }}
              >
                <h3 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-[#00d992] mb-3 sm:mb-4 break-words">
                  The Solution: VoltAgent + VoltOps
                </h3>
                <div className="space-y-4 text-xs sm:text-sm md:text-base text-gray-300 leading-relaxed">
                  <p>By adopting VoltAgent, the team was able to:</p>
                  <ul className="space-y-2 ml-4">
                    <li>Define custom agents in TypeScript</li>
                    <li>
                      Handle tool orchestration and memory in a clean, modular
                      way
                    </li>
                    <li>
                      Build reliable flows for tasks like support summarization
                      and workflow triage
                    </li>
                  </ul>
                  <p>They paired this with VoltOps, which gave them:</p>
                  <ul className="space-y-2 ml-4">
                    <li>
                      Real-time observability into each agent's reasoning steps
                    </li>
                    <li>
                      Visibility into tool calls, memory usage, and intermediate
                      decisions
                    </li>
                    <li>
                      Faster debugging when something broke or behaved
                      unexpectedly
                    </li>
                  </ul>
                </div>
              </div>

              {/* Results */}
              <div
                className="border-solid bg-white/5 border-[#1e293b]/40 border-2 rounded-lg p-3 sm:p-4 md:p-6 w-full max-w-full min-w-0"
                style={{
                  backdropFilter: "blur(4px)",
                  WebkitBackdropFilter: "blur(4px)",
                  wordWrap: "break-word",
                  overflowWrap: "break-word",
                }}
              >
                <h3 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-[#00d992] mb-3 sm:mb-4 break-words">
                  The Outcome
                </h3>
                <div className="space-y-4 text-xs sm:text-sm md:text-base text-gray-300 leading-relaxed">
                  <p>
                    With VoltAgent and VoltOps, Different now runs LLM-powered
                    internal tools with confidence, accelerating development
                    while maintaining full control.
                  </p>
                  <blockquote className="border-l-4 border-[#00d992] pl-4 italic text-gray-200">
                    "Having insight into how our agents think and act has helped
                    us build with more confidence and catch problems early."
                  </blockquote>
                  <p>
                    This lets the team at Different continue delivering smarter,
                    faster property management experiences powered by AI, backed
                    by full visibility.
                  </p>
                </div>
              </div>

              {/* Call to Action */}
              <div
                className="border-solid bg-white/5 border-[#1e293b]/40 border-2 rounded-lg p-3 sm:p-4 md:p-6 w-full max-w-full min-w-0"
                style={{
                  backdropFilter: "blur(4px)",
                  WebkitBackdropFilter: "blur(4px)",
                  wordWrap: "break-word",
                  overflowWrap: "break-word",
                }}
              >
                <h3 className="text-sm sm:text-base md:text-lg lg:text-xl font-bold text-[#00d992] mb-3 sm:mb-4 break-words">
                  Ready to Build with Confidence?
                </h3>
                <p className="text-gray-400 mb-4 text-xs sm:text-sm break-words">
                  Join Different and other companies building AI-powered
                  solutions with full visibility and control.
                </p>
                <a
                  href="https://discord.gg/voltagent"
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
