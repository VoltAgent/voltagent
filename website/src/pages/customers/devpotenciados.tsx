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

export default function DEVPotenciadosCustomerPage(): JSX.Element {
  // DEVPotenciados company data
  const customer = {
    name: "DEVPotenciados LATAM",
    industry: "Developer Community / AI Education",
    website: "https://www.linkedin.com/in/francisco-carranza-474836206/",
    logo_url:
      "https://cdn.voltagent.dev/website/customers/devpotenciados-logo.png",
  };

  const caseStudy = {
    title:
      "How DEVPotenciados LATAM Empowers Developers with AI Agents Using VoltAgent",
    use_case:
      "Community platform that helps LATAM developers integrate AI into their applications and daily work",
  };

  const quote = {
    text: "What I really like is that VoltAgent allows us to customize our own tools, our own memory, and the most amazing part is the observability and monitoring.",
    author: "Francisco Carranza",
    position: "Software Engineer & Community Leader",
    company: "DEVPotenciados LATAM",
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
                    "{quote.text}"
                  </p>
                </blockquote>
                <div className="border-t flex items-center border-gray-600 pt-4">
                  <div className="text-sm sm:text-base font-medium text-[#00d992]">
                    {quote.author}
                  </div>
                  <div className="text-xs sm:text-sm text-gray-400 ml-2">
                    {quote.position}
                  </div>
                  <div className="text-xs sm:text-sm text-gray-500 ml-2">
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
                  <p>
                    Francisco leads DEVPotenciados LATAM, a community of
                    developers in Latin America passionate about AI. The mission
                    is to empower developers to integrate AI into their
                    applications and daily work to enhance their potential and
                    create truly powerful solutions.
                  </p>
                  <p>
                    However, Francisco realized that existing solutions posed
                    significant challenges:
                  </p>
                  <blockquote className="border-l-4 border-[#00d992] pl-4 italic text-gray-200">
                    "Solutions like LangChain or using LLM model APIs directly
                    can often be quite complex. Additionally, it frequently
                    becomes very complicated because shifting from building
                    traditional software to creating AI agents is a major
                    paradigm shift."
                  </blockquote>
                  <p>
                    The complexity of orchestrating agents and the steep
                    learning curve were preventing developers in the community
                    from effectively adopting AI solutions.
                  </p>
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
                  <p>
                    Francisco discovered VoltAgent while looking for a simple
                    and easy-to-understand framework to build truly powerful AI
                    solutions for the DEVPotenciados community.
                  </p>
                  <p>VoltAgent provided exactly what the community needed:</p>
                  <ul className="space-y-2 ml-4">
                    <li>
                      Simplified agent orchestration without the complexity of
                      traditional solutions
                    </li>
                    <li>Customizable tools and memory systems</li>
                    <li>
                      Real-time observability and monitoring through VoltOps
                    </li>
                    <li>
                      Developer-friendly experience that enhances productivity
                    </li>
                  </ul>
                  <blockquote className="border-l-4 border-[#00d992] pl-4 italic text-gray-200">
                    "It helps me see in real time how my agent is behaving, as
                    well as identify which steps are failing, retry them, etc.
                    It's very developer-friendly and enhances the development
                    experience."
                  </blockquote>
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
                  <p>
                    With VoltAgent, Francisco and the DEVPotenciados LATAM
                    community can now focus on what matters most: empowering
                    developers across Latin America to build AI-powered
                    solutions.
                  </p>
                  <p>
                    The platform has enabled Francisco to create truly fast
                    products while maintaining full visibility into agent
                    behavior. The ease of use and monitoring capabilities have
                    made AI development accessible to more developers in the
                    community.
                  </p>
                  <blockquote className="border-l-4 border-[#00d992] pl-4 italic text-gray-200">
                    "The ease of creating truly fast products, and even the
                    options it offers to monitor the agent."
                  </blockquote>
                  <p>
                    Francisco continues to lead the DEVPotenciados LATAM
                    community in discovering and implementing AI solutions that
                    enhance developer productivity and create powerful
                    applications across the region.
                  </p>
                </div>
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
                  Ready to Empower Your Development?
                </h3>
                <p className="text-gray-400 mb-4 text-xs sm:text-sm">
                  Join Francisco and thousands of developers building powerful
                  AI solutions with VoltAgent.
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
