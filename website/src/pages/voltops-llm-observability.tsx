import Head from "@docusaurus/Head";
import { ArrowRightIcon, ChartBarIcon } from "@heroicons/react/24/outline";
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

/* FAQ Component
const FAQItem = ({
  question,
  answer,
  isOpen,
  onClick,
}: {
  question: string;
  answer: string;
  isOpen: boolean;
  onClick: () => void;
}) => (
  <div className="border-b border-gray-800/50 last:border-b-0">
    <button
      type="button"
      onClick={onClick}
      className="w-full py-5 flex items-center justify-between text-left bg-transparent border-none cursor-pointer"
    >
      <span className="text-base md:text-lg font-medium text-white">{question}</span>
      <ChevronDownIcon
        className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${
          isOpen ? "rotate-180" : ""
        }`}
      />
    </button>
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="overflow-hidden"
        >
          <p className="pb-5 text-lg text-gray-400 mb-0 leading-relaxed">{answer}</p>
        </motion.div>
      )}
    </AnimatePresence>
  </div>
); */

// FAQ data
/* const faqData = [
  {
    question: "Can I use VoltOps with any AI framework?",
    answer:
      "Yes! VoltOps LLM Observability works with any AI framework including VoltAgent, LangChain, LlamaIndex, and custom implementations. Our SDK integrates seamlessly with your existing codebase.",
  },
  {
    question: "How does VoltOps differ from general observability tools?",
    answer:
      "VoltOps is purpose-built for AI agents and LLM applications. It understands agent hierarchies, tool calls, memory operations, and LLM-specific metrics that general observability tools don't capture.",
  },
  {
    question: "Is there a self-hosted option?",
    answer:
      "Yes, VoltOps offers a self-hosted version for teams that need to keep data on their own infrastructure. You get the same powerful observability features with full control over your data.",
  },
]; */

const features = [
  {
    title: "Visual Agent Execution",
    description:
      "Visualize your agent's execution as an interactive flow diagram. Instantly spot bottlenecks, failed steps, and unexpected behaviors.",
    image: "/voltops/framework-2.png",
  },
  {
    title: "Alerts & Notifications",
    description:
      "Get notified when things break. Set up alerts for latency, errors, and token usage. Receive notifications via Slack, email, or webhooks.",
    image: "/voltops/alert-1.png",
  },
  {
    title: "Detailed Tracing & Logs",
    description:
      "Trace every LLM call, tool execution, and agent interaction. Replay sessions, inspect payloads, and find the root cause fast.",
    image: "/voltops/logs-1.png",
  },
];

export default function ObservabilityPage(): JSX.Element {
  // const [openFAQ, setOpenFAQ] = useState<number | null>(null);

  return (
    <Layout>
      <Head>
        <title>VoltOps LLM Observability - Monitor & Debug AI Agents | VoltAgent</title>
        <meta
          name="description"
          content="Real-time LLM observability for AI agents. Monitor, debug, and optimize your AI agents from any framework with VoltOps."
        />
        <meta property="og:title" content="VoltOps LLM Observability - Monitor & Debug AI Agents" />
        <meta
          property="og:description"
          content="Real-time LLM observability for AI agents. Monitor, debug, and optimize your AI agents from any framework with VoltOps."
        />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta
          name="twitter:title"
          content="VoltOps LLM Observability - Monitor & Debug AI Agents"
        />
        <meta
          name="twitter:description"
          content="Real-time LLM observability for AI agents. Monitor, debug, and optimize your AI agents from any framework with VoltOps."
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
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium  text-emerald-400 border-solid border-emerald-500/20">
                    <ChartBarIcon className="w-4 h-4 mr-2" />
                    VoltOps Observability
                  </span>
                </div>
                <h1 className="text-3xl sm:text-4xl md:text-5xl tracking-[-0.025em] font-normal text-white mb-4 sm:mb-6 leading-tight">
                  Real-time <span className="text-emerald-400">LLM Observability</span> for AI
                  Agents
                </h1>
                <p className="text-base sm:text-lg md:text-xl text-gray-400 mb-6 sm:mb-8 leading-relaxed">
                  Catch AI agent failures before they reach production. Get full visibility into
                  every step, from input to output.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button
                    href="https://console.voltagent.dev/demo"
                    variant="primary"
                    target="_blank"
                  >
                    Try Live Demo
                    <ArrowRightIcon className="w-5 h-5 ml-2" />
                  </Button>
                  <Button href="/observability-docs/" variant="secondary">
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
                  src="/voltops/dashboard-1.png"
                  alt="VoltOps Observability Dashboard"
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

        {/* FAQ Section */}
        {/*    <Section className="relative">
          <Container className="relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="flex flex-col items-center"
            >
              <h2 className="text-2xl md:text-4xl font-bold text-white mb-8">F.A.Q</h2>

              <div className="w-full max-w-4xl">
                <div className="bg-gradient-to-br from-gray-900/90 to-gray-950/90 backdrop-blur-xl border border-solid border-gray-700/50 rounded-2xl p-6 md:p-8">
                  {faqData.map((faq, index) => (
                    <FAQItem
                      key={faq.question}
                      question={faq.question}
                      answer={faq.answer}
                      isOpen={openFAQ === index}
                      onClick={() => setOpenFAQ(openFAQ === index ? null : index)}
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          </Container>
        </Section> */}
      </main>
    </Layout>
  );
}
