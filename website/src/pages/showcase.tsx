import Head from "@docusaurus/Head";
import Layout from "@theme/Layout";
import { ShowcaseList } from "../components/showcase";
import { Footer } from "../components/footer";

export default function MarketplacePage(): JSX.Element {
  return (
    <Layout>
      <main className="flex-1">
        <ShowcaseList />
        <Footer />
      </main>
    </Layout>
  );
}
