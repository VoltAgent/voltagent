import type React from "react";

const VoltOpsDemo: React.FC = () => {
  return (
    <div className="my-8 border border-gray-200 rounded-lg overflow-hidden shadow-lg">
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-4">
        <h3 className="text-white text-lg font-semibold mb-2">
          Try VoltOps Live Demo
        </h3>
        <p className="text-blue-100 text-sm">
          Experience VoltOps LLM Observability platform in action - see real
          agent workflows visualized as interactive flowcharts.
        </p>
      </div>

      <div className="p-0">
        <div className="h-[250px] landing-xs:h-[200px] landing-sm:h-[350px] landing-md:h-[500px] landing-lg:h-[600px] landing-xl:h-[700px] relative">
          <iframe
            src="https://console.voltagent.dev/demo"
            title="VoltOps LLM Observability Platform Demo"
            className="absolute inset-0 w-full h-full border-0"
            style={{
              width: "100%",
              height: "100%",
            }}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      </div>
    </div>
  );
};

export default VoltOpsDemo;
