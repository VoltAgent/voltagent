import Head from "@docusaurus/Head";
import Layout from "@theme/Layout";
import React from "react";
import { ExampleList } from "../../components/examples";
import { DotPattern } from "../../components/ui/dot-pattern";

interface ExampleListPageProps {
  examples: any[];
}

export default function ExampleListPage({ examples }: ExampleListPageProps): JSX.Element {
  return (
    <Layout>
      <Head>
        <title>
          VoltAgent Examples - Code Snippets & Tutorials | TypeScript AI Agent Framework
        </title>
        <meta
          name="description"
          content="Explore practical examples and code snippets for building AI agents with VoltAgent. Learn from real-world implementations and get started quickly."
        />
        <meta
          name="keywords"
          content="VoltAgent, examples, code snippets, tutorials, AI agents, TypeScript, implementation, samples, documentation"
        />
        <meta property="og:title" content="VoltAgent Examples - Code Snippets & Tutorials" />
        <meta
          property="og:description"
          content="Explore practical examples and code snippets for building AI agents with VoltAgent."
        />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="VoltAgent Examples - Code Snippets & Tutorials" />
        <meta
          name="twitter:description"
          content="Explore practical examples and code snippets for building AI agents with VoltAgent."
        />
      </Head>
      <main className="flex-1">
        <DotPattern dotColor="#94a3b8" dotSize={1.2} spacing={20} />
        <ExampleList examples={examples} />
      </main>
    </Layout>
  );
}
