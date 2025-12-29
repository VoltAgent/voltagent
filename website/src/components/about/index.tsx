import confetti from "canvas-confetti";
import React, { useEffect, useState } from "react";
import { LinkedInLogo } from "../../../static/img/logos/linkedin";
import { XLogo } from "../../../static/img/logos/x";
import { DotPattern } from "../ui/dot-pattern";

interface Contributor {
  login: string;
  avatar_url: string;
  html_url: string;
  contributions: number;
}

interface Stargazer {
  login: string;
  avatar_url: string;
}

const SUDO_CODE = ["s", "u", "d", "o"];

// Remove inline SVG components since we're now importing them
// const TwitterIcon = () => (...)
// const LinkedInIcon = () => (...)

// Skeleton loaders for different content types
const SkeletonText = ({ width = "100%", height = "1rem" }) => (
  <div className="animate-pulse bg-gray-600/30 rounded" style={{ width, height }} />
);

const SkeletonAvatar = ({ size = "w-12 h-12" }) => (
  <div className={`${size} rounded-full animate-pulse bg-gray-600/30 mb-2`} />
);

export function Manifesto() {
  const [_, setKeys] = useState<string[]>([]);
  const [showEasterEgg, setShowEasterEgg] = useState(false);
  const [contributors, setContributors] = useState<Contributor[]>([]);
  const [stars, setStars] = useState<number>(0);
  const [recentStargazers, setRecentStargazers] = useState<Stargazer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      setKeys((prevKeys) => {
        const updatedKeys = [...prevKeys, key];
        if (updatedKeys.length > SUDO_CODE.length) {
          updatedKeys.shift();
        }
        if (updatedKeys.join("") === SUDO_CODE.join("")) {
          setShowEasterEgg(true);
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
          });
          setTimeout(() => setShowEasterEgg(false), 60000);
        }
        return updatedKeys;
      });
    };

    // Fetch contributors and stargazers data
    const fetchData = async () => {
      setLoading(true);
      try {
        const [contributorsResponse, loveResponse] = await Promise.all([
          fetch("https://love.voltagent.dev/api/contributors"),
          fetch("https://love.voltagent.dev/api/love"),
        ]);

        const contributorsData = await contributorsResponse.json();
        const loveData = await loveResponse.json();

        setContributors(contributorsData.contributors);
        setStars(loveData.stars);
        setRecentStargazers(loveData.recent_stargazers);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleEasterEggClose = () => {
    setShowEasterEgg(false);
  };

  return (
    <div className="relative max-w-4xl mx-auto px-4 [&_a]:no-underline">
      <DotPattern dotColor="#94a3b8" dotSize={1.2} spacing={20} />
      <div className="mb-6">
        <h2 className="landing-xs:text-sm landing-md:text-lg landing-xs:mb-2 landing-md:mb-3 font-semibold text-main-emerald tracking-wide uppercase">
          About us
        </h2>
        <p className="mt-1 landing-xs:text-2xl landing-md:text-3xl landing-xs:mb-2 landing-md:mb-3 landing-xs:font-bold landing-md:font-extrabold text-white sm:tracking-tight">
          Why We Built VoltAgent
        </p>
        <p className="max-w-2xl landing-md:text-sm landing-xs:text-xs text-[#dcdcdc]">
          Simplifying AI in the JavaScript ecosystem.
        </p>
      </div>

      {/* Main Content */}
      <div className="flex flex-col space-y-4 max-w-4xl">
        <p className="text-[#dcdcdc] leading-relaxed">
          We're developers, like you, and we started this project based on our own experiences.
          We've built over 15 open-source projects before this, and each one taught us something
          new. Our biggest project, Refine, showed us how powerful working with a community can be.
          During our time building Refine - one of us as co-founder and CTO, the other as Growth
          Lead - we saw amazing things happen when the community came together. That experience
          changed us, and we're incredibly thankful to everyone in the Refine community.
        </p>

        <p className="text-[#dcdcdc] leading-relaxed">
          Now, we're starting something new and exciting: VoltAgent. We know AI development can
          often feel like working with a confusing "black box," regardless of the language. However,
          the AI ecosystem is heavily dominated by Python, which has more mature tools and
          established practices. We felt this left JavaScript developers without adequate solutions.
          That's why we're building VoltAgent – to bring better clarity and best practices
          specifically to the JavaScript AI world.
        </p>

        <p className="text-[#dcdcdc] leading-relaxed">
          We looked into No-Code tools too. Their visual approach to making AI less complex was
          interesting. Building workflows visually was neat and made things easier to understand.
          However, we quickly ran into problems: we felt locked in and couldn't customize things the
          way we wanted. We realized we needed the flexibility of code, but also the clear view that
          visual tools provided.
        </p>

        <p className="text-[#dcdcdc] leading-relaxed">
          And that's why VoltAgent exists. We're creating the tool we always wanted – one that
          combines the great developer experience you get with code, and the easy-to-understand
          insights from No-Code tools. Our goal is to make AI development easier, clearer, and more
          powerful, and we want to build it together with the community. We're just getting started
          and we're excited to have you join us.
        </p>
        <p className="text-[#dcdcdc] leading-relaxed">
          Thanks to all the amazing tools in the AI development and observability ecosystem that
          inspired us.
        </p>
      </div>

      {/* Team Section */}
      <div className="mt-16 border-t border-white/10 pt-12">
        <h2 className="landing-xs:text-sm landing-md:text-lg text-center landing-xs:mb-2 landing-md:mb-3 font-semibold text-main-emerald tracking-wide uppercase">
          Team
        </h2>

        <div className="grid grid-cols-2 place-items-center gap-6 sm:gap-8 md:gap-12 max-w-3xl mx-auto mt-6">
          {/* Static team members, no loading needed */}
          <div className="flex flex-col items-center text-center">
            <div className="w-32 h-32 sm:w-40 sm:h-40 md:w-48 md:h-48 rounded-full mb-4 overflow-hidden border-2 border-main-emerald/40">
              <img
                src="https://cdn.voltagent.dev/website/team/omer.jpeg"
                alt="Omer Aplak"
                className="w-full h-full object-cover"
              />
            </div>
            <span className="text-white font-medium text-lg">Omer Aplak</span>
            <p className="text-main-emerald text-sm mt-1"> CEO</p>
            <div className="flex space-x-3 mt-0">
              <a
                href="https://www.linkedin.com/in/omer-aplak-14b87099/"
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="text-gray-400 hover:text-main-emerald transition-colors"
                aria-label="LinkedIn Profile"
              >
                <LinkedInLogo className="w-5 h-5" />
              </a>
              <a
                href="https://x.com/omerfarukaplak/"
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="text-gray-400 hover:text-main-emerald transition-colors"
                aria-label="Twitter Profile"
              >
                <XLogo className="w-5 h-5" />
              </a>
            </div>
          </div>

          <div className="flex flex-col items-center text-center">
            <div className="w-32 h-32 sm:w-40 sm:h-40 md:w-48 md:h-48 rounded-full mb-4  overflow-hidden border-2 border-main-emerald/40">
              <img
                src="https://cdn.voltagent.dev/website/team/necati.png"
                alt="Necati Ozmen"
                className="w-full h-full object-cover"
              />
            </div>
            <span className="text-white font-medium text-lg">Necati Ozmen</span>
            <p className="text-main-emerald text-sm mt-1">CMO</p>
            <div className="flex space-x-3 mt-0">
              <a
                href="https://www.linkedin.com/in/necatiozmen/"
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="text-gray-400 hover:text-main-emerald transition-colors"
                aria-label="LinkedIn Profile"
              >
                <LinkedInLogo className="w-5 h-5" />
              </a>
              <a
                href="https://x.com/necatiozmen3/"
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="text-gray-400 hover:text-main-emerald transition-colors"
                aria-label="Twitter Profile"
              >
                <XLogo className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Angel Investors Section */}
      <div className="mt-16 border-t border-white/10 pt-12">
        <h2 className="landing-xs:text-sm landing-md:text-lg text-center landing-xs:mb-2 landing-md:mb-3 font-semibold text-main-emerald tracking-wide uppercase">
          Angel Investors
        </h2>

        <div className="grid grid-cols-2 place-items-center gap-6 sm:gap-8 md:gap-12 max-w-3xl mx-auto mt-6">
          {/* Static angel investors, no loading needed */}
          <div className="flex flex-col items-center text-center">
            <div className="w-32 h-32 sm:w-40 sm:h-40 md:w-48 md:h-48 rounded-full overflow-hidden mb-4 border-2 border-main-emerald/40">
              <img
                src="https://cdn.voltagent.dev/website/team/emre.jpeg"
                alt="Emre Baran"
                className="w-full h-full object-cover"
              />
            </div>
            <span className="text-white font-medium text-lg">Emre Baran</span>
            <p className="text-main-emerald text-sm mt-1">Co-Founder & CEO at Cerbos</p>
            <div className="flex space-x-3 mt-0">
              <a
                href="https://www.linkedin.com/in/emrebaran/"
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="text-gray-400 hover:text-main-emerald transition-colors"
                aria-label="LinkedIn Profile"
              >
                <LinkedInLogo className="w-5 h-5" />
              </a>
              <a
                href="https://x.com/emre/"
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="text-gray-400 hover:text-main-emerald transition-colors"
                aria-label="Twitter Profile"
              >
                <XLogo className="w-5 h-5" />
              </a>
            </div>
          </div>

          <div className="flex flex-col items-center text-center">
            <div className="w-32 h-32 sm:w-40 sm:h-40 md:w-48 md:h-48 rounded-full overflow-hidden mb-4 border-2 border-main-emerald/40">
              <img
                src="https://cdn.voltagent.dev/website/team/umur.jpeg"
                alt="Umur Cubukcu"
                className="w-full h-full object-cover"
              />
            </div>
            <span className="text-white font-medium text-lg">Umur Cubukcu </span>
            <p className="text-main-emerald text-sm mt-1">Co-Founder at Ubicloud</p>
            <div className="flex space-x-3 mt-0">
              <a
                href="https://www.linkedin.com/in/umurc/"
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="text-gray-400 hover:text-main-emerald transition-colors"
                aria-label="LinkedIn Profile"
              >
                <LinkedInLogo className="w-5 h-5" />
              </a>
              <a
                href="https://x.com/umurc/"
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="text-gray-400 hover:text-main-emerald transition-colors"
                aria-label="Twitter Profile"
              >
                <XLogo className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* GitHub Contributors Section */}
      <div className="mt-16 border-t border-white/10 pt-12">
        <h2 className="landing-xs:text-sm landing-md:text-lg text-center landing-xs:mb-2 landing-md:mb-3 font-semibold text-main-emerald tracking-wide uppercase">
          GitHub Contributors
        </h2>
        <p className="text-center max-w-2xl mx-auto landing-md:text-sm landing-xs:text-xs text-[#dcdcdc] mb-6">
          Thanks to all the community developers who help us to improve VoltAgent!
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3 sm:gap-4 max-w-4xl mx-auto mt-6">
          {loading
            ? // Skeleton loading for contributors
              Array(13)
                .fill(0)
                .map((_, i) => (
                  <div
                    key={`skeleton-contributor-${i}-${Date.now()}`}
                    className="flex flex-col items-center"
                  >
                    <SkeletonAvatar />
                    <SkeletonText width="60%" height="0.75rem" />
                  </div>
                ))
            : contributors?.slice(3).map((contributor) => (
                <a
                  key={contributor.login}
                  href={contributor.html_url}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="group flex flex-col items-center no-underline text-decoration-none"
                >
                  <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-main-emerald/40 mb-2 group-hover:border-main-emerald transition-all">
                    <img
                      src={contributor.avatar_url}
                      alt={contributor.login}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <span className="text-[#dcdcdc] text-xs group-hover:text-main-emerald transition-colors no-underline">
                    {contributor.login}
                  </span>
                </a>
              ))}
        </div>
      </div>

      {/* Contribute CTA */}
      <div className="flex justify-center mt-8">
        <a
          href="https://voltagent.dev/docs/community/contributing/"
          className="inline-flex items-center no-underline bg-emerald-400/10 text-emerald-400 
          border-solid border border-emerald-400/20 text-sm font-semibold rounded transition-colors cursor-pointer hover:bg-emerald-400/20"
          target="_blank"
          rel="noopener noreferrer nofollow"
          style={{
            backdropFilter: "blur(4px)",
            WebkitBackdropFilter: "blur(4px)",
          }}
        >
          <div className="flex items-center justify-center px-6 py-2">
            <svg
              className="w-5 h-5 mr-2"
              fill="currentColor"
              viewBox="0 0 20 20"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
            <span>How to Contribute?</span>
          </div>
        </a>
      </div>

      {/* GitHub Stargazers Section */}
      <div className="mt-16 border-t border-white/10 pt-12">
        <h2 className="landing-xs:text-sm landing-md:text-lg text-center landing-xs:mb-2 landing-md:mb-3 font-semibold text-main-emerald tracking-wide uppercase">
          Supporters
        </h2>
        <p className="text-center max-w-2xl mx-auto landing-md:text-sm landing-xs:text-xs text-[#dcdcdc] mb-6">
          <span className="text-main-emerald font-semibold">{loading ? "..." : stars}</span> GitHub
          stars and growing! Recent supporters:
        </p>

        <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-10 gap-3 sm:gap-4 max-w-4xl mx-auto mt-6">
          {loading ? (
            // Skeleton loading for stargazers
            Array(10)
              .fill(0)
              .map((_, i) => (
                <div key={`skeleton-stargazer-${i}-${Date.now()}`} className="flex justify-center">
                  <SkeletonAvatar />
                </div>
              ))
          ) : (
            <>
              {recentStargazers?.slice(0, 9).map((stargazer) => (
                <a
                  key={stargazer.login}
                  href={`https://github.com/${stargazer.login}`}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="group no-underline text-decoration-none"
                >
                  <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-main-emerald/30 group-hover:border-main-emerald transition-all">
                    <img
                      src={stargazer.avatar_url}
                      alt={stargazer.login}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </a>
              ))}
              {/* Last cell showing remaining count */}
              <a
                href="https://github.com/VoltAgent/voltagent/stargazers"
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="group no-underline text-decoration-none"
              >
                <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-main-emerald/30 group-hover:border-main-emerald transition-all bg-emerald-400/20 flex items-center justify-center">
                  <div className="text-main-emerald font-semibold text-xs">+{stars - 9}</div>
                </div>
              </a>
            </>
          )}
        </div>

        {/* Contribute CTA */}
        <div className="flex justify-center mt-8">
          <a
            href="https://github.com/VoltAgent/voltagent/"
            className="inline-flex items-center  w-[205px] no-underline bg-emerald-400/10 text-emerald-400 
            border-solid border border-emerald-400/20 text-sm  font-semibold rounded transition-colors cursor-pointer hover:bg-emerald-400/20 group"
            target="_blank"
            rel="noopener noreferrer nofollow"
            style={{
              backdropFilter: "blur(4px)",
              WebkitBackdropFilter: "blur(4px)",
            }}
          >
            <div className="flex items-center  w-full justify-center px-3 py-2">
              <svg
                className="w-5 h-5 mr-2 text-emerald-400 group-hover:text-yellow-400 transition-colors"
                fill="currentColor"
                viewBox="0 0 20 20"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <span className="block group-hover:hidden">How to Support?</span>
              <span className="hidden group-hover:block">Star us on GitHub</span>
            </div>
          </a>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center mt-16 pt-8 border-t border-white/10">
        <p className="font-medium text-white mb-2 text-sm">VoltAgent Team</p>
        <p className="text-xs text-[#dcdcdc] font-mono">Permission denied? Try sudo...</p>
      </div>

      {/* Easter Egg Modal */}
      {showEasterEgg && (
        <dialog
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={handleEasterEggClose}
          onKeyDown={(e) => e.key === "Escape" && handleEasterEggClose()}
          open
        >
          <div
            className="bg-gray-800 p-5 rounded-xl max-w-2xl w-full text-left shadow-xl border border-gray-700 flex flex-col"
            style={{ fontFamily: "sans-serif" }}
          >
            {/* Chat Header */}
            <div className="text-center mb-4 pb-3 border-b border-gray-600">
              <h3 className="text-lg font-medium text-white">VoltAgent Insights ✨</h3>
            </div>

            {/* Chat Body - Added max height and overflow */}
            <div className="space-y-4 text-sm max-h-[70vh] overflow-y-auto pr-2 flex-grow custom-scrollbar">
              {/* Fun Facts Section (as system message/block) */}
              <div className="p-3 rounded-lg bg-gray-700/60">
                <p className="text-teal-400 font-semibold mb-2 text-[13px]">Did you know?</p>
                {/* Kept monospace for facts list for alignment */}
                <pre className="whitespace-pre-wrap text-gray-300 text-xs font-mono leading-relaxed">
                  {`[1] First VoltAgent prototype was sketched on a coffee shop napkin ☕️
[2] Debugging LLM hallucinations took way more coffee than expected...
[3] We argued for 3 days straight about visualizing agent state 🤔
[4] Our internal Slack bot crashed parsing a 50-level nested JSON response
[5] We almost named the project 'JSAgentFlow' (good call changing it!)
[6] Most complex test agent had 12 interconnected nodes 🤯
[7] The 'aha!' moment for observability came during a late-night debugging session 🔥
[8] Lines of JS code written for VoltAgent: Still counting... and refactoring!
[9] Favorite team debugging snack: Probably gummy bears 🐻
[10] We truly believe JS deserves first-class AI tooling! 🚀`}
                </pre>
              </div>

              {/* Benchmark Section (as another system message/block) */}
              <div className="p-3 rounded-lg bg-gray-700/60">
                <p className="text-teal-400 font-semibold mb-2 text-[13px]">
                  Agent Development Benchmark (Conceptual):
                </p>
                {/* Kept monospace for table */}
                <pre className="text-gray-300 text-xs font-mono">
                  {`
┌────────────────────┬───────────────┬──────────────┐
│ Metric             │ Manual JS       │ VoltAgent  │
├────────────────────┼───────────────┼──────────────┤
│ Agent Setup Time   │    ~4 hours   │   ~15 mins   │
│ Debugging Time     │   ??? hours   │   ~30 mins   │
│ Observability      │ Low (console) │  High (UI)   │
│ State Mgmt Lines   │    200+ LoC   │    ~20 LoC   │
│ Iteration Speed    │      Slow     │     Fast     │
└────────────────────┴───────────────┴──────────────┘`}
                </pre>
              </div>

              {/* Final bot message */}
              <div className="p-3 rounded-lg bg-gradient-to-r from-emerald-600/30 to-sky-600/30 text-gray-300 text-xs italic">
                VoltAgent aims to bring this level of clarity and speed to your AI projects!
              </div>
            </div>

            {/* Footer - Updated text */}
            <div className="text-gray-500 text-xs mt-4 text-center pt-3 border-t border-gray-600">
              Press ESC or click outside to close
            </div>
          </div>
        </dialog>
      )}
    </div>
  );
}
