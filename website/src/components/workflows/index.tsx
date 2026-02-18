import { EyeIcon, Squares2X2Icon, UserPlusIcon, UsersIcon } from "@heroicons/react/24/outline";
import { WorkflowCodeExample } from "./animation-diagram";

export function Workflows() {
  return (
    <div className="relative w-full overflow-hidden">
      {/* Header with full-width background */}
      <div className="w-full bg-[#101010] landing-xs:py-10 landing-md:py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="landing-xs:text-sm landing-md:text-lg landing-xs:mb-2 landing-md:mb-4 font-semibold text-[#b8b3b0] tracking-wide uppercase flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-main-emerald inline-block" />
            Workflow Chain API
          </h2>
          <p className="mt-1 landing-xs:text-2xl landing-md:text-4xl landing-xs:mb-2 landing-md:mb-4 landing-xs:font-normal landing-md:font-semibold text-white sm:tracking-tight">
            Orchestrate your agents
          </p>
          <p className="max-w-3xl  landing-md:text-xl  landing-xs:text-md text-[#8a8380] mb-0">
            Build complex agent workflows with a simple, declarative API
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 landing-xs:mb-16 landing-md:mb-36 mt-12">
        <div className="landing-xs:mb-12 landing-md:mb-16">
          <WorkflowCodeExample isVisible={true} />
        </div>

        {/* Feature Cards - Grid Layout */}
        <div className="grid landing-xs:grid-cols-1  landing-md:grid-cols-2 landing-lg:grid-cols-4 gap-4 sm:gap-6 h-full mt-8 landing-xs:mt-0 landing-md:mt-16">
          {/* Feature 1 */}
          <div className="relative h-full">
            <div className="p-4 rounded-lg border border-solid border-[#3d3a39] bg-[#101010] hover:border-[#5c5855] hover:bg-[#1a1a1a] transition-all duration-300 h-full flex flex-col">
              <div className="flex  items-start gap-3 mb-3">
                <div className="bg-[#b8b3b0]/10 landing-xs:hidden landing-md:flex landing-md:w-8 landing-lg:w-10 landing-md:h-8 landing-lg:h-10 rounded-md items-center justify-center shrink-0">
                  <Squares2X2Icon className="landing-md:w-4 landing-lg:w-5 landing-md:h-4 landing-lg:h-5 text-[#b8b3b0]" />
                </div>
                <div className="landing-xs:text-sm landing-lg:text-base font-semibold text-white">
                  Create complex workflows with Chain API
                </div>
              </div>
              <div className="text-[#8a8380] text-xs leading-relaxed">
                Build sophisticated multi agent workflows with our intuitive Chain API. Compose,
                branch, and orchestrate with ease.
              </div>
            </div>
          </div>

          {/* Feature 4 */}
          <div className="relative h-full">
            <div className="p-4 rounded-lg border border-solid border-[#3d3a39] bg-[#101010] hover:border-[#5c5855] hover:bg-[#1a1a1a] transition-all duration-300 h-full flex flex-col">
              <div className="flex  items-start gap-3 mb-3">
                <div className="bg-[#b8b3b0]/10 landing-xs:hidden landing-md:flex landing-md:w-8 landing-lg:w-10 landing-md:h-8 landing-lg:h-10 rounded-md items-center justify-center shrink-0">
                  <UsersIcon className="landing-md:w-4 landing-lg:w-5 landing-md:h-4 landing-lg:h-5 text-[#b8b3b0]" />
                </div>
                <div className="landing-xs:text-sm landing-lg:text-base font-semibold text-white">
                  Full TypeScript support with Zod schemas
                </div>
              </div>
              <div className="text-[#8a8380] text-xs leading-relaxed">
                Workflow steps are fully typed with Zod schemas. Compile time safety and runtime
                validation for agent inputs and outputs.
              </div>
            </div>
          </div>

          {/* Feature 2 */}
          <div className="relative h-full">
            <div className="p-4 rounded-lg border border-solid border-[#3d3a39] bg-[#101010] hover:border-[#5c5855] hover:bg-[#1a1a1a] transition-all duration-300 h-full flex flex-col">
              <div className="flex  items-start gap-3 mb-3">
                <div className="bg-[#b8b3b0]/10 landing-xs:hidden landing-md:flex landing-md:w-8 landing-lg:w-10 landing-md:h-8 landing-lg:h-10 rounded-md items-center justify-center shrink-0">
                  <UserPlusIcon className="landing-md:w-4 landing-lg:w-5 landing-md:h-4 landing-lg:h-5 text-[#b8b3b0]" />
                </div>
                <div className="landing-xs:text-sm landing-lg:text-base font-semibold text-white">
                  Pause/Resume for long running workflows
                </div>
              </div>
              <div className="text-[#8a8380] text-xs leading-relaxed">
                Pause execution, save state, and seamlessly resume with human intervention when
                needed.
              </div>
            </div>
          </div>

          {/* Feature 3 */}
          <div className="relative h-full">
            <div className="p-4 rounded-lg border border-solid border-[#3d3a39] bg-[#101010] hover:border-[#5c5855] hover:bg-[#1a1a1a] transition-all duration-300 h-full flex flex-col">
              <div className="flex  items-start gap-3 mb-3">
                <div className="bg-[#b8b3b0]/10 landing-xs:hidden landing-md:flex landing-md:w-8 landing-lg:w-10 landing-md:h-8 landing-lg:h-10 rounded-md items-center justify-center shrink-0">
                  <EyeIcon className="landing-md:w-4 landing-lg:w-5 landing-md:h-4 landing-lg:h-5 text-[#b8b3b0]" />
                </div>
                <div className="landing-xs:text-sm landing-lg:text-base font-semibold text-white">
                  Real time observability with VoltOps
                </div>
              </div>
              <div className="text-[#8a8380] text-xs leading-relaxed">
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
