import React from "react";
import AgentDetail from "../../../static/img/ops/flow-detail-2.png";

const AgentDetailView = () => {
  return (
    <div
      className="bg-[#141922] overflow-hidden rounded-b-lg"
      style={{
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
      }}
    >
      <img
        src={AgentDetail}
        alt="Agent Detail"
        className="w-full h-auto object-cover block max-h-[300px] sm:max-h-[400px] md:max-h-none"
        loading="lazy"
      />
    </div>
  );
};

export default AgentDetailView;
