import React from "react";
import Head from "@docusaurus/Head";
import Layout from "@theme/Layout";
import { MCPList } from "../components/mcp-list";
import { Footer } from "../components/footer";
import Link from "@docusaurus/Link";

export default function MCPPage(): JSX.Element {
  return (
    <Layout>
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <Link
            to="/mcp-detail"
            className="text-[#00d992] hover:underline mb-4 inline-block"
          >
            View Example MCP Detail Page
          </Link>
        </div>
        <MCPList />
        <Footer />
      </main>
    </Layout>
  );
}
