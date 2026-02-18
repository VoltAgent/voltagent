import Head from "@docusaurus/Head";
import Layout from "@theme/Layout";

import { AgentsDetail } from "../components/agents-detail";
import { CommunitySection } from "../components/community-section";
import { CompaniesMarquee } from "../components/companies/CompaniesMarquee";
import { FeatureShowcase } from "../components/feature-showcase";
import { FeaturedBlog } from "../components/featured-blog";
import { Hero } from "../components/hero";
import { Integrations } from "../components/integrations";
import Ops from "../components/ops";
import { Rag } from "../components/rag";
import { SupervisorAgent } from "../components/supervisor-agent";
import { Testimonials } from "../components/testimonials";
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
        <main className="flex-1 relative overflow-hidden bg-[#050507]">
          <DotPattern dotColor="#fffdfbc6" dotSize={1.2} spacing={22} />
          {/*        <Hero />
          <FeatureShowcase /> */}

          <div className="relative">
            {/*   <CompaniesMarquee />
            <AgentsDetail />
            <Testimonials />
            <SupervisorAgent />
            <Workflows /> */}
            <Rag />
            <Integrations />
            <FeaturedBlog />
            <CommunitySection />
          </div>

          {/* Global CSS for animations */}
          <style jsx global>{`
            :root {
              --landing-home-bg: #050507;
            }

            html,
            body,
            #__docusaurus,
            .main-wrapper {
              background-color: var(--landing-home-bg) !important;
            }

            .main-wrapper {
              max-width: 100% !important;
            }

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
