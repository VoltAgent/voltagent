import React from "react";
import { motion } from "framer-motion";
import {
  MagnifyingGlassIcon,
  ArrowTopRightOnSquareIcon,
} from "@heroicons/react/24/outline";
import { BoltIcon } from "@heroicons/react/24/solid";

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

// MCP Card Component
const MCPCard = ({ mcp }) => {
  const handleClick = () => console.log(`Clicked on ${mcp.name}`);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
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
          <span>Try MCP connection</span>
          <ArrowTopRightOnSquareIcon
            className="w-4 h-4 ml-2 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-200"
            aria-hidden="true"
          />
        </div>
      </div>
    </motion.div>
  );
};

export const MCPList = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
      {/* Header Section - Updated to match marketplace style */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 landing-sm:gap-8 landing-md:mb-24 mb-12 items-center">
        <div className="flex flex-col items-center relative">
          <div className="flex items-baseline justify-start">
            <div className="flex mr-2 items-center border-2 border-solid border-[#00d992] rounded-full p-1">
              <BoltIcon className="w-5 h-5 sm:w-6 sm:h-6 text-[#00d992]" />
            </div>
            <span className="text-3xl sm:text-4xl font-bold text-[#00d992]">
              voltagent
            </span>
            <div className="relative">
              <span className="ml-2 text-xl sm:text-2xl font-medium text-gray-400">
                MCP
              </span>
            </div>
          </div>
          <p className="mt-2 text-center self-center text-gray-400 text-sm">
            Enhance your agents with popular services
          </p>
        </div>

        <div className="relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-left md:ml-8"
          >
            <p className="text-base sm:text-lg text-[#dcdcdc] mb-4">
              Model Context Providers are the most popular integration servers
              in the AI ecosystem.
            </p>
            <p className="text-base sm:text-lg text-gray-400">
              <span className="text-[#00d992] font-bold text-lg">
                Choose a provider
              </span>{" "}
              to see usage guide and documentation.
            </p>
          </motion.div>
        </div>
      </div>

      {/* MCP Grid */}
      <div className="py-8 px-3">
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {mcpData.map((mcp) => (
              <MCPCard key={mcp.id} mcp={mcp} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MCPList;
