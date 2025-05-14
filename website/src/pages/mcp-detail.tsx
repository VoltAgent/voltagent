import React from "react";
import Layout from "@theme/Layout";
import { MCPDetailPage } from "../components/mcp-list/mcp-page";
import { Footer } from "../components/footer";

export default function MCPDetailPageRoute(): JSX.Element {
  return (
    <Layout>
      <main className="flex-1">
        <MCPDetailPage />
        <Footer />
      </main>
    </Layout>
  );
}
