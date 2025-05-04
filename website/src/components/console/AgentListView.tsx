import React from "react";

import AgentList from "../../../static/img/ops/agent-list.png";

const AgentListView = () => {
  return (
    <div
      className="bg-[#141922]  overflow-hidden"
      style={{
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
      }}
    >
      <img
        src={AgentList}
        alt="Agent Sessions List"
        className="w-full h-auto object-cover block"
      />
    </div>
  );
};

export default AgentListView;
