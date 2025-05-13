import React from "react";
import { motion } from "framer-motion";
import {
  MagnifyingGlassIcon,
  ArrowTopRightOnSquareIcon,
} from "@heroicons/react/24/outline";

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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">
          Multi-Cloud Platform Connections
        </h2>
        <p className="text-gray-400">
          Connect your agents with these services to enhance their capabilities
        </p>
      </div>

      {/* Search Bar */}
      <div className="mb-8 relative">
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <MagnifyingGlassIcon
              className="h-5 w-5 text-gray-400"
              aria-hidden="true"
            />
          </div>
          <input
            type="text"
            className="block w-full rounded-md border-0 bg-slate-800/50 py-3 pl-10 text-white placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-[#00d992] sm:text-sm"
            placeholder="Search your favourite MCPs"
          />
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
