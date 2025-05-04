import React from "react";

import flowview from "../../../static/img/ops/flow-1.png";

const FlowOverview = () => {
  return (
    <div
      className="bg-[#141922] overflow-hidden"
      style={{
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
      }}
    >
      <img
        src={flowview}
        alt="Connection Manager"
        className="w-full h-auto object-cover block"
      />
    </div>
  );
};

export default FlowOverview;
