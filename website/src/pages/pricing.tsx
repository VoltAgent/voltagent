import { ChevronDownIcon } from "@heroicons/react/24/outline";
import Layout from "@theme/Layout";
import { motion } from "framer-motion";
import React, { useState } from "react";
import PricingCalculatorModal from "../components/console/PricingCalculatorModal";
import PricingSection from "../components/console/PricingSection";
import { TwoBlocks } from "../components/two-blocks-pricing";
import { DotPattern } from "../components/ui/dot-pattern";

export default function Pricing(): JSX.Element {
  const [openFAQ, setOpenFAQ] = useState<number | null>(null);
  const [calculatorOpen, setCalculatorOpen] = useState(false);

  const toggleFAQ = (index: number) => {
    setOpenFAQ(openFAQ === index ? null : index);
  };

  const faqData = [
    {
      question: "My application isn't written in VoltAgent. Will VoltOps be useful?",
      answer:
        "Yes! VoltOps LLM Observability works with JS/TS, Python, Vercel AI SDK and various frameworks, not just VoltAgent. Our REST API and webhook integrations allow you to send traces from Java, C#, Go, Ruby, PHP, or any other language.",
    },
    {
      question: "How can VoltOps help with observability and evaluation?",
      answer:
        "VoltOps provides comprehensive LLM observability with detailed traces, token usage tracking, cost analysis, performance metrics, and user session monitoring. You can evaluate your AI agents' performance, debug issues in real-time, and optimize your applications based on production data insights.",
    },
    {
      question: "What counts as a trace in VoltOps?",
      answer:
        "A trace represents a single execution flow through your AI agent or application. This includes LLM calls, tool usage, function calls, and any nested operations that occur during a single request or conversation turn. Each user interaction that triggers your AI system typically generates one trace.",
    },
    {
      question: "How does VoltOps pricing work with trace overages?",
      answer: (
        <span>
          VoltOps Core plan includes 5,000 traces per month for $50, and Pro plan includes 20,000
          traces per month for $250. If you exceed these limits, you'll be charged $10 for every
          additional 5,000 traces.{" "}
          <button
            type="button"
            onClick={() => setCalculatorOpen(true)}
            className="text-emerald-400 hover:text-emerald-300 cursor-pointer transition-colors bg-transparent border-none p-0 font-inherit underline"
          >
            Use our pricing calculator
          </button>{" "}
          to estimate your monthly costs based on expected usage. You can set up billing alerts to
          monitor your usage.
        </span>
      ),
    },
    {
      question: "I can't have data leave my environment. Can I self-host VoltOps?",
      answer:
        "Yes! VoltOps Enterprise plan includes self-hosted deployment options. You can run VoltOps entirely within your own infrastructure, ensuring your sensitive AI application data never leaves your environment while still getting full monitoring capabilities.",
    },
    {
      question: "Where is VoltOps data stored?",
      answer:
        "For our cloud offering, VoltOps data is securely stored in SOC 2 compliant data centers with encryption at rest and in transit. For Enterprise customers, we offer self-hosted options where all data remains in your own infrastructure and never leaves your environment.",
    },
    {
      question: "Will VoltOps add latency to my application?",
      answer:
        "VoltOps is designed for minimal performance impact. Our SDKs send data asynchronously in the background, typically adding less than 1ms of overhead. The monitoring happens without blocking your AI application's main execution flow.",
    },
    {
      question: "Will you train on the data that I send VoltOps?",
      answer:
        "No, absolutely not. VoltOps never uses your data to train models or for any other purpose beyond providing you with monitoring and analytics. Your AI application data is strictly used only for observability features and remains completely private to your organization.",
    },
  ];

  return (
    <Layout
      title="VoltOps LLM Observability Pricing"
      description="Simple, transparent pricing for VoltOps LLM Observability platform. VoltAgent Core Framework is free and open source. Monitor and scale your AI applications with confidence."
    >
      <DotPattern dotColor="#94a3b8" dotSize={1.2} spacing={20} />
      <main className="min-h-screen">
        {/* Hero Section */}
        <section className="relative px-4">
          <div className="max-w-7xl mx-auto md:pt-20 pt-8 text-center px-2 landing-sm:px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              {/* Pricing Header */}
              <div className="text-center mb-20 landing-xs:mb-6 landing-sm:mb-16 landing-md:mb-24">
                <h1 className="text-4xl landing-xs:text-3xl landing-sm:text-5xl md:text-6xl lg:text-6xl font-bold text-main-emerald mb-4 landing-xs:mb-4">
                  Pricing
                </h1>
              </div>

              <TwoBlocks />

              {/* Pricing Header */}
            </motion.div>
          </div>
        </section>
        <div className="max-w-7xl mx-auto  text-center px-2 landing-xs:px-3 landing-sm:px-3 ">
          {/* Pricing Section */}
          <PricingSection
            primaryColor="orange-400"
            primaryColorHover="orange-300"
            primaryColorBorder="orange-500/30"
            primaryColorShadow="orange-400/20"
            primaryColorText="orange-500"
          />
        </div>

        {/* FAQ Section */}
        <section className="landing-xs:py-8 landing-sm:py-16 landing-md:py-20 px-4 landing-xs:px-3 landing-sm:px-6">
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-center mb-12 landing-xs:mb-8 landing-sm:mb-16"
            >
              <h2 className="text-3xl landing-xs:text-lg landing-sm:text-3xl md:text-4xl font-bold text-white mb-4 landing-xs:mb-3">
                Frequently Asked Questions
              </h2>
              <p className="text-gray-400 text-lg landing-xs:text-xs landing-sm:text-lg">
                Everything you need to know about VoltOps LLM Observability
              </p>
            </motion.div>

            <div className="space-y-4 landing-xs:space-y-2">
              {faqData.map((faq, index) => (
                <motion.div
                  key={faq.question}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.1 * index }}
                  className="bg-[#191c24] border border-solid border-gray-700/50 rounded-lg landing-xs:rounded-md overflow-hidden hover:border-emerald-400/30 transition-colors"
                >
                  <div
                    onClick={() => toggleFAQ(index)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        toggleFAQ(index);
                      }
                    }}
                    className="w-full text-left p-6 landing-xs:p-3 landing-sm:p-5 flex items-center justify-between focus:outline-none focus:bg-gray-800/20 hover:bg-gray-800/20 transition-colors cursor-pointer"
                  >
                    <span className="text-lg landing-xs:text-xs landing-sm:text-lg font-semibold text-white pr-4 landing-xs:pr-2">
                      {faq.question}
                    </span>
                    <ChevronDownIcon
                      className={`w-5 h-5 landing-xs:w-3 landing-xs:h-3 landing-sm:w-5 text-gray-400 transition-transform duration-200 flex-shrink-0 ${
                        openFAQ === index ? "rotate-180" : ""
                      }`}
                    />
                  </div>

                  <motion.div
                    initial={false}
                    animate={{
                      height: openFAQ === index ? "auto" : 0,
                      opacity: openFAQ === index ? 1 : 0,
                    }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <div className="px-6 pb-6 landing-xs:px-3 landing-xs:pb-3 landing-sm:px-5 landing-sm:pb-5">
                      <p className="text-gray-400 leading-relaxed landing-xs:text-xs landing-sm:text-base">
                        {typeof faq.answer === "string" ? faq.answer : faq.answer}
                      </p>
                    </div>
                  </motion.div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing Calculator Modal */}
        <PricingCalculatorModal isOpen={calculatorOpen} onClose={() => setCalculatorOpen(false)} />
      </main>
    </Layout>
  );
}
