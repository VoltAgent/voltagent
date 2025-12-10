import Head from "@docusaurus/Head";
import Link from "@docusaurus/Link";
import {
  ArrowRightIcon,
  ChevronDownIcon,
  CloudArrowUpIcon,
  DocumentTextIcon,
  GlobeAltIcon,
  LockClosedIcon,
} from "@heroicons/react/24/outline";
import { DotPattern } from "@site/src/components/ui/dot-pattern";
import Layout from "@theme/Layout";
import { AnimatePresence, motion } from "framer-motion";
import type React from "react";
import { useState } from "react";

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

const Button = ({
  variant = "primary",
  children,
  href,
  className = "",
  target,
}: {
  variant?: "primary" | "secondary";
  children: React.ReactNode;
  href: string;
  className?: string;
  target?: string;
}) => {
  const baseClasses =
    "inline-flex items-center justify-center px-6 py-3 rounded-2xl font-semibold transition-all duration-200 no-underline";
  const variants = {
    primary:
      "bg-emerald-600/20 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-600/30 shadow-lg hover:shadow-xl",
    secondary:
      "bg-transparent text-emerald-400 border border-emerald-500/20 hover:bg-emerald-600/20",
  };

  return (
    <Link
      href={href}
      className={`${baseClasses} ${variants[variant]} ${className}`}
      target={target}
      rel={target === "_blank" ? "noopener noreferrer" : undefined}
    >
      {children}
    </Link>
  );
};

// FAQ Data
const faqData = [
  {
    question: "How long does deployment take?",
    answer:
      "Most deployments complete within 2-5 minutes, depending on your application size and build complexity. VoltOps automatically handles container building, optimization, and deployment to our global infrastructure.",
  },
  {
    question: "Can I use my own custom domain?",
    answer:
      "Yes! VoltOps supports CNAME-based custom domain configuration. Simply add a CNAME record pointing to your VoltOps deployment URL, and we'll handle the rest including automatic SSL certificate provisioning.",
  },
  {
    question: "Is SSL included?",
    answer:
      "Absolutely. All deployments include automatic SSL/TLS certificate provisioning and renewal at no extra cost. Your agents are always served over HTTPS with industry-standard encryption.",
  },
  {
    question: "How do I protect my deployment with authentication?",
    answer:
      "VoltOps offers HTTP Basic Authentication on Pro plans. You can password-protect your deployments to restrict access to authorized users only. Simply enable Basic Auth in your deployment settings and configure your credentials.",
  },
  {
    question: "Can I view real-time logs?",
    answer:
      "Yes! VoltOps provides real-time log streaming for both build processes and running applications. Monitor your agent's activity, debug issues, and track performance directly from the dashboard.",
  },
  {
    question: "What build systems are supported?",
    answer:
      "VoltOps supports both Dockerfile and Nixpacks for automatic build detection. If your repository contains a Dockerfile, we'll use that. Otherwise, Nixpacks will automatically detect your application type and create an optimized build configuration.",
  },
  {
    question: "Do I have to use VoltAgent to deploy my agents?",
    answer:
      "No, VoltOps Deploy is designed to work with any containerized application. While it's optimized for VoltAgent projects, you can deploy any application that can run in a Docker container.",
  },
  {
    question: "What are my options if I want to deploy my agent?",
    answer:
      "You have multiple options: Cloud (fully managed by VoltOps with automatic updates and zero maintenance), or Self-Hosted (deploy on your own infrastructure using our Docker images). VoltOps Cloud is the easiest way to get started with production deployments.",
  },
  {
    question: "How is VoltOps Deployment different from self-hosting?",
    answer:
      "VoltOps Deployment handles infrastructure management, SSL certificates, scaling, and monitoring automatically. Self-hosting gives you full control but requires managing servers, networking, and maintenance yourself. VoltOps is ideal for teams who want to focus on building agents rather than managing infrastructure.",
  },
];

// FAQ Item Component
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
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className="border-b border-gray-800/50"
  >
    <button
      onClick={onClick}
      className="w-full py-5 flex items-center justify-between text-left bg-transparent border-none cursor-pointer group"
      type="button"
    >
      <span className="text-base md:text-lg font-semibold text-white group-hover:text-emerald-400 transition-colors pr-4">
        {question}
      </span>
      <motion.div
        animate={{ rotate: isOpen ? 180 : 0 }}
        transition={{ duration: 0.2 }}
        className="flex-shrink-0"
      >
        <ChevronDownIcon className="w-5 h-5 text-emerald-400" />
      </motion.div>
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
          <p className="pb-5 text-gray-400 text-sm md:text-base leading-relaxed">{answer}</p>
        </motion.div>
      )}
    </AnimatePresence>
  </motion.div>
);

// Feature data
const features = [
  {
    title: "Custom Domain & SSL",
    description:
      "Connect your own domain with CNAME configuration. Automatic SSL certificate provisioning and renewal included at no extra cost.",
    icon: GlobeAltIcon,
    image: "/voltops/5.png",
  },
  {
    title: "Basic Authentication",
    description:
      "Password-protect your deployments with HTTP Basic Auth. Control access to your agents and ensure only authorized users can interact with them.",
    icon: LockClosedIcon,
    image: "/voltops/4.png",
  },
  {
    title: "Real-time Logs",
    description:
      "Monitor build progress and application logs in real-time. Debug issues, track agent activity, and analyze performance directly from your dashboard.",
    icon: DocumentTextIcon,
    image: "/voltops/3.png",
  },

  {
    title: "Basic Authentication",
    description:
      "Password-protect your deployments with HTTP Basic Auth. Control access to your agents and ensure only authorized users can interact with them.",
    icon: LockClosedIcon,
    image: "/voltops/1.png",
  },
];

export default function DeploymentPage(): JSX.Element {
  const [openFAQ, setOpenFAQ] = useState<number | null>(null);

  return (
    <Layout>
      <Head>
        <title>VoltOps Deploy - Deploy AI Agents to Production | VoltAgent</title>
        <meta
          name="description"
          content="Deploy your AI agents to production in minutes with VoltOps. Custom domains, automatic SSL, authentication, and real-time monitoring included."
        />
        <meta property="og:title" content="VoltOps Deploy - Deploy AI Agents to Production" />
        <meta
          property="og:description"
          content="Deploy your AI agents to production in minutes with VoltOps. Custom domains, automatic SSL, authentication, and real-time monitoring included."
        />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="VoltOps Deploy - Deploy AI Agents to Production" />
        <meta
          name="twitter:description"
          content="Deploy your AI agents to production in minutes with VoltOps. Custom domains, automatic SSL, authentication, and real-time monitoring included."
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
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <CloudArrowUpIcon className="w-4 h-4 mr-2" />
                    VoltOps Deploy
                  </span>
                </div>
                <h1 className="text-4xl md:text-5xl tracking-[-0.025em] font-normal text-white mb-6 leading-tight">
                  Deploy AI Agents to <span className="text-emerald-400">Production</span> in
                  Minutes
                </h1>
                <p className="text-lg md:text-xl text-gray-400 mb-8 leading-relaxed">
                  Ship your agents with custom domains, automatic SSL, authentication, and real-time
                  monitoring. No infrastructure headaches.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button href="https://console.voltagent.dev" variant="primary" target="_blank">
                    Start Deploying
                    <ArrowRightIcon className="w-5 h-5 ml-2" />
                  </Button>
                  <Button href="/docs/deployment/voltops/" variant="secondary">
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
                <div className="relative rounded-2xl overflow-hidden border border-emerald-500/20 shadow-2xl shadow-emerald-500/10">
                  <img
                    src="https://cdn.voltagent.dev/website/feature-showcase/deployment.png"
                    alt="VoltOps Deployment Dashboard"
                    className="w-full h-auto"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#080f11] via-transparent to-transparent opacity-40" />
                </div>
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
                      <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-emerald-500/10">
                        <img
                          src={feature.image}
                          alt={feature.title}
                          className="w-full h-auto object-cover group-hover:scale-[1.02] transition-transform duration-700 ease-out"
                        />
                      </div>
                    </div>
                    {/* Feature Content */}
                    <div className={`${index % 2 === 1 ? "lg:order-1" : ""}`}>
                      <div className="flex items-center gap-4 mb-5">
                        <div className="w-12 h-12 rounded-2xl  border border-solid  flex items-center justify-center flex-shrink-0">
                          <feature.icon className="w-6 h-6 " />
                        </div>
                        <h3 className="text-3xl font-normal text-white leading-tight mb-0">
                          {feature.title}
                        </h3>
                      </div>
                      <p className="text-gray-400 text-lg md:text-xl  mb-0">
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
        <Section className="relative">
          <Container className="relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="flex flex-col items-center"
            >
              <div className="mb-12 text-center">
                <h2 className="text-2xl md:text-4xl font-bold text-white mb-4">
                  Frequently Asked <span className="text-emerald-400">Questions</span>
                </h2>
                <p className="max-w-2xl text-lg text-gray-400 mx-auto">
                  Everything you need to know about deploying with VoltOps.
                </p>
              </div>

              <div className="w-full max-w-3xl">
                <div className="bg-gradient-to-br from-gray-900/90 to-gray-950/90 backdrop-blur-xl border border-solid border-emerald-500/20 rounded-2xl p-6 md:p-8">
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
        </Section>
      </main>
    </Layout>
  );
}
