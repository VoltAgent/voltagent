import Head from "@docusaurus/Head";
import Link from "@docusaurus/Link";
import {
  ArrowLeftIcon,
  ArrowTopRightOnSquareIcon,
  BuildingOfficeIcon,
  UsersIcon,
  GlobeAltIcon,
} from "@heroicons/react/24/outline";
import Layout from "@theme/Layout";
import { motion } from "framer-motion";
import React from "react";
import { GitHubLogo } from "../../../static/img/logos/github";
import { DotPattern } from "../../components/ui/dot-pattern";

interface CustomerProjectPageProps {
  customer: any;
}

export default function CustomerProjectPage({
  customer,
}: CustomerProjectPageProps): JSX.Element {
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
            <h1 className="text-2xl font-bold text-gray-400 mb-4">
              Case Study Not Found
            </h1>
            <Link
              to="/customers"
              className="text-[#00d992] hover:underline no-underline"
            >
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
  const keywords = `VoltAgent, ${customer.customer.name}, case study, ${customer.customer.industry}, AI agents, TypeScript, automation, customer success, ${customer.customer.location}`;

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
                  <BuildingOfficeIcon className="w-16 h-16 text-[#00d992] sm:w-20 sm:h-20 rounded-lg border-2 border-[#1e293b] mr-4 sm:mr-6 " />
                  <div className="flex-1 min-w-0">
                    <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl font-bold text-[#00d992] mb-1 sm:mb-2 leading-tight">
                      {customer.customer.name}
                    </h1>
                    <p className="text-gray-400 text-sm sm:text-base lg:text-lg mb-2">
                      {customer.customer.industry}
                    </p>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
                      <div className="flex items-center text-xs sm:text-sm text-gray-500">
                        <UsersIcon className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                        {customer.customer.team_size} employees
                      </div>
                      <div className="flex items-center text-xs sm:text-sm text-gray-500">
                        <BuildingOfficeIcon className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                        {customer.customer.location}
                      </div>
                    </div>
                  </div>
                </div>
                <a
                  href={customer.customer.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center no-underline px-3 py-2 sm:px-4 bg-gray-800/50 hover:bg-gray-700/50 border border-gray-600 rounded-lg transition-colors self-start"
                >
                  <GlobeAltIcon className="w-4 h-4 mr-2 text-gray-300" />
                  <span className="text-gray-300 font-medium text-sm">
                    Visit Website
                  </span>
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
                <div className="border-t flex items-center border-gray-600 pt-4">
                  <div className="text-sm sm:text-base font-medium text-[#00d992]">
                    {customer.case_study.quote.author}
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
                <p className="text-sm sm:text-base text-gray-300 leading-relaxed">
                  {customer.case_study.challenge_paragraph}
                </p>
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
                  The Solution
                </h3>
                <p className="text-sm sm:text-base text-gray-300 leading-relaxed">
                  {customer.case_study.solution_paragraph}
                </p>
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
                  The Results
                </h3>
                <p className="text-sm sm:text-base text-gray-300 leading-relaxed">
                  {customer.case_study.results_paragraph}
                </p>
              </div>

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
                  Join hundreds of companies already using VoltAgent to build
                  powerful AI agents.
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
