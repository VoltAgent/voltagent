import Head from "@docusaurus/Head";
import Layout from "@theme/Layout";

import { AgentsDetail } from "../components/agents-detail";
import { CommunitySection } from "../components/community-section";
import { FeaturedBlog } from "../components/featured-blog";
import { Hero } from "../components/hero";
import { Integrations } from "../components/integrations";
import LivePreview from "../components/live-preview";
import Ops from "../components/ops";
import { Rag } from "../components/rag";
import { SupervisorAgent } from "../components/supervisor-agent";
import { DotPattern } from "../components/ui/dot-pattern";
import { TwoBlocks } from "../components/two-blocks";
import { Testimonials } from "../components/testimonials";
import { Workflows } from "../components/workflows";
export default function Home(): JSX.Element {
  const title = "VoltAgent - Open Source TypeScript AI Agent Framework";
  const description =
    "VoltAgent is an observability-first TypeScript AI Agent framework.";

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta property="og:title" content={title} />

        {description && <meta name="description" content={description} />}
        {description && (
          <meta property="og:description" content={description} />
        )}
      </Head>
      <Layout>
        <main className="flex-1">
          <DotPattern dotColor="#94a3b8" dotSize={1.2} spacing={20} />

          <Hero />
          <TwoBlocks />
          <LivePreview />

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
        </main>
      </Layout>
    </>
  );
}
