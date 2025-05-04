import React from "react";

import agentchat from "../../../static/img/ops/agent-chat.png";

const MessageInspector = () => {
  return (
    <div
      className="bg-[#141922] overflow-hidden rounded-b-lg"
      style={{
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
      }}
    >
      <img
        src={agentchat}
        alt="Message Inspector"
        className="w-full h-auto object-cover block max-h-[300px] sm:max-h-[400px] md:max-h-none"
        loading="lazy"
      />
    </div>
  );
};

export default MessageInspector;
