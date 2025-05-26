import Head from "@docusaurus/Head";
import Layout from "@theme/Layout";
import { ShowcaseList } from "../components/showcase";
import { Footer } from "../components/footer";
import { DotPattern } from "../components/ui/dot-pattern";

export default function MarketplacePage(): JSX.Element {
  return (
    <Layout>
      <main className="flex-1">
        <DotPattern dotColor="#94a3b8" dotSize={1.2} spacing={20} />
        <ShowcaseList />
        <Footer />
      </main>
    </Layout>
  );
}
