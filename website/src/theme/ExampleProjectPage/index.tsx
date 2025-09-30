import Head from "@docusaurus/Head";
import Link from "@docusaurus/Link";
import { ArrowLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import { MDXProvider } from "@mdx-js/react";
import Layout from "@theme/Layout";
import MDXComponents from "@theme/MDXComponents";
import clsx from "clsx";
import { motion } from "framer-motion";
import React from "react";
import YouTubeEmbed from "../../components/blog-widgets/YouTubeEmbed";
import { Info, Success, Warning } from "../../components/examples/Callout";
import { DotPattern } from "../../components/ui/dot-pattern";

interface ExampleMetadata {
  id: number;
  slug: string;
  title: string;
  description: string;
  tags?: string[];
  published?: boolean;
  repository?: string;
}

type MDXContentComponent = React.ComponentType<Record<string, unknown>> & {
  frontMatter?: Record<string, unknown>;
  toc?: unknown;
};

interface ExampleProjectPageProps {
  example: ExampleMetadata | undefined;
  content?: MDXContentComponent;
}

type TocItem = {
  id: string;
  value: string;
  level?: number;
  children?: TocItem[];
};

export default function ExampleProjectPage({
  example,
  content,
}: ExampleProjectPageProps): JSX.Element {
  if (!example) {
    return (
      <Layout>
        <Head>
          <title>Example Not Found - VoltAgent Examples</title>
          <meta name="description" content="The requested example could not be found." />
        </Head>
        <main className="flex-1 min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-400 mb-4">Example Not Found</h1>
            <Link to="/examples" className="text-[#00d992] hover:underline no-underline">
              Back to Examples
            </Link>
          </div>
        </main>
      </Layout>
    );
  }

  if (!content) {
    return (
      <Layout>
        <Head>
          <title>Example Content Missing - VoltAgent Examples</title>
          <meta name="description" content="The requested example content could not be rendered." />
        </Head>
        <main className="flex-1 min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-400 mb-4">Example Content Missing</h1>
            <Link to="/examples" className="text-[#00d992] hover:underline no-underline">
              Back to Examples
            </Link>
          </div>
        </main>
      </Layout>
    );
  }

  const seoTitle = `${example.title} - VoltAgent Example | TypeScript AI Framework`;
  const seoDescription = `${example.description} - Learn how to build this with VoltAgent. Complete code example with installation and usage instructions.`;
  const repositoryUrl = example.repository;

  const DetailsComponent = React.useCallback(({ children, ...props }: any) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const [summary, ...content] = React.Children.toArray(children);

    return (
      <details
        {...props}
        open={isOpen}
        onToggle={(e) => setIsOpen((e.target as HTMLDetailsElement).open)}
      >
        <summary className="flex items-center gap-2 py-2 text-sm font-medium text-emerald-400 no-underline hover:text-emerald-300 cursor-pointer outline-none list-none marker:hidden">
          <ChevronRightIcon
            className={clsx("h-4 w-4 transition-transform duration-200", isOpen && "rotate-90")}
          />
          {summary?.props?.children || summary}
        </summary>
        <div className="mt-4">{content}</div>
      </details>
    );
  }, []);

  const mdxComponents = React.useMemo(
    () => ({
      ...MDXComponents,
      YouTubeEmbed,
      Info,
      Success,
      Warning,
      details: DetailsComponent,
    }),
    [DetailsComponent],
  );

  const tocItems = React.useMemo(() => {
    const raw = (content as unknown as { toc?: TocItem[] } | undefined)?.toc ?? [];
    const normalize = (items: TocItem[]): TocItem[] =>
      items
        .filter((item) => (item.level ?? 0) >= 2 && (item.level ?? 0) <= 3)
        .map((item) => ({
          ...item,
          children: item.children ? normalize(item.children) : [],
        }));
    return normalize(raw);
  }, [content]);

  const renderToc = (items: TocItem[], depth = 0): React.ReactNode => (
    <ul
      className={clsx("space-y-0.5 mb-0 text-sm", {
        "mt-1.5 pl-3": depth > 0,
      })}
    >
      {items.map((item) => (
        <li key={item.id}>
          <a
            className="block rounded-lg px-3 py-1 text-slate-200/80 transition hover:bg-emerald-500/10 hover:text-emerald-200 no-underline hover:no-underline"
            href={`#${item.id}`}
          >
            {item.value}
          </a>
          {item.children && item.children.length > 0 ? renderToc(item.children, depth + 1) : null}
        </li>
      ))}
    </ul>
  );

  return (
    <Layout>
      <Head>
        <title>{seoTitle}</title>
        <meta name="description" content={seoDescription} />
        <meta
          name="keywords"
          content={`VoltAgent, ${example.title}, example, ${example.tags?.join(
            ", ",
          )}, TypeScript, AI agents, tutorial`}
        />
        <meta property="og:title" content={`${example.title} - VoltAgent Example`} />
        <meta property="og:description" content={seoDescription} />
        <meta property="og:type" content="article" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={`${example.title} - VoltAgent Example`} />
        <meta name="twitter:description" content={seoDescription} />
      </Head>
      <main className="flex-1">
        <DotPattern dotColor="#94a3b8" dotSize={1.2} spacing={20} />

        <section className="relative py-20">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8">
            {/* Back Button */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
              className="mb-8"
            >
              <Link
                to="/examples"
                className="flex items-center text-gray-400 hover:text-[#00d992] transition-colors no-underline text-sm sm:text-base"
              >
                <ArrowLeftIcon className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                Back to Examples
              </Link>
            </motion.div>

            {/* Example Header */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="relative mb-10 overflow-hidden max-w-3xl rounded-3xl border border-solid border-emerald-500/20 bg-gradient-to-br from-emerald-500/20 via-slate-900/70 to-slate-900/30 p-8 shadow-2xl shadow-emerald-600/20"
            >
              <div className="absolute -top-24 -right-16 h-56 w-56 rounded-full bg-emerald-500/30 blur-3xl" />
              <div className="absolute -bottom-12 -left-10 h-48 w-48 rounded-full bg-emerald-400/20 blur-[100px]" />
              <div className="relative z-10 flex flex-col gap-8">
                <div className="space-y-5">
                  <span className="inline-flex items-center gap-2 rounded-full border  border-solid border-emerald-400/40 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-emerald-100">
                    <span className="h-2 w-2 rounded-full bg-emerald-400" /> Featured Example
                  </span>
                  <div>
                    <h1 className="text-3xl sm:text-4xl md:text-[2.75rem] font-bold text-white drop-shadow-md">
                      {example.title}
                    </h1>
                    <p className="mt-3 max-w-2xl text-base leading-relaxed text-slate-200/90">
                      {example.description}
                    </p>
                  </div>
                  {example.tags && example.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-2">
                      {example.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-black/50 px-3 py-1 text-xs font-medium uppercase tracking-wide text-emerald-200"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="flex flex-col gap-3 pt-4 sm:flex-row">
                    {repositoryUrl ? (
                      <a
                        href={repositoryUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center rounded-xl bg-emerald-400 px-5 py-2 text-sm font-semibold text-black shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-300 hover:text-black no-underline"
                      >
                        Source Code
                      </a>
                    ) : null}
                    <a
                      href="https://github.com/VoltAgent/voltagent/tree/main/examples"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center rounded-xl border border-solid border-emerald-400/40 px-5 py-2 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-400/10 no-underline"
                    >
                      Other Mini Examples
                    </a>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Markdown Content */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="flex justify-center"
            >
              <div className="flex w-full max-w-6xl gap-10">
                <div className="flex-1 min-w-0 space-y-6 text-gray-300 [&_strong]:text-white [&_a]:text-[#00d992] [&_a:hover]:text-[#00c182] [&_code]:text-[#00d992] [&_blockquote]:border-l-4 [&_blockquote]:border-[#00d992] [&_blockquote]:pl-4 [&_blockquote]:py-2 [&_blockquote]:italic [&_h2]:text-emerald-400 [&_h3]:text-emerald-400 [&_h4]:text-emerald-400 [&_h5]:text-emerald-400 [&_h6]:text-emerald-400 [&_details]:my-6 [&_details>summary::-webkit-details-marker]:hidden [&_pre]:overflow-x-auto [&_pre]:max-w-full">
                  <MDXProvider components={mdxComponents}>
                    {React.createElement(content)}
                  </MDXProvider>
                </div>
                {tocItems.length > 0 ? (
                  <nav className="sticky top-24 hidden w-64 shrink-0 self-start rounded-2xl border border-solid border-emerald-500/15 bg-gradient-to-br from-slate-950/80 via-slate-950/60 to-emerald-950/50 p-5 text-slate-200/80 shadow-lg shadow-black/20 backdrop-blur xl:block">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-[0.3em] text-emerald-200/90">
                      On this page
                    </p>
                    {renderToc(tocItems)}
                  </nav>
                ) : null}
              </div>
            </motion.div>
          </div>
        </section>
      </main>
    </Layout>
  );
}
