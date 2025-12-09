import { ChevronRightIcon } from "@heroicons/react/24/solid";
import React from "react";

// Function to extract date from slug directory format (YYYY-MM-DD-...) - Assuming this logic exists elsewhere or is simple enough
const getDateFromSlugDir = (slugDir: string): string => {
  const dateMatch = slugDir.match(/^(\d{4}-\d{2}-\d{2})/);
  return dateMatch ? dateMatch[1] : new Date().toISOString().split("T")[0]; // Fallback to today
};

// Function to truncate text after specified number of words
const truncateByWords = (text: string, wordCount = 12): string => {
  const words = text.split(" ");
  if (words.length <= wordCount) return text;
  return `${words.slice(0, wordCount).join(" ")}...`;
};

// TODO: Ideally, fetch blog post data dynamically or from a build step
// instead of hardcoding it here. Author details should also be linked more robustly.
type BlogPost = {
  id: string;
  title: string;
  excerpt: string;
  date: string;
  author: {
    name: string;
    avatar: string;
  };
  slug: string;
};

// Remove FeaturedBlogProps if className is the only prop and is removed
// interface FeaturedBlogProps {
//   className?: string;
// }

const REAL_POSTS: BlogPost[] = [
  {
    id: "1",
    title: "LLM Evaluation - Measuring AI Model Performance",
    excerpt:
      "Learn practical approaches to evaluate large language models, from automatic metrics to human assessment.",
    date: getDateFromSlugDir("2025-07-20-llm-evaluation"),
    author: {
      name: "Necati Ozmen",
      avatar: "https://avatars.githubusercontent.com/u/18739364?v=4",
    },
    slug: "llm-evaluation",
  },
  {
    id: "2",
    title: "Vector Databases and LLM's - Why They Need Each Other",
    excerpt:
      "Understanding how vector databases and LLMs work together, why they complement each other.",
    date: getDateFromSlugDir("2025-09-08-vector-databases-llms"),
    author: {
      name: "Necati Ozmen",
      avatar: "https://avatars.githubusercontent.com/u/18739364?v=4",
    },
    slug: "vector-database",
  },
  {
    id: "3",
    title: "LLM Guardrails - Safe and Secure AI",
    excerpt:
      "Discover practical ways to make your AI applications safer and more reliable with LLM guardrails.",
    date: getDateFromSlugDir("2025-08-07-llm-guardrails"),
    author: {
      name: "Omer Aplak",
      avatar: "https://avatars.githubusercontent.com/u/1110414?v=4",
    },
    slug: "llm-guardrails",
  },
];

// Remove className from props destructuring
export const FeaturedBlog = () => {
  return (
    <section className="relative w-full overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 landing-xs:mb-12 md:mb-24 landing-md:mb-36">
        <div className="mb-8 ">
          <h2 className="landing-xs:text-sm landing-md:text-lg landing-xs:mb-2 landing-md:mb-4 font-semibold text-main-emerald tracking-wide uppercase">
            Blog
          </h2>
          <p className="mt-1 landing-xs:text-2xl md:text-3xl landing-md:text-4xl landing-xs:mb-2 landing-md:mb-4 landing-xs:font-bold landing-md:font-extrabold text-white sm:text-5xl sm:tracking-tight">
            All about AI Agents
          </p>
          <p className="max-w-3xl landing-md:text-xl landing-xs:text-md text-gray-400">
            We are sharing our knowledge about AI Agents.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 md:gap-6 lg:gap-8">
          {REAL_POSTS.map((post) => (
            <a
              key={post.id}
              href={`/blog/${post.slug}/`}
              target="_blank"
              rel="noreferrer"
              className="group p-4 sm:p-5 md:p-6 rounded-lg border border-solid border-white/10 no-underline hover:border-gray-600 transition-colors flex flex-col h-full"
            >
              <div className="flex items-center justify-between mb-3 sm:mb-4 md:mb-5">
                <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                  <img
                    src={post.author.avatar}
                    alt={post.author.name}
                    className="w-6 h-6 sm:w-7 sm:h-7 rounded-full"
                  />
                  <span className="text-xs sm:text-sm text-gray-400 truncate max-w-[80px] sm:max-w-none">
                    {post.author.name}
                  </span>
                  <span className="text-xs sm:text-sm text-gray-500 hidden sm:inline-block">•</span>
                  <time className="text-xs sm:text-sm text-gray-400 whitespace-nowrap">
                    {new Date(post.date).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </time>
                </div>
                <ChevronRightIcon className="h-4 w-4 sm:h-5 sm:w-5 text-white group-hover:translate-x-1 transition-transform flex-shrink-0 ml-2" />
              </div>

              <h3 className="landing-xs:text-sm md:text-base landing-lg:text-lg font-semibold leading-tight mb-3 sm:mb-4 text-main-emerald overflow-hidden">
                {truncateByWords(post.title, 7)}
              </h3>

              <p className="text-gray-300 mb-0 text-xs sm:text-sm line-clamp-2 landing-sm:h-[2.7rem] landing-md:h-[3.2rem] h-[2.4rem] overflow-hidden">
                {truncateByWords(post.excerpt, 10)}
              </p>
            </a>
          ))}
        </div>

        <div className="mt-4 sm:mt-6 md:mt-8 flex justify-center">
          <a
            href="/blog"
            className="group flex items-center py-2 sm:py-3 px-3 sm:px-4 border border-white/10 rounded-lg hover:border-gray-600 transition-colors no-underline"
          >
            <span className="text-sm sm:text-base text-main-emerald font-medium mr-2">
              Read all posts
            </span>
            <ChevronRightIcon className="h-3 w-3 sm:h-4 sm:w-4 text-main-emerald group-hover:translate-x-1 transition-transform" />
          </a>
        </div>
      </div>
    </section>
  );
};
