import Head from "@docusaurus/Head";
import Layout from "@theme/Layout";

import { Hero } from "../components/hero";
import { Footer } from "../components/footer";
import LivePreview from "../components/live-preview";
import { DotPattern } from "../components/ui/dot-pattern";
import { AgentsDetail } from "../components/agents-detail";
import { SupervisorAgent } from "../components/supervisor-agent";
import { Rag } from "../components/rag";
import { Integrations } from "../components/integrations";
import Ops from "../components/ops";
import { FeaturedBlog } from "../components/featured-blog";
import { CommunitySection } from "../components/community-section";
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
          <LivePreview />
          <div className="relative">
            <AgentsDetail />
            <SupervisorAgent />
            <Rag />
            <Integrations />
            <Ops />
            <FeaturedBlog />
            <CommunitySection />
          </div>
          <Footer />
        </main>
      </Layout>
    </>
  );
}
