import React from "react";
import Head from "@docusaurus/Head";
import Layout from "@theme/Layout";
import { ShowcaseList } from "../../components/showcase";
import { Footer } from "../../components/footer";
import { DotPattern } from "../../components/ui/dot-pattern";

interface ShowcaseListPageProps {
  projects: any[];
}

export default function ShowcaseListPage({
  projects,
}: ShowcaseListPageProps): JSX.Element {
  return (
    <Layout>
      <Head>
        <title>
          VoltAgent Showcase - AI Agent Projects Built by Community | TypeScript
          AI Framework
        </title>
        <meta
          name="description"
          content="Discover amazing AI agent projects built with VoltAgent by our community. Explore real-world implementations, source code, and use cases for TypeScript AI agents."
        />
        <meta
          name="keywords"
          content="VoltAgent, AI agents, TypeScript, community projects, AI framework, open source, artificial intelligence, automation"
        />
        <meta
          property="og:title"
          content="VoltAgent Showcase - Community AI Agent Projects"
        />
        <meta
          property="og:description"
          content="Discover amazing AI agent projects built with VoltAgent by our community. Explore real-world implementations and source code."
        />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta
          name="twitter:title"
          content="VoltAgent Showcase - Community AI Agent Projects"
        />
        <meta
          name="twitter:description"
          content="Discover amazing AI agent projects built with VoltAgent by our community."
        />
      </Head>
      <main className="flex-1">
        <DotPattern dotColor="#94a3b8" dotSize={1.2} spacing={20} />
        <ShowcaseList projects={projects} />
        <Footer />
      </main>
    </Layout>
  );
}
