import Head from "@docusaurus/Head";
import Layout from "@theme/Layout";
import { Console } from "../components/console";

export default function ConsolePage(): JSX.Element {
  return (
    <Layout>
      <main className="flex-1">
        <Console />
      </main>
    </Layout>
  );
}
