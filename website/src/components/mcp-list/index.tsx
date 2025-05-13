import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  MagnifyingGlassIcon,
  ArrowTopRightOnSquareIcon,
} from "@heroicons/react/24/outline";
import { BoltIcon } from "@heroicons/react/24/solid";
import { DotPattern } from "../ui/dot-pattern";
// Import integration logos
import { AhrefLogo } from "../../../static/img/logos/integrations/ahref";
import { AirtableLogo } from "../../../static/img/logos/integrations/airtable";
import { AnthropicLogo } from "../../../static/img/logos/integrations/anthropic";
import { AsanaLogo } from "../../../static/img/logos/integrations/asana";
import { CohereLogo } from "../../../static/img/logos/integrations/cohere";
import { DropboxLogo } from "../../../static/img/logos/integrations/dropbox";
import { FigmaLogo } from "../../../static/img/logos/integrations/figma";
import { GmailLogo } from "../../../static/img/logos/integrations/gmail";
import { GoogleCalendarLogo } from "../../../static/img/logos/integrations/google-calendar";
import { GoogleDriveLogo } from "../../../static/img/logos/integrations/google-drive";
import { GoogleSheetsLogo } from "../../../static/img/logos/integrations/google-sheets";
import { HubspotLogo } from "../../../static/img/logos/integrations/hubspot";
import { IntercomLogo } from "../../../static/img/logos/integrations/intercom";
import { JiraLogo } from "../../../static/img/logos/integrations/jira";
import { MailchimpLogo } from "../../../static/img/logos/integrations/mailchimp";
import { MicrosoftTeamsLogo } from "../../../static/img/logos/integrations/microsoft-teams";
import { MixpanelLogo } from "../../../static/img/logos/integrations/mixpanel";
import { NotionLogo } from "../../../static/img/logos/integrations/notion";
import { OneDriveLogo } from "../../../static/img/logos/integrations/one-drive";
import { PineconeLogo } from "../../../static/img/logos/integrations/pinecone";

// Import MCP data from json file
import mcpDataJson from "./mcpData.json";

// Map logo components by key
const logoMap = {
  ahref: AhrefLogo,
  airtable: AirtableLogo,
  anthropic: AnthropicLogo,
  asana: AsanaLogo,
  cohere: CohereLogo,
  dropbox: DropboxLogo,
  figma: FigmaLogo,
  gmail: GmailLogo,
  googleCalendar: GoogleCalendarLogo,
  googleDrive: GoogleDriveLogo,
  googleSheets: GoogleSheetsLogo,
  hubspot: HubspotLogo,
  intercom: IntercomLogo,
  jira: JiraLogo,
  mailchimp: MailchimpLogo,
  microsoftTeams: MicrosoftTeamsLogo,
  mixpanel: MixpanelLogo,
  notion: NotionLogo,
  oneDrive: OneDriveLogo,
  pinecone: PineconeLogo,
};

// Combine JSON data with logo components
const mcpData = mcpDataJson.map((item) => ({
  ...item,
  logo: logoMap[item.logoKey],
}));

// Tab options for filtering
const tabOptions = [
  { id: "zapier", name: "Zapier" },
  { id: "gumloop", name: "Gumloop" },
  { id: "community", name: "Community" },
];

// MCP Card Component
const MCPCard = ({ mcp }) => {
  const handleClick = () => console.log(`Clicked on ${mcp.name}`);

  return (
    <motion.div
      initial={{ opacity: 0, y: 0 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="group border-solid border-[#1e293b]/40 rounded-lg overflow-hidden transition-all duration-300 h-full hover:border-[#00d992]/60 hover:shadow-[0_0_15px_rgba(0,217,146,0.15)] cursor-pointer"
      style={{
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
        backgroundColor: "rgba(58, 66, 89, 0.3)",
      }}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          handleClick();
        }
      }}
    >
      <div className="p-4 flex flex-col h-full">
        {/* Header with category badge */}
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center">
            <div className="w-8 h-8 mr-2 flex items-center justify-center bg-slate-800/50 rounded-full">
              <mcp.logo className="w-5 h-5" />
            </div>
            <span className="text-[#00d992] font-bold text-base sm:text-lg truncate">
              {mcp.name}
            </span>
          </div>

          <span className="px-2 py-0.5 text-xs rounded-full bg-[#1e293b] text-gray-300">
            {mcp.category}
          </span>
        </div>

        {/* Description */}
        <p className="text-gray-400 text-xs sm:text-sm mb-4 flex-grow">
          {mcp.description}
        </p>

        {/* Try Connection Button */}
        <div className="w-full flex items-center justify-center px-3 py-1.5 bg-emerald-400/10 text-emerald-400 border-solid border-emerald-400/20 text-sm font-medium rounded transition-all duration-200 hover:bg-emerald-400/30 hover:scale-[1.02] group-hover:bg-emerald-400/30 group-hover:scale-[1.01]">
          <span>See MCP Details</span>
          <ArrowTopRightOnSquareIcon
            className="w-4 h-4 ml-2 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-200"
            aria-hidden="true"
          />
        </div>
      </div>
    </motion.div>
  );
};

// Tab component
const Tab = ({ active, onClick, children }) => {
  return (
    <div
      className={`relative px-4 sm:px-8 py-3 sm:py-4 text-base sm:text-lg font-medium cursor-pointer transition-all duration-300 flex-1 text-center ${
        active ? "text-[#00d992]" : "text-gray-500 hover:text-gray-300"
      }`}
      onClick={onClick}
      role="tab"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          onClick();
        }
      }}
      aria-selected={active}
    >
      {children}
      <div
        className={`absolute bottom-0 left-0 right-0 h-0.5 ${
          active ? "bg-[#00d992]" : "bg-transparent"
        }`}
      />
    </div>
  );
};

export const MCPList = () => {
  const [activeTab, setActiveTab] = useState("zapier");

  // Filter MCPs based on active tab
  const filteredMcps = mcpData.filter((_mcp, index) => {
    if (activeTab === "zapier") {
      return index < 12;
    }
    if (activeTab === "gumloop") {
      return index >= 12 && index < 19;
    }
    return index >= 19;
  });

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-10 sm:py-20 flex flex-col items-center">
      <DotPattern dotColor="#94a3b8" dotSize={1.2} spacing={20} />

      {/* Header Section - Mobile optimized */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 landing-sm:gap-8 landing-md:mb-16 sm:landing-md:mb-24 mb-8 items-center w-full">
        <div className="flex flex-col items-center sm:items-center relative">
          <div className="flex items-baseline justify-start">
            <div className="flex mr-2 items-center border-2 border-solid border-[#00d992] rounded-full p-1">
              <BoltIcon className="w-5 h-5 sm:w-6 sm:h-6 text-[#00d992]" />
            </div>
            <span className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#00d992]">
              voltagent
            </span>
            <div className="relative">
              <span className="ml-2 text-xl sm:text-xl md:text-2xl font-medium text-gray-400">
                MCP
              </span>
            </div>
          </div>
          <p className="mt-2 text-center self-center text-gray-400 text-xs sm:text-sm">
            Enhance your agents with popular services
          </p>
        </div>

        <div className="relative mt-4 sm:mt-0">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center sm:text-left md:ml-8"
          >
            <p className="text-sm sm:text-base md:text-lg text-[#dcdcdc] mb-3 sm:mb-4">
              Model Context Providers are the most popular integration servers
              in the AI ecosystem.
            </p>
            <p className="text-sm sm:text-base md:text-lg text-gray-400">
              <span className="text-[#00d992] font-bold text-base sm:text-lg">
                Choose a provider
              </span>{" "}
              to see usage guide and documentation.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Tab Navigation - Full width on mobile */}
      <div className="mb-8 w-full">
        <div
          className="flex justify-between border-b border-gray-800 w-full"
          role="tablist"
        >
          {tabOptions.map((tab) => (
            <Tab
              key={tab.id}
              active={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.name}
            </Tab>
          ))}
        </div>
      </div>

      {/* MCP Grid - Responsive padding */}
      <div
        className="p-3 sm:p-5 md:p-7 rounded-lg border border-solid border-white/10 backdrop-filter backdrop-blur-sm w-full"
        role="tabpanel"
        aria-labelledby={`tab-${activeTab}`}
      >
        <div className="flex flex-col gap-4 sm:gap-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
            {filteredMcps.map((mcp) => (
              <MCPCard key={mcp.id} mcp={mcp} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MCPList;
