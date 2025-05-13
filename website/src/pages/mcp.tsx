import Head from "@docusaurus/Head";
import Layout from "@theme/Layout";
import { MCPList } from "../components/mcp-list";
import { Footer } from "../components/footer";

export default function MCPPage(): JSX.Element {
  return (
    <Layout>
      <main className="flex-1">
        <MCPList />
        <Footer />
      </main>
    </Layout>
  );
}
