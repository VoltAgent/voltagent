import { ChatBubbleLeftIcon, PaperAirplaneIcon } from "@heroicons/react/24/outline";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { OpenAILogo } from "../../../static/img/logos/openai";

type Message = {
  id: string;
  content: string;
  isUser: boolean;
};

type ChatDetails = {
  name: string;
  instructions: string;
  model: string;
  provider: string;
  tools: string;
};

const chatDetails: ChatDetails = {
  name: "marketing-assistant",
  instructions:
    "You are a marketing assistant specialized in campaign analysis, content strategy, and social media optimization. Analyze data to provide actionable insights and automate routine marketing tasks.",
  model: "gpt-4-mini",
  provider: "OPENAI",
  tools:
    "Social Analysis, Trend Detection, Content Calendar, Performance Metrics, Competitor Analysis",
};

// Sample AI responses for simulation
const aiResponses = [
  "Based on your social media analytics, video content is performing 42% better than static images across all platforms.",
  "Your latest email campaign had a 28% open rate and 3.5% click-through rate, which is above industry average.",
  "I've analyzed competitor strategies and identified gaps in the market you could target with upcoming campaigns.",
  "The audience segment aged 25-34 shows the highest engagement with your product demonstration content.",
  "Website traffic from social campaigns has increased by 31% this month compared to the previous period.",
  "Based on current trends, incorporating user-generated content could increase engagement rates by approximately 20%.",
];

// Initial conversation to make the chat appear realistic
const initialMessages: Message[] = [
  {
    id: "init-1",
    content:
      "Agent, analyze last month's social media campaign performance and provide recommendations for improvement.",
    isUser: true,
  },
  {
    id: "init-2",
    content:
      "Analysis complete. Last month's campaign reached 45% more users but had 12% lower conversion rate compared to previous campaigns. Key findings: 1) Video content performed 3x better than static images. 2) Posts published between 6-8pm had highest engagement. 3) Product demonstration posts generated most conversions. Recommendation: Increase video content by 40%, focus on product demonstrations, and schedule more posts during evening hours.",
    isUser: false,
  },
  {
    id: "init-3",
    content:
      "Create a content calendar for next month based on these insights. Include optimal posting times and content types.",
    isUser: true,
  },
  {
    id: "init-4",
    content:
      "Content calendar created. I've scheduled 15 posts across platforms with 60% video content focused on product demos. Primary posting times are Tuesdays and Thursdays 6-8pm, with additional posts Monday and Friday mornings based on secondary engagement peaks. I've included hooks for upcoming product launch and integrated seasonal marketing themes. Calendar has been added to your Marketing Projects workspace and synced with team collaboration tools.",
    isUser: false,
  },
];

export default function AIChat() {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Function to generate a unique ID
  const generateId = useCallback(() => {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }, []);

  // Function to simulate AI response
  const simulateAIResponse = useCallback(() => {
    setIsTyping(true);

    // Simulate typing delay
    setTimeout(() => {
      const randomResponse = aiResponses[Math.floor(Math.random() * aiResponses.length)];
      const updatedMessages = [
        ...messages,
        { id: generateId(), content: randomResponse, isUser: false },
      ];
      setMessages(updatedMessages);
      setIsTyping(false);
    }, 1500);
  }, [generateId, messages]);

  // Respond when user sends a message
  useEffect(() => {
    if (messages.length > 0 && messages[messages.length - 1].isUser) {
      simulateAIResponse();
    }
  }, [messages, simulateAIResponse]);

  // Auto-scroll the chat container to the bottom when messages change
  // biome-ignore lint/correctness/useExhaustiveDependencies: ignore
  useEffect(() => {
    if (messagesContainerRef.current) {
      // Using setTimeout to ensure the DOM has updated
      const scrollTimeout = setTimeout(() => {
        const container = messagesContainerRef.current;
        if (container) {
          container.scrollTop = container.scrollHeight;
        }
      }, 100);

      return () => clearTimeout(scrollTimeout);
    }
  }, [messages, isTyping]);

  const handleSendMessage = () => {
    if (inputValue.trim()) {
      const updatedMessages = [
        ...messages,
        { id: generateId(), content: inputValue, isUser: true },
      ];
      setMessages(updatedMessages);
      setInputValue("");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div
      className="h-full w-full flex flex-col landing-md:p-4 landing-xs:p-2"
      style={{
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
        backgroundColor: "rgba(58, 66, 89, 0.3)",
      }}
    >
      {/* Info Section */}
      <div className="border-b border-solid border-l-0 border-t-0 border-r-0  border-[#1e293b]/70">
        <div className="px-2 sm:px-3 py-2">
          {/* Specification Section */}
          <div className="flex-1 px-0">
            <div className="flex flex-wrap py-2 gap-5">
              {/* Model Specification */}
              <div className="relative">
                <span className="absolute -top-3 left-2 px-1  bg-emerald-400/5 rounded-sm text-emerald-400 border border-solid border-emerald-400/20 text-[10px] capitalize">
                  Model
                </span>
                <div className="border border-[#1e293b] bg-black/20 flex items-center gap-2 border-solid rounded px-2 py-2 min-w-20">
                  <OpenAILogo className="w-3.5 h-3.5" />
                  <span className="text-gray-300 text-xs">{chatDetails.model}</span>
                </div>
              </div>

              {/* Tools Specification */}
              <div className="relative">
                <span className="absolute -top-3 left-2 px-1  bg-emerald-400/5 rounded-sm text-emerald-400 border border-solid border-emerald-400/20 text-[10px] capitalize">
                  Tools
                </span>
                <div className="border flex items-center bg-black/20 border-[#1e293b] border-solid rounded px-2 py-2 min-w-20">
                  <span className="text-gray-300 text-xs">{chatDetails.tools}</span>
                </div>
              </div>

              {/* Instructions Specification */}
              <div className="relative">
                <span className="absolute -top-3 left-2 px-1  bg-emerald-400/5 rounded-sm text-emerald-400 border border-solid  border-emerald-400/20 text-[10px] capitalize">
                  Instructions
                </span>
                <div className="border flex items-center bg-black/20 border-[#1e293b] border-solid rounded px-2 py-2">
                  <span className="text-gray-300 text-xs">{chatDetails.instructions}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col" style={{ maxHeight: "calc(100% - 120px)" }}>
        {/* Messages */}
        <div
          ref={messagesContainerRef}
          className="flex-1 p-2 sm:p-3 overflow-y-auto"
          style={{ maxHeight: "400px", height: "400px" }}
        >
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <ChatBubbleLeftIcon className="w-6 h-6 sm:w-8 sm:h-8 text-main-emerald mx-auto mb-2" />
                <p className="text-gray-400 text-xs ">How can I help you today?</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.isUser ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] p-2 sm:p-3 rounded-lg ${
                      message.isUser
                        ? "bg-gray-700/70 text-[#DCDCDC]"
                        : "bg-emerald-600/30 text-[#e2e8f0]"
                    }`}
                  >
                    <p className="text-xs  m-0">{message.content}</p>
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="max-w-[80%] p-2 sm:p-3 rounded-lg bg-emerald-600/30 text-[#e2e8f0]">
                    <p className="text-xs sm:text-sm m-0">
                      Thinking<span className="typing-animation">...</span>
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Suggested Messages - Only show if there are no messages */}
        {messages.length === 0 && (
          <div className="px-2 sm:px-3 py-1 border-t border-[#1e293b]/70">
            <div className="flex flex-wrap gap-2 sm:gap-3 justify-center overflow-x-auto [&::-webkit-scrollbar]:hidden">
              <button
                type="button"
                onClick={() => setInputValue("Show marketing performance for last month")}
                className="px-2 sm:px-3 py-1 rounded-full text-[#00d992] border-main-emerald border-solid text-xs cursor-pointer transition-all duration-200 whitespace-nowrap border border-gray-800 bg-transparent"
              >
                Show marketing performance
              </button>
              <button
                type="button"
                onClick={() => setInputValue("Create content strategy for Q3")}
                className="px-2 sm:px-3 py-1 rounded-full text-[#00d992] border-main-emerald border-solid text-xs cursor-pointer transition-all duration-200 whitespace-nowrap border border-gray-800 bg-transparent"
              >
                Create content strategy
              </button>
              <button
                type="button"
                onClick={() => setInputValue("Analyze competitor social campaigns")}
                className="px-2 sm:px-3 py-1 rounded-full text-[#00d992] border-main-emerald border-solid text-xs cursor-pointer transition-all duration-200 whitespace-nowrap border border-gray-800 bg-transparent"
              >
                Analyze competitors
              </button>
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="p-2 sm:p-3">
          <div className="relative">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Type your message..."
              className="w-full text-[#DCDCDC] rounded-md py-2 sm:py-3 px-3 sm:px-4 pr-10 sm:pr-12 bg-transparent border-solid border-gray-800 focus:border-[#00d992] focus:ring-1 focus:ring-[#00d992] focus:outline-none transition-all duration-200 text-xs sm:text-sm"
            />
            <button
              type="button"
              onClick={handleSendMessage}
              className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center rounded cursor-pointer transition-colors bg-transparent border-0 p-0"
            >
              <PaperAirplaneIcon className="w-4 h-4 sm:w-5 sm:h-5 text-[#00d992]" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
