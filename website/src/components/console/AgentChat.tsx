import React from "react";
import type { FC } from "react";

interface AgentChatProps {
  onImageClick?: () => void;
}

const AgentChat: FC<AgentChatProps> = ({ onImageClick }) => {
  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (onImageClick && (event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      onImageClick();
    }
  };

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
        className={`w-full h-auto object-cover block max-h-[200px] landing-xs:max-h-[150px] landing-sm:max-h-[250px] landing-md:max-h-[300px] landing-lg:max-h-[400px] ${
          onImageClick
            ? "cursor-pointer hover:opacity-90 transition-opacity"
            : ""
        }`}
        loading="lazy"
        onClick={onImageClick}
        onKeyPress={handleKeyPress}
        tabIndex={onImageClick ? 0 : undefined}
        role={onImageClick ? "button" : undefined}
      />
    </div>
  );
};

export default AgentChat;
