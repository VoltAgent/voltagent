import { EyeIcon, Squares2X2Icon, UserPlusIcon, UsersIcon } from "@heroicons/react/24/outline";
import { WorkflowCodeExample } from "./animation-diagram";

export function Workflows() {
  return (
    <div className="relative w-full overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 landing-xs:mb-16 landing-md:mb-36">
        <div className="">
          <h2 className="landing-xs:text-sm landing-md:text-lg landing-xs:mb-2 landing-md:mb-4 font-semibold  text-[#ff6285] tracking-wide uppercase">
            Workflow Chain API
          </h2>
          <p className="mt-1 landing-xs:text-2xl landing-md:text-4xl landing-xs:mb-2 landing-md:mb-4 landing-xs:font-bold landing-md:font-extrabold text-white sm:tracking-tight">
            Orchestrate your agents
          </p>
          <p className="max-w-3xl  landing-md:text-xl  landing-xs:text-md text-gray-400">
            Build complex agent workflows with a simple, declarative API
          </p>
        </div>

        <div className="landing-xs:mb-12 landing-md:mb-16">
          <WorkflowCodeExample isVisible={true} />
        </div>

        {/* Feature Cards - Grid Layout */}
        <div className="grid landing-xs:grid-cols-1  landing-md:grid-cols-2 landing-lg:grid-cols-4 gap-4 sm:gap-6 h-full mt-8 landing-xs:mt-0 landing-md:mt-16">
          {/* Feature 1 */}
          <div className="relative h-full">
            <div className="p-4 rounded-lg border border-solid border-white/10 hover:border-[#ff6285]/50 hover:bg-white/10 transition-all duration-300 h-full flex flex-col">
              <div className="flex flex-col items-start gap-3 mb-3">
                <div className="bg-[#ff6285]/10 landing-xs:hidden landing-md:flex landing-md:w-8 landing-lg:w-10 landing-md:h-8 landing-lg:h-10 rounded-md items-center justify-center shrink-0">
                  <Squares2X2Icon className="landing-md:w-4 landing-lg:w-5 landing-md:h-4 landing-lg:h-5 text-[#ff6285]" />
                </div>
                <div className="landing-xs:text-sm landing-lg:text-base font-semibold text-white">
                  Create complex workflows with Chain API
                </div>
              </div>
              <div className="text-gray-400 text-xs leading-relaxed">
                Build sophisticated multi agent workflows with our intuitive Chain API. Compose,
                branch, and orchestrate with ease.
              </div>
            </div>
          </div>

          {/* Feature 4 */}
          <div className="relative h-full">
            <div className="p-4 rounded-lg border border-solid border-white/10 hover:border-[#ff6285]/50 hover:bg-white/10 transition-all duration-300 h-full flex flex-col">
              <div className="flex flex-col items-start gap-3 mb-3">
                <div className="bg-[#ff6285]/10 landing-xs:hidden landing-md:flex landing-md:w-8 landing-lg:w-10 landing-md:h-8 landing-lg:h-10 rounded-md items-center justify-center shrink-0">
                  <UsersIcon className="landing-md:w-4 landing-lg:w-5 landing-md:h-4 landing-lg:h-5 text-[#ff6285]" />
                </div>
                <div className="landing-xs:text-sm landing-lg:text-base font-semibold text-white">
                  Full TypeScript support with Zod schemas
                </div>
              </div>
              <div className="text-gray-400 text-xs leading-relaxed">
                Every workflow step is fully typed with Zod schemas. Get compile time safety and
                runtime validation for all agent inputs and outputs.
              </div>
            </div>
          </div>

          {/* Feature 2 */}
          <div className="relative h-full">
            <div className="p-4 rounded-lg border border-solid border-white/10 hover:border-[#ff6285]/50 hover:bg-white/10 transition-all duration-300 h-full flex flex-col">
              <div className="flex flex-col items-start gap-3 mb-3">
                <div className="bg-[#ff6285]/10 landing-xs:hidden landing-md:flex landing-md:w-8 landing-lg:w-10 landing-md:h-8 landing-lg:h-10 rounded-md items-center justify-center shrink-0">
                  <UserPlusIcon className="landing-md:w-4 landing-lg:w-5 landing-md:h-4 landing-lg:h-5 text-[#ff6285]" />
                </div>
                <div className="landing-xs:text-sm landing-lg:text-base font-semibold text-white">
                  Pause/Resume for long running workflows
                </div>
              </div>
              <div className="text-gray-400 text-xs leading-relaxed">
                Optimized for long running workflows. Pause execution, save state, and seamlessly
                resume with human intervention when needed.
              </div>
            </div>
          </div>

          {/* Feature 3 */}
          <div className="relative h-full">
            <div className="p-4 rounded-lg border border-solid border-white/10 hover:border-[#ff6285]/50 hover:bg-white/10 transition-all duration-300 h-full flex flex-col">
              <div className="flex flex-col items-start gap-3 mb-3">
                <div className="bg-[#ff6285]/10 landing-xs:hidden landing-md:flex landing-md:w-8 landing-lg:w-10 landing-md:h-8 landing-lg:h-10 rounded-md items-center justify-center shrink-0">
                  <EyeIcon className="landing-md:w-4 landing-lg:w-5 landing-md:h-4 landing-lg:h-5 text-[#ff6285]" />
                </div>
                <div className="landing-xs:text-sm landing-lg:text-base font-semibold text-white">
                  Real time observability with VoltOps
                </div>
              </div>
              <div className="text-gray-400 text-xs leading-relaxed">
                Monitor agent execution, debug workflows, and get real time insights with VoltOps
                observability platform.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
