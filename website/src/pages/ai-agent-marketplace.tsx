import Head from "@docusaurus/Head";
import Layout from "@theme/Layout";
import { Marketplace } from "../components/marketplace";

export default function MarketplacePage(): JSX.Element {
  return (
    <Layout>
      <main className="flex-1">
        <Marketplace />
      </main>
    </Layout>
  );
}
