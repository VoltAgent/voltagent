import React from "react";

const FlowOverview = () => {
  return (
    <div
      className="bg-[#141922] overflow-hidden rounded-b-lg"
      style={{
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
      }}
    >
      <img
        src="/img/ops/flow-1.png"
        alt="Connection Manager"
        className="w-full h-auto object-cover block max-h-[200px] landing-xs:max-h-[150px] landing-sm:max-h-[250px] landing-md:max-h-[300px] landing-lg:max-h-[400px]"
        loading="lazy"
      />
    </div>
  );
};

export default FlowOverview;
