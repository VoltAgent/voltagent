import React from "react";

import AgentList from "../../../static/img/ops/agent-list.png";

const AgentListView = () => {
  return (
    <div
      className="bg-[#141922] overflow-hidden rounded-b-lg"
      style={{
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
      }}
    >
      <img
        src={AgentList}
        alt="Agent Sessions List"
        className="w-full h-auto object-cover block max-h-[300px] sm:max-h-[400px] md:max-h-none"
        loading="lazy"
      />
    </div>
  );
};

export default AgentListView;
