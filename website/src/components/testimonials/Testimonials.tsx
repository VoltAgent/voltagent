// @ts-ignore
import tweetsData from "@site/.docusaurus/fetch-tweets-plugin/default/tweets.json";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArticleCard } from "./ArticleCard";
import { DiscordMessage } from "./DiscordMessage";
import { LinkedInMessage } from "./LinkedInMessage";
import { LinkedInPost } from "./LinkedInPost";
import { StaticTweet } from "./StaticTweet";

// Seamless infinite scroll CSS with calculated values
const scrollAnimation = `
  @keyframes seamlessScrollLeft {
    0% {
      transform: translateX(0);
    }
    100% {
      transform: translateX(-50%);
    }
  }

  @keyframes seamlessScrollRight {
    0% {
      transform: translateX(-50%);
    }
    100% {
      transform: translateX(0);
    }
  }

  .seamless-scroll-left {
    animation: seamlessScrollLeft 80s linear infinite;
    will-change: transform;
  }

  .seamless-scroll-right {
    animation: seamlessScrollRight 100s linear infinite;
    will-change: transform;
  }

  .seamless-scroll-articles {
    animation: seamlessScrollLeft 60s linear infinite;
    will-change: transform;
  }

  .animation-paused {
    animation-play-state: paused;
  }

  /* Pause animations when not visible to save performance */
  .animations-disabled .seamless-scroll-left,
  .animations-disabled .seamless-scroll-right,
  .animations-disabled .seamless-scroll-articles {
    animation-play-state: paused;
  }

  @media (pointer: coarse) {
    .seamless-scroll-left {
      animation-duration: 120s;
    }
    
    .seamless-scroll-right {
      animation-duration: 140s;
    }

    .seamless-scroll-articles {
      animation-duration: 100s;
    }
  }

  /* Reduce animations on low-performance devices */
  @media (prefers-reduced-motion: reduce) {
    .seamless-scroll-left,
    .seamless-scroll-right,
    .seamless-scroll-articles {
      animation-duration: 200s;
    }
  }
`;

const testimonialTweetIds = [
  "1916955895709503681",
  "1930715579155202268",
  "1929706642851193172",
  "1917264060225044707",
  "1950536117549486550",
  "1927072927213596780",
  "1927054751666999592",
  "1924486274448306320",
  "1924303206794059823",
  "1923352273452671399",
  "1920502438215250259",
  "1952223435469566004",
  "1924058575485403362",
  "1916757463426302247",
  "1915200495461028321",
  "1924262217924653243",
];

const linkedInPosts = [
  {
    id: "linkedin-1",
    profileImage: "https://cdn.voltagent.dev/website/testimonials/linkedin-user/luis-avi.jpeg",
    name: "Luis Aviles",
    title: "Senior Frontend Engineer | Full Stack | Angular | JavaScript | TypeScript",
    content:
      "I'm incredibly honored to be one of the top 10 contributors to the VoltAgent open-source AI agent framework! I've been contributing to this project for a few weeks now and it's been a fantastic experience. I'm a firm believer in the power of open-source to drive innovation, and this project is a perfect example of that.",
    url: "https://www.linkedin.com/feed/update/urn:li:activity:7341294748466323457/",
  },
  {
    id: "linkedin-2",
    profileImage: "https://cdn.voltagent.dev/website/testimonials/linkedin-user/emre.jpeg",
    name: "Emre Tezisci",
    title: "Product Marketer | Board Chair | Founder | Nonprofit Leader",
    content:
      "I built a 4-agent AI 'mini-team' to automate Reddit/HN research and draft content (and it kinda worked). This was not a production-ready tool. Just a scrappy experiment using: 🧠 VoltAgent (agent orchestration in TypeScript) 🔧 Composio (plug-and-play Reddit + Hacker News MCP tools) 💬 OpenAI GPT-4o (via Vercel AI SDK)",
    url: "https://www.linkedin.com/feed/update/urn:li:activity:7330969897214062592/",
  },
  {
    id: "linkedin-3",
    profileImage: "https://cdn.voltagent.dev/website/testimonials/linkedin-user/yusuf.jpeg",
    name: "Yusuf Eren",
    title: "Building AI Agents in TypeScript | LLMs | AWS | NestJS | MongoDB DBA | TypeScript",
    content:
      "Just made my first contribution to VoltAgent on GitHub! I added support for xsAI as a voice provider, making it easier to integrate voice features into AI agents. Big thanks to Omer Aplak for giving me this opportunity and trusting me to contribute.",
    url: "https://www.linkedin.com/feed/update/urn:li:activity:7326679429068316674/",
  },
  {
    id: "linkedin-4",
    profileImage: "https://cdn.voltagent.dev/website/testimonials/linkedin-user/zac-ros.jpeg",
    name: "Zac Rosenbauer",
    title: "Co-founder at Joggr | Using AI 🤖 to automate dev docs",
    content:
      "If you are building AI Agents or Agentic flows and your language of choice is TypeScript you 1000% need to checkout this framework 👇 VoltAgent - an open-source TypeScript framework for building and orchestrating AI agents with built-in visual observability and debugging capabilities. Backed by a solid team (Omer Aplak & Necati Ozmen) consisting of the former CTO/founder and head of growth at refine.dev.",
    url: "https://www.linkedin.com/feed/update/urn:li:activity:7341479739112509441/",
  },
];

const discordMessages = [
  {
    username: "Helge Sverre",
    message: "How do you guys have the energy to ship shit so fast",
  },
  {
    username: "Bonjwa",
    message:
      "Whenever I'm feeling down I just know that no matter what, @Omer is always there for me 🤣",
  },
  {
    username: "bemijonathan",
    message:
      "Awesome job @Omer, this is impressive, also fact you started this just 2 weeks ago looking forward to pick a good first issue",
  },
  {
    username: "Gomino",
    message:
      "Hello guys great job on the DX, would love to see the console really working locally (without login required)",
  },
  {
    username: "power_of_zero",
    message:
      "Hi, firstly, I really like what you've done with VoltAgent. I've gave it a spin with Cline/DeepSeek which has done a pretty good job of spinning me up a basic Supervisor + 3 agent setup using Ragie MCP server for retrievals.",
  },
  {
    username: "Eric Muir",
    message:
      "Previously I was building it all with Langchain JS and their observability platform but yours makes tinkering a lot easier.",
  },
];

const linkedInMessages = [
  {
    id: "linkedin-msg-1",
    username: "Can Tecim",
    title: "Senior Backend Developer",
    message:
      "I'm excited to see an innovative, well-designed typescript framework in the AI ecosystem. I hope it grows quickly with the community's support! I'm looking forward to seeing it in action within my project 🙌 .",
    avatar: "", // User will add
    url: "https://www.linkedin.com/feed/update/urn:li:activity:7320019207134273536?commentUrn=urn%3Ali%3Acomment%3A%28activity%3A7320019207134273536%2C7320029299711852546%29&dashCommentUrn=urn%3Ali%3Afsd_comment%3A%287320029299711852546%2Curn%3Ali%3Aactivity%3A7320019207134273536%29",
  },
  {
    id: "linkedin-msg-2",
    username: "Sarah Kim",
    title: "Product Manager",
    message: "That looks fantastic! will try it with the ElevenLabs module in first opportunity.",
    avatar: "", // User will add
    url: "https://www.linkedin.com/feed/update/urn:li:activity:7320007310200770560?commentUrn=urn%3Ali%3Acomment%3A%28activity%3A7320007310200770560%2C7320424868326391809%29&dashCommentUrn=urn%3Ali%3Afsd_comment%3A%287320424868326391809%2Curn%3Ali%3Aactivity%3A7320007310200770560%29",
  },
];

const articles = [
  {
    title: "Building a ChatGPT App with VoltAgent and the Apps SDK",
    coverImage: "https://cdn.voltagent.dev/website/testimonials/community.png",
    excerpt: "Building a ChatGPT App with VoltAgent and the Apps SDK",
    author: "Ekim Cem Kaya",
    url: "https://dev.to/ekimcem/building-a-chatgpt-app-with-voltagent-and-the-apps-sdk-4j21",
    type: "article" as const,
  },
  {
    title: "The Gift of Reasoning: Enhancing Amazon Nova Lite with VoltAgent for Character Quirks",
    coverImage: "https://cdn.voltagent.dev/website/testimonials/community.png",
    excerpt:
      "Exploring how Voltagent revolutionizes AI agent development with full TypeScript support and enterprise-grade features.",
    author: "Marcos Henriquen",
    url: "https://dev.to/aws-builders/the-gift-of-reasoning-enhancing-amazon-nova-lite-with-voltagent-for-character-quirks-3k63",
    type: "article" as const,
  },
  {
    title: "VoltAgent（TypeScript の AIエージェントフレームワーク）を軽く試してみる",
    coverImage: "https://cdn.voltagent.dev/website/testimonials/community.png",
    author: "Yosuke Toyota",
    url: "https://qiita.com/youtoy/items/6990e175e92c54265580",
    type: "article" as const,
  },
  {
    title: "Connected VoltAgent + RAG and my own real intelligence copilot was born",
    type: "youtube" as const,
    videoId: "7m-ijjmPwyo",
    excerpt: "Connected VoltAgent + RAG and my own real intelligence copilot was born",
    url: "https://www.youtube.com/watch?v=7m-ijjmPwyo",
  },
  {
    title: "How to use Voltagent Framework with Gaia AI",
    type: "youtube" as const,
    videoId: "SNxfQFHbYVE",
    excerpt: "How to use Voltagent with Gaia AI",
    url: "https://www.youtube.com/watch?v=SNxfQFHbYVE",
  },
  {
    title: "Creamos un agente que verifica stock con VoltAgent",
    type: "youtube" as const,
    videoId: "HW_cqz_3Q38",
    excerpt: "Creamos un agente que verifica stock con VoltAgent",
    url: "https://www.youtube.com/watch?v=HW_cqz_3Q38",
  },
  {
    title:
      "VoltAgent: This Open-Source TypeScript Framework Makes Building Multi-Agent AI Systems Super Easy 🔥",
    type: "youtube" as const,
    videoId: "IJYgMv1wH30",
    excerpt:
      "VoltAgent: This Open-Source TypeScript Framework Makes Building Multi-Agent AI Systems Super Easy 🔥",
    url: "https://www.youtube.com/watch?v=IJYgMv1wH30",
  },
  {
    title: "Do AI with Voltagent, Composio and R2R",
    type: "youtube" as const,
    videoId: "m4DMNSVtcCE",
    excerpt: "Do AI with Voltagent, Composio and R2R",
    url: "https://www.youtube.com/watch?v=m4DMNSVtcCE",
  },
  {
    title:
      "Integra WhatsApp Business API a tu Agente de Voltagent: Tutorial + Repo de Código en GitHub",
    type: "youtube" as const,
    videoId: "mDKXbcfwCYM",
    excerpt:
      "Integra WhatsApp Business API a tu Agente de Voltagent: Tutorial + Repo de Código en GitHub",
    url: "https://www.youtube.com/watch?v=mDKXbcfwCYM",
  },
  {
    title:
      "【これ最強】AIエージェント開発の「voltagent」が熱い！画面で見やすく、シンプルで柔軟なTypescriptベースのフレームワーク",
    type: "youtube" as const,
    videoId: "5WARn6C9ITM",
    excerpt:
      "【これ最強】AIエージェント開発の「voltagent」が熱い！画面で見やすく、シンプルで柔軟なTypescriptベースのフレームワーク",
    url: "https://www.youtube.com/watch?v=5WARn6C9ITM",
  },
  {
    title: "¿Agentes de IA sin Complicaciones? ¡Este Framework es la Clave!",
    type: "youtube" as const,
    videoId: "Om03tXjDfJs",
    excerpt: "¿Agentes de IA sin Complicaciones? ¡Este Framework es la Clave!",
    url: "https://www.youtube.com/watch?v=Om03tXjDfJs",
  },
  {
    title: "0からTypeScriptでAIエージェントを開発する実践チュートリアル【React/VoltAgent】",
    type: "youtube" as const,
    videoId: "Jw3AqIYNLbs",
    excerpt: "0からTypeScriptでAIエージェントを開発する実践チュートリアル【React/VoltAgent】",
    url: "https://www.youtube.com/watch?v=Jw3AqIYNLbs",
  },
];

export function Testimonials() {
  // Check if tweets data is loaded
  useEffect(() => {
    console.log("Tweet data loaded:", tweetsData);
    console.log("Type of tweetsData:", typeof tweetsData);
    console.log("Tweet IDs:", Object.keys(tweetsData || {}));
  }, []);

  // Animation control states for each row
  const [isTweetsRowPaused, setIsTweetsRowPaused] = useState(false);
  const [isDiscordRowPaused, setIsDiscordRowPaused] = useState(false);
  const [isArticlesRowPaused, setIsArticlesRowPaused] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  // Refs for each scrolling row
  const tweetsRowRef = useRef<HTMLDivElement>(null);
  const discordRowRef = useRef<HTMLDivElement>(null);
  const articlesRowRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Intersection Observer to pause animations when not visible
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { threshold: 0.1 },
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Create mixed content for seamless scrolling
  const mixedContent = [];
  const maxLength = Math.max(testimonialTweetIds.length, linkedInPosts.length);

  for (let i = 0; i < maxLength; i++) {
    if (i < testimonialTweetIds.length) {
      mixedContent.push({
        type: "tweet" as const,
        id: testimonialTweetIds[i],
        key: `tweet-${testimonialTweetIds[i]}`,
      });
    }

    if (i < linkedInPosts.length) {
      mixedContent.push({
        type: "linkedin" as const,
        data: linkedInPosts[i],
        key: `linkedin-${linkedInPosts[i].id}`,
      });
    }
  }

  // Create mixed Discord/LinkedIn messages content
  const mixedDiscordContent = [];
  const maxDiscordLength = Math.max(discordMessages.length, linkedInMessages.length);

  for (let i = 0; i < maxDiscordLength; i++) {
    if (i < discordMessages.length) {
      mixedDiscordContent.push({
        type: "discord" as const,
        data: discordMessages[i],
        key: `discord-${discordMessages[i].username}-${i}`,
      });
    }

    if (i < linkedInMessages.length) {
      mixedDiscordContent.push({
        type: "linkedinmsg" as const,
        data: linkedInMessages[i],
        key: `linkedinmsg-${linkedInMessages[i].id}`,
      });
    }
  }

  // Minimal duplication - just one copy for seamless effect
  const seamlessMixedContent = [...mixedContent, ...mixedContent];
  const seamlessMixedDiscordContent = [...mixedDiscordContent, ...mixedDiscordContent];
  const seamlessArticles = [...articles, ...articles];

  // Event handlers for tweets row (scrolling left)
  const handleTweetsRowTouchStart = useCallback(() => setIsTweetsRowPaused(true), []);
  const handleTweetsRowTouchEnd = useCallback(() => setIsTweetsRowPaused(false), []);
  const handleTweetsRowMouseEnter = useCallback(() => setIsTweetsRowPaused(true), []);
  const handleTweetsRowMouseLeave = useCallback(() => setIsTweetsRowPaused(false), []);

  // Event handlers for discord row (scrolling right)
  const handleDiscordRowTouchStart = useCallback(() => setIsDiscordRowPaused(true), []);
  const handleDiscordRowTouchEnd = useCallback(() => setIsDiscordRowPaused(false), []);
  const handleDiscordRowMouseEnter = useCallback(() => setIsDiscordRowPaused(true), []);
  const handleDiscordRowMouseLeave = useCallback(() => setIsDiscordRowPaused(false), []);

  // Event handlers for articles row (scrolling left)
  const handleArticlesRowTouchStart = useCallback(() => setIsArticlesRowPaused(true), []);
  const handleArticlesRowTouchEnd = useCallback(() => setIsArticlesRowPaused(false), []);
  const handleArticlesRowMouseEnter = useCallback(() => setIsArticlesRowPaused(true), []);
  const handleArticlesRowMouseLeave = useCallback(() => setIsArticlesRowPaused(false), []);

  // Add touch event listeners
  useEffect(() => {
    // Tweets row listeners
    const tweetsElement = tweetsRowRef.current;
    if (tweetsElement) {
      tweetsElement.addEventListener("touchstart", handleTweetsRowTouchStart, {
        passive: true,
      });
      tweetsElement.addEventListener("touchend", handleTweetsRowTouchEnd, {
        passive: true,
      });
    }

    // Discord row listeners
    const discordElement = discordRowRef.current;
    if (discordElement) {
      discordElement.addEventListener("touchstart", handleDiscordRowTouchStart, { passive: true });
      discordElement.addEventListener("touchend", handleDiscordRowTouchEnd, {
        passive: true,
      });
    }

    // Articles row listeners
    const articlesElement = articlesRowRef.current;
    if (articlesElement) {
      articlesElement.addEventListener("touchstart", handleArticlesRowTouchStart, {
        passive: true,
      });
      articlesElement.addEventListener("touchend", handleArticlesRowTouchEnd, {
        passive: true,
      });
    }

    return () => {
      // Clean up tweets row listeners
      if (tweetsElement) {
        tweetsElement.removeEventListener("touchstart", handleTweetsRowTouchStart);
        tweetsElement.removeEventListener("touchend", handleTweetsRowTouchEnd);
      }

      // Clean up discord row listeners
      if (discordElement) {
        discordElement.removeEventListener("touchstart", handleDiscordRowTouchStart);
        discordElement.removeEventListener("touchend", handleDiscordRowTouchEnd);
      }

      // Clean up articles row listeners
      if (articlesElement) {
        articlesElement.removeEventListener("touchstart", handleArticlesRowTouchStart);
        articlesElement.removeEventListener("touchend", handleArticlesRowTouchEnd);
      }
    };
  }, [
    handleTweetsRowTouchStart,
    handleTweetsRowTouchEnd,
    handleDiscordRowTouchStart,
    handleDiscordRowTouchEnd,
    handleArticlesRowTouchStart,
    handleArticlesRowTouchEnd,
  ]);

  return (
    <div
      ref={containerRef}
      className={`relative max-w-9xl xs:px-4 lg:px-8 mx-auto landing-xs:mb-16 landing-md:mb-36 ${
        !isVisible ? "animations-disabled" : ""
      }`}
    >
      <div className="mb-8 text-left max-w-xl mx-4">
        <h2 className="landing-xs:text-sm landing-md:text-lg landing-xs:mb-2 landing-md:mb-4 font-semibold  text-main-emerald tracking-wide uppercase">
          Fast Growing Community
        </h2>
        <p className="mt-1 landing-xs:text-2xl landing-md:text-4xl landing-xs:mb-2 landing-md:mb-4 landing-xs:font-bold landing-md:font-extrabold text-white sm:text-5xl sm:tracking-tight">
          What are they saying?
        </p>
      </div>
      <style>{scrollAnimation}</style>

      {/* Only render animations if component is visible */}
      {isVisible && (
        <>
          {/* Tweets Row - Scrolling Left */}
          <div className="relative mb-1">
            <div
              ref={tweetsRowRef}
              className="flex overflow-hidden"
              style={{
                width: "100%",
                maxWidth: "100%",
                scrollbarWidth: "none",
                msOverflowStyle: "none",
                WebkitOverflowScrolling: "touch",
                WebkitMaskImage:
                  "linear-gradient(90deg, transparent 0%, black 5%, black 95%, transparent 100%)",
                maskImage:
                  "linear-gradient(90deg, transparent 0%, black 5%, black 95%, transparent 100%)",
              }}
              onMouseEnter={handleTweetsRowMouseEnter}
              onMouseLeave={handleTweetsRowMouseLeave}
            >
              <div
                className={`flex space-x-6 py-4 seamless-scroll-left ${
                  isTweetsRowPaused ? "animation-paused" : ""
                }`}
              >
                {seamlessMixedContent.map((item, index) => (
                  <div key={`${item.key}-${index}`} className="flex-shrink-0 w-80">
                    {item.type === "tweet" ? (
                      <StaticTweet tweet={tweetsData?.[item.id]} />
                    ) : (
                      <LinkedInPost
                        profileImage={item.data.profileImage}
                        name={item.data.name}
                        title={item.data.title}
                        content={item.data.content}
                        url={item.data.url}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Discord Messages Row - Scrolling Right */}
          <div className="relative mb-1">
            <div
              ref={discordRowRef}
              className="flex overflow-hidden"
              style={{
                width: "100%",
                maxWidth: "100%",
                scrollbarWidth: "none",
                msOverflowStyle: "none",
                WebkitOverflowScrolling: "touch",
                WebkitMaskImage:
                  "linear-gradient(90deg, transparent 0%, black 5%, black 95%, transparent 100%)",
                maskImage:
                  "linear-gradient(90deg, transparent 0%, black 5%, black 95%, transparent 100%)",
              }}
              onMouseEnter={handleDiscordRowMouseEnter}
              onMouseLeave={handleDiscordRowMouseLeave}
            >
              <div
                className={`flex space-x-6 py-4 seamless-scroll-right ${
                  isDiscordRowPaused ? "animation-paused" : ""
                }`}
              >
                {seamlessMixedDiscordContent.map((item, index) => (
                  <div key={`${item.key}-${index}`} className="flex-shrink-0 w-80">
                    {item.type === "discord" ? (
                      <DiscordMessage
                        username={item.data.username}
                        discriminator={item.data.discriminator}
                        message={item.data.message}
                        timestamp={item.data.timestamp}
                      />
                    ) : (
                      <LinkedInMessage
                        username={item.data.username}
                        title={item.data.title}
                        message={item.data.message}
                        timestamp={item.data.timestamp}
                        avatar={item.data.avatar}
                        url={item.data.url}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Articles Section */}
          <div className="mt-1">
            <div className="relative">
              <div
                ref={articlesRowRef}
                className="flex overflow-hidden"
                style={{
                  width: "100%",
                  maxWidth: "100%",
                  scrollbarWidth: "none",
                  msOverflowStyle: "none",
                  WebkitOverflowScrolling: "touch",
                  WebkitMaskImage:
                    "linear-gradient(90deg, transparent 0%, black 5%, black 95%, transparent 100%)",
                  maskImage:
                    "linear-gradient(90deg, transparent 0%, black 5%, black 95%, transparent 100%)",
                }}
                onMouseEnter={handleArticlesRowMouseEnter}
                onMouseLeave={handleArticlesRowMouseLeave}
              >
                <div
                  className={`flex space-x-6 py-4 seamless-scroll-articles ${
                    isArticlesRowPaused ? "animation-paused" : ""
                  }`}
                >
                  {seamlessArticles.map((article, index) => (
                    <div
                      key={`article-${article.title.replace(/\s+/g, "-").toLowerCase()}-${index}`}
                      className="flex-shrink-0 w-80"
                    >
                      <ArticleCard
                        title={article.title}
                        coverImage={article.coverImage}
                        excerpt={article.excerpt}
                        author={article.author}
                        publication={(article as any).publication}
                        date={(article as any).date}
                        readTime={(article as any).readTime}
                        url={article.url}
                        type={article.type}
                        videoId={article.videoId}
                        channel={(article as any).channel}
                        views={(article as any).views}
                        duration={(article as any).duration}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
