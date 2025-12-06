import Head from "@docusaurus/Head";
import Layout from "@theme/Layout";

import { AgentsDetail } from "../components/agents-detail";
import { CommunitySection } from "../components/community-section";
import { CompaniesMarquee } from "../components/companies/CompaniesMarquee";
import { FeatureShowcase } from "../components/feature-showcase";
import { FeaturedBlog } from "../components/featured-blog";
import { Hero } from "../components/hero";
import { Integrations } from "../components/integrations";
import LivePreview from "../components/live-preview";
import Ops from "../components/ops";
import { Rag } from "../components/rag";
import { SupervisorAgent } from "../components/supervisor-agent";
import { Testimonials } from "../components/testimonials";
import { TwoBlocks } from "../components/two-blocks";
import { DotPattern } from "../components/ui/dot-pattern";
import { Workflows } from "../components/workflows";
export default function Home(): JSX.Element {
  const title = "VoltAgent - Open Source TypeScript AI Agent Framework";
  const description = "VoltAgent is an observability-first TypeScript AI Agent framework.";

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta property="og:title" content={title} />

        {description && <meta name="description" content={description} />}
        {description && <meta property="og:description" content={description} />}
      </Head>
      <Layout>
        <main className="flex-1 relative overflow-hidden">
          {/* Global Background Effects */}
          <div className="fixed inset-0 pointer-events-none">
            {/* Base gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/3 via-transparent to-cyan-500/3" />

            {/* Animated gradient orbs */}
            <div className="absolute top-[10%] left-[15%] w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[120px] animate-pulse" />
            <div
              className="absolute top-[50%] right-[10%] w-[400px] h-[400px] bg-cyan-500/8 rounded-full blur-[100px] animate-pulse"
              style={{ animationDelay: "2s" }}
            />
            <div
              className="absolute bottom-[20%] left-[25%] w-[450px] h-[450px] bg-emerald-400/8 rounded-full blur-[110px] animate-pulse"
              style={{ animationDelay: "4s" }}
            />
            <div
              className="absolute top-[30%] left-[60%] w-[350px] h-[350px] bg-cyan-400/6 rounded-full blur-[90px] animate-pulse"
              style={{ animationDelay: "3s" }}
            />

            {/* Moving gradient effect */}
            <div className="absolute inset-0 opacity-30">
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "radial-gradient(circle at 20% 50%, rgba(0, 217, 146, 0.15) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(6, 182, 212, 0.15) 0%, transparent 50%), radial-gradient(circle at 40% 20%, rgba(16, 185, 129, 0.1) 0%, transparent 50%)",
                }}
              />
            </div>
          </div>

          <DotPattern dotColor="#94a3b8" dotSize={1.2} spacing={20} />
          <Hero />
          <FeatureShowcase />
          <CompaniesMarquee />
          {/*   <TwoBlocks />
          <LivePreview /> */}

          <div className="relative">
            <AgentsDetail />
            <Testimonials />
            <SupervisorAgent />
            <Workflows />
            <Rag />
            <Integrations />
            <Ops />
            <FeaturedBlog />
            <CommunitySection />
          </div>

          {/* Global CSS for animations */}
          <style jsx global>{`
            @keyframes gradientShift {
              0%,
              100% {
                transform: translate(0, 0) rotate(0deg);
              }
              25% {
                transform: translate(-5%, 5%) rotate(1deg);
              }
              50% {
                transform: translate(5%, -5%) rotate(-1deg);
              }
              75% {
                transform: translate(-3%, -3%) rotate(0.5deg);
              }
            }
          `}</style>
        </main>
      </Layout>
    </>
  );
}
