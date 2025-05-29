import React from "react";

// Import integration logos
import { AhrefLogo } from "../../static/img/logos/integrations/ahref";
import { AirtableLogo } from "../../static/img/logos/integrations/airtable";
import { AnthropicLogo } from "../../static/img/logos/integrations/anthropic";
import { AsanaLogo } from "../../static/img/logos/integrations/asana";
import { CohereLogo } from "../../static/img/logos/integrations/cohere";
import { DropboxLogo } from "../../static/img/logos/integrations/dropbox";
import { FigmaLogo } from "../../static/img/logos/integrations/figma";
import { GmailLogo } from "../../static/img/logos/integrations/gmail";
import { GoogleCalendarLogo } from "../../static/img/logos/integrations/google-calendar";
import { GoogleDriveLogo } from "../../static/img/logos/integrations/google-drive";
import { GoogleSheetsLogo } from "../../static/img/logos/integrations/google-sheets";
import { HubspotLogo } from "../../static/img/logos/integrations/hubspot";
import { IntercomLogo } from "../../static/img/logos/integrations/intercom";
import { JiraLogo } from "../../static/img/logos/integrations/jira";
import { MailchimpLogo } from "../../static/img/logos/integrations/mailchimp";
import { MicrosoftTeamsLogo } from "../../static/img/logos/integrations/microsoft-teams";
import { MixpanelLogo } from "../../static/img/logos/integrations/mixpanel";
import { NotionLogo } from "../../static/img/logos/integrations/notion";
import { OneDriveLogo } from "../../static/img/logos/integrations/one-drive";
import { PineconeLogo } from "../../static/img/logos/integrations/pinecone";
import { Claude37Logo } from "../../static/img/logos/claudie";
import { CursorLogo } from "../../static/img/logos/cursor";
import { ComposioLogo } from "../../static/img/logos/composio";
import { ZapierLogo } from "../../static/img/logos/integrations/zapier";
import { GumloopLogo } from "../../static/img/logos/integrations/gumloop";
import { SlackLogo } from "../../static/img/logos/integrations/slack";
import { ServerIcon } from "@heroicons/react/20/solid";
import { DiscordLogo } from "../../static/img/logos/discord";
import { DiscordLogo2 } from "../../static/img/logos/discord-2";

// Map logo components by key
export const logoMap = {
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
  zapier: ZapierLogo,
  gumloop: GumloopLogo,
  composio: ComposioLogo,
  claude: Claude37Logo,
  cursor: CursorLogo,
  server: ServerIcon,
  slack: SlackLogo,
  discord: DiscordLogo2,
};

/**
 * Helper function to get logo component by key
 * @param logoKey - The key for the logo in the logoMap
 * @returns The logo component or NotionLogo as fallback
 */
export const getLogoComponent = (logoKey: string) => {
  return logoMap[logoKey] || logoMap.server;
};
