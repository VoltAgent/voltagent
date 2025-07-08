import Head from "@docusaurus/Head";
import Layout from "@theme/Layout";
import React from "react";
import { CustomerList } from "../../components/customers";
import { DotPattern } from "../../components/ui/dot-pattern";

interface CustomerListPageProps {
  customers: any[];
}

export default function CustomerListPage({
  customers,
}: CustomerListPageProps): JSX.Element {
  return (
    <Layout>
      <Head>
        <title>
          VoltAgent Customer Success Stories - Real Companies Using AI Agents |
          TypeScript AI Framework
        </title>
        <meta
          name="description"
          content="Discover how real companies are transforming their workflows with VoltAgent. Read detailed case studies, customer testimonials, and success stories from our clients."
        />
        <meta
          name="keywords"
          content="VoltAgent, customer success, case studies, AI agents, TypeScript, enterprise, automation, testimonials, client stories, artificial intelligence"
        />
        <meta
          property="og:title"
          content="VoltAgent Customer Success Stories - Real Companies Using AI Agents"
        />
        <meta
          property="og:description"
          content="Discover how real companies are transforming their workflows with VoltAgent. Read detailed case studies and customer testimonials."
        />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta
          name="twitter:title"
          content="VoltAgent Customer Success Stories - Real Companies Using AI Agents"
        />
        <meta
          name="twitter:description"
          content="Discover how real companies are transforming their workflows with VoltAgent."
        />
      </Head>
      <main className="flex-1">
        <DotPattern dotColor="#94a3b8" dotSize={1.2} spacing={20} />
        <CustomerList customers={customers} />
      </main>
    </Layout>
  );
}
