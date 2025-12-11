import Head from "@docusaurus/Head";
import Link from "@docusaurus/Link";
import {
  ArrowRightIcon,
  CloudArrowUpIcon,
  DocumentTextIcon,
  GlobeAltIcon,
  LockClosedIcon,
} from "@heroicons/react/24/outline";
import { DotPattern } from "@site/src/components/ui/dot-pattern";
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

// Feature data
const features = [
  {
    title: "Real-time Logs",
    description:
      "Monitor build progress and application logs in real-time. Debug issues, track agent activity, and analyze performance directly from your dashboard.",
    icon: DocumentTextIcon,
    image: "/voltops/log-1.png",
  },
  {
    title: "Custom Domain & SSL",
    description:
      "Connect your own domain with CNAME configuration. Automatic SSL certificate provisioning and renewal included at no extra cost.",
    icon: GlobeAltIcon,
    image: "/voltops/domain-3.png",
  },
  {
    title: "Basic Authentication",
    description:
      "Password-protect your deployments with HTTP Basic Auth. Control access to your agents and ensure only authorized users can interact with them.",
    icon: LockClosedIcon,
    image: "/voltops/security-2.png",
  },
];

export default function DeploymentPage(): JSX.Element {
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
                  <Button href="https://voltagent.dev/docs/deployment/voltops/" variant="secondary">
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
                  src="/voltops/dep-5.png"
                  alt="VoltOps Deployment Dashboard"
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
        {/*         <Section className="relative">
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
        </Section> */}
      </main>
    </Layout>
  );
}
