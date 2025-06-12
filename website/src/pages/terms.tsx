import Layout from "@theme/Layout";
import React from "react";
import { TermsAndConditions } from "../components/terms";

export default function TermsPage() {
  return (
    <Layout
      title="Terms And Conditions"
      description="VoltAgent Terms And Conditions"
    >
      <main className="flex-1 mt-4">
        <TermsAndConditions />
      </main>
    </Layout>
  );
}
