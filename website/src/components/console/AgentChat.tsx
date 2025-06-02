import React from "react";

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
        src="/img/ops/agent-chat.png"
        alt="Message Inspector"
        className="w-full h-auto object-cover block max-h-[200px] landing-xs:max-h-[150px] landing-sm:max-h-[250px] landing-md:max-h-[300px] landing-lg:max-h-[400px]"
        loading="lazy"
      />
    </div>
  );
};

export default MessageInspector;
