import {
  AdjustmentsHorizontalIcon,
  FunnelIcon,
  ServerStackIcon,
  SparklesIcon,
  Square3Stack3DIcon,
} from "@heroicons/react/24/outline";
import { useMediaQuery } from "@site/src/hooks/use-media-query";
import { RagExample } from "./rag-animation";
import { RagMobile } from "./rag-mobile";

export function Rag() {
  const isMobile = useMediaQuery("(max-width: 768px)");

  return (
    <div className="relative w-full overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 landing-xs:mb-16 landing-md:mb-36">
        <div className="mb-8 ">
          <h2 className="landing-xs:text-sm landing-md:text-lg landing-xs:mb-2 landing-md:mb-4 font-semibold  text-amber-500 tracking-wide uppercase">
            RAG
          </h2>
          <p className="mt-1 landing-xs:text-2xl landing-md:text-4xl landing-xs:mb-2 landing-md:mb-4 landing-xs:font-bold landing-md:font-extrabold text-white sm:text-5xl sm:tracking-tight">
            Accurate and context-aware responses
          </p>
          <p className="max-w-3xl  landing-md:text-xl  landing-xs:text-md text-gray-400">
            For advanced querying and dynamic analysis, integrate data into a
            knowledge base by syncing from diverse sources
          </p>
        </div>

        {/* Code Example - Full Width */}
        <div className="">
          {isMobile ? (
            <RagMobile isVisible={true} />
          ) : (
            <RagExample isVisible={true} />
          )}
        </div>
        {/* Feature Cards - Grid Layout */}
        <div className="grid  landing-xs:grid-cols-2 landing-md:grid-cols-4 gap-4 h-full ">
          {/* Feature 1 */}
          <div className="relative h-full cursor-pointer">
            <div className="p-4 rounded-lg border border-solid border-white/10 hover:border-amber-500/50 hover:bg-white/10 transition-all duration-300 h-full flex flex-col">
              <div className="flex flex-col items-start gap-3 mb-3">
                <div className="bg-amber-500/10 landing-xs:hidden landing-md:flex  w-10 h-10 rounded-md items-center justify-center shrink-0">
                  <ServerStackIcon className="landing-xs:w-4 landing-xs:h-4 landing-lg:w-5 landing-lg:h-5  text-amber-500" />
                </div>
                <div className="landing-xs:text-sm landing-lg:text-base font-semibold text-white">
                  Integrated Vector Database
                </div>
              </div>
              <div className="text-gray-400 text-xs leading-relaxed">
                Seamlessly manage and query your vector data with a unified API,
                compatible with various providers.
              </div>
            </div>
          </div>

          {/* Feature 2 */}
          <div className="relative h-full cursor-pointer ">
            <div className="p-4 rounded-lg border border-solid border-white/10 hover:border-amber-500/50 hover:bg-white/10 transition-all duration-300 h-full flex flex-col">
              <div className="flex flex-col items-start gap-3 mb-3">
                <div className="bg-amber-500/10 landing-xs:hidden landing-md:flex  w-10 h-10 rounded-md items-center justify-center shrink-0">
                  <FunnelIcon className="landing-xs:w-4 landing-xs:h-4 landing-lg:w-5 landing-lg:h-5  text-amber-500" />
                </div>
                <div className="landing-xs:text-sm landing-lg:text-base font-semibold text-white">
                  Precise Data Filtering
                </div>
              </div>
              <div className="text-gray-400 text-xs leading-relaxed">
                Refine search results by filtering vectors based on metadata
                like source, date, or custom attributes.
              </div>
            </div>
          </div>

          {/* Feature 3 */}
          <div className="relative h-full cursor-pointer">
            <div className="p-4 rounded-lg border border-solid border-white/10 hover:border-amber-500/50 hover:bg-white/10 transition-all duration-300 h-full flex flex-col">
              <div className="flex flex-col items-start gap-3 mb-3">
                <div className="bg-amber-500/10 landing-xs:hidden landing-md:flex  w-10 h-10 rounded-md items-center justify-center shrink-0">
                  <SparklesIcon className="landing-xs:w-4 landing-xs:h-4 landing-lg:w-5 landing-lg:h-5  text-amber-500" />
                </div>
                <div className="landing-xs:text-sm landing-lg:text-base font-semibold text-white">
                  AI Agent Integration
                </div>
              </div>
              <div className="text-gray-400 text-xs leading-relaxed">
                Empower AI agents to access and utilize your knowledge base
                through dedicated vector search tools.
              </div>
            </div>
          </div>

          {/* Feature 4 */}
          <div className="relative h-full cursor-pointer">
            <div className="p-4 rounded-lg border border-solid border-white/10 hover:border-amber-500/50 hover:bg-white/10 transition-all duration-300 h-full flex flex-col">
              <div className="flex flex-col items-start gap-3 mb-3">
                <div className="bg-amber-500/10 landing-xs:hidden landing-md:flex  w-10 h-10 rounded-md items-center justify-center shrink-0">
                  <AdjustmentsHorizontalIcon className="landing-xs:w-4 landing-xs:h-4 landing-lg:w-5 landing-lg:h-5  text-amber-500" />
                </div>
                <div className="landing-xs:text-sm landing-lg:text-base font-semibold text-white">
                  Hybrid Search
                </div>
              </div>
              <div className="text-gray-400 text-xs leading-relaxed">
                Combine keyword and vector search techniques for enhanced
                accuracy and relevance in information retrieval.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
