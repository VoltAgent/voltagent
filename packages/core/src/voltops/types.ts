/**
 * VoltOps Client Type Definitions
 *
 * All types related to VoltOps client functionality including
 * prompt management, telemetry, and API interactions.
 */

export type ManagedMemoryStatus = "provisioning" | "ready" | "failed";

import type { UIMessage } from "ai";
import type { BaseMessage } from "../agent/providers/base/types";
import type { SearchResult, VectorItem } from "../memory/adapters/vector/types";
import type {
  Conversation,
  ConversationQueryOptions,
  ConversationStepRecord,
  CreateConversationInput,
  GetConversationStepsOptions,
  GetMessagesOptions,
  WorkflowStateEntry,
  WorkingMemoryScope,
} from "../memory/types";
// VoltAgentExporter removed - migrated to OpenTelemetry

/**
 * Reference to a prompt in the VoltOps system
 */
export type PromptReference = {
  /** Name of the prompt */
  promptName: string;
  /** Specific version number (takes precedence over label) */
  version?: number;
  /** Label to fetch (e.g., 'latest', 'production', 'staging') */
  label?: string;
  /** Variables to substitute in the template */
  variables?: Record<string, any>;
  /** Per-prompt cache configuration (overrides global settings) */
  promptCache?: {
    enabled?: boolean;
    ttl?: number; // Cache TTL in seconds
    maxSize?: number; // Max cache entries (not applicable per-prompt, but kept for consistency)
  };
};

/**
 * Helper interface for prompt operations in agent instructions
 */
export type PromptHelper = {
  /** Get prompt content by reference */
  getPrompt: (reference: PromptReference) => Promise<PromptContent>;
};

/**
 * Enhanced dynamic value options with prompts support
 */
export interface DynamicValueOptions {
  /** User context map */
  context: Map<string | symbol, unknown>;
  /** Prompt helper (available when VoltOpsClient is configured) */
  prompts: PromptHelper;
}

/**
 * Dynamic value type for agent configuration
 */
export type DynamicValue<T> = (options: DynamicValueOptions) => Promise<T> | T;

/**
 * VoltOps client configuration options
 */
export type VoltOpsClientOptions = {
  /** Base URL of the VoltOps API (default: https://api.voltagent.dev) */
  baseUrl?: string;

  /**
   * Public API key for VoltOps authentication
   *
   * @description Your VoltOps public key used for API authentication and prompt management.
   * This key is safe to use in client-side applications as it only provides read access.
   *
   * @format Should start with `pk_` prefix (e.g., `pk_1234567890abcdef`)
   *
   * @example
   * ```typescript
   * publicKey: process.env.VOLTAGENT_PUBLIC_KEY
   * ```
   *
   *
   * @obtain Get your API keys from: https://console.voltagent.dev/settings/projects
   */
  publicKey?: string;

  /**
   * Secret API key for VoltOps authentication
   *
   * @description Your VoltOps secret key used for secure API operations and analytics.
   * This key provides full access to your VoltOps project and should be kept secure.
   *
   * @format Should start with `sk_` prefix (e.g., `sk_abcdef1234567890`)
   *
   * @example
   * ```typescript
   * secretKey: process.env.VOLTAGENT_SECRET_KEY
   * ```
   *
   *
   * @obtain Get your API keys from: https://console.voltagent.dev/settings/projects
   */
  secretKey?: string;
  /** Custom fetch implementation (optional) */
  fetch?: typeof fetch;
  // observability option removed - now handled by VoltAgentObservability
  /** Enable prompt management (default: true) */
  prompts?: boolean;
  /** Optional configuration for prompt caching */
  promptCache?: {
    enabled?: boolean;
    ttl?: number; // Cache TTL in seconds
    maxSize?: number; // Max cache entries
  };
};

/**
 * Cached prompt data for performance optimization
 */
export type CachedPrompt = {
  /** Prompt content */
  content: string;
  /** When the prompt was fetched */
  fetchedAt: number;
  /** Time to live in milliseconds */
  ttl: number;
};

export interface VoltOpsActionExecutionResult {
  actionId: string;
  provider: string;
  requestPayload: Record<string, unknown>;
  responsePayload: unknown;
  metadata?: Record<string, unknown> | null;
}

type VoltOpsCredentialMetadata = {
  metadata?: Record<string, unknown>;
};

type VoltOpsStoredCredentialRef = {
  credentialId: string;
} & VoltOpsCredentialMetadata;

type WithCredentialMetadata<T> = T & VoltOpsCredentialMetadata;

export type VoltOpsAirtableCredential =
  | VoltOpsStoredCredentialRef
  | WithCredentialMetadata<{ apiKey: string }>;

export type VoltOpsSlackCredential =
  | VoltOpsStoredCredentialRef
  | WithCredentialMetadata<{ botToken: string }>;

export type VoltOpsDiscordCredential =
  | VoltOpsStoredCredentialRef
  | WithCredentialMetadata<{ botToken: string }>
  | WithCredentialMetadata<{ webhookUrl: string }>;

export type VoltOpsGoogleCalendarCredential =
  | VoltOpsStoredCredentialRef
  | WithCredentialMetadata<{
      accessToken?: string;
      refreshToken?: string;
      clientId?: string;
      clientSecret?: string;
      tokenType?: string;
      expiresAt?: string;
    }>;

export type VoltOpsGoogleDriveCredential =
  | VoltOpsStoredCredentialRef
  | WithCredentialMetadata<{
      accessToken?: string;
      refreshToken?: string;
      clientId?: string;
      clientSecret?: string;
      tokenType?: string;
      expiresAt?: string;
    }>;

export type VoltOpsPostgresCredential =
  | VoltOpsStoredCredentialRef
  | WithCredentialMetadata<{
      host: string;
      port?: number;
      user: string;
      password: string;
      database: string;
      ssl?: boolean;
      rejectUnauthorized?: boolean;
    }>;

export type VoltOpsGmailCredential =
  | VoltOpsStoredCredentialRef
  | WithCredentialMetadata<{
      accessToken?: string;
      refreshToken?: string;
      clientId?: string;
      clientSecret?: string;
      tokenType?: string;
      expiresAt?: string;
    }>
  | WithCredentialMetadata<{
      clientEmail: string;
      privateKey: string;
      subject?: string | null;
    }>;

export interface VoltOpsGmailAttachment {
  filename?: string;
  content: string;
  contentType?: string;
}

export interface VoltOpsAirtableCreateRecordParams {
  credential: VoltOpsAirtableCredential;
  baseId: string;
  tableId: string;
  fields: Record<string, unknown>;
  typecast?: boolean;
  returnFieldsByFieldId?: boolean;
  actionId?: string;
  catalogId?: string;
  projectId?: string | null;
}

export interface VoltOpsAirtableUpdateRecordParams {
  credential: VoltOpsAirtableCredential;
  baseId: string;
  tableId: string;
  recordId: string;
  fields?: Record<string, unknown>;
  typecast?: boolean;
  returnFieldsByFieldId?: boolean;
  actionId?: string;
  catalogId?: string;
  projectId?: string | null;
}

export interface VoltOpsAirtableDeleteRecordParams {
  credential: VoltOpsAirtableCredential;
  baseId: string;
  tableId: string;
  recordId: string;
  actionId?: string;
  catalogId?: string;
  projectId?: string | null;
}

export interface VoltOpsAirtableGetRecordParams {
  credential: VoltOpsAirtableCredential;
  baseId: string;
  tableId: string;
  recordId: string;
  returnFieldsByFieldId?: boolean;
  actionId?: string;
  catalogId?: string;
  projectId?: string | null;
}

export interface VoltOpsAirtableListRecordsParams {
  credential: VoltOpsAirtableCredential;
  baseId: string;
  tableId: string;
  view?: string;
  filterByFormula?: string;
  maxRecords?: number;
  pageSize?: number;
  offset?: string;
  fields?: string[];
  sort?: Array<{ field: string; direction?: "asc" | "desc" }>;
  returnFieldsByFieldId?: boolean;
  actionId?: string;
  catalogId?: string;
  projectId?: string | null;
}

export interface VoltOpsSlackBaseParams {
  credential: VoltOpsSlackCredential;
  actionId?: string;
  catalogId?: string;
  projectId?: string | null;
}

export interface VoltOpsSlackPostMessageParams extends VoltOpsSlackBaseParams {
  channelId?: string;
  channelName?: string;
  channelLabel?: string | null;
  defaultThreadTs?: string | null;
  targetType?: "conversation" | "user";
  userId?: string;
  userName?: string;
  text?: string;
  blocks?: unknown;
  attachments?: unknown;
  threadTs?: string;
  metadata?: Record<string, unknown>;
  linkNames?: boolean;
  unfurlLinks?: boolean;
  unfurlMedia?: boolean;
}

export interface VoltOpsSlackDeleteMessageParams extends VoltOpsSlackBaseParams {
  channelId: string;
  messageTs: string;
  threadTs?: string;
}

export interface VoltOpsSlackSearchMessagesParams extends VoltOpsSlackBaseParams {
  query: string;
  sort?: "relevance" | "timestamp";
  sortDirection?: "asc" | "desc";
  channelIds?: string[];
  limit?: number;
}

export type VoltOpsDiscordChannelType = "text" | "voice" | "announcement" | "category" | "forum";

export interface VoltOpsDiscordConfig {
  guildId?: string;
  channelId?: string;
  threadId?: string;
  userId?: string;
  roleId?: string;
}

export interface VoltOpsDiscordBaseParams {
  credential: VoltOpsDiscordCredential;
  catalogId?: string;
  projectId?: string | null;
  actionId?: string;
  config?: VoltOpsDiscordConfig | null;
}

export interface VoltOpsDiscordSendMessageParams extends VoltOpsDiscordBaseParams {
  guildId?: string;
  channelId?: string;
  threadId?: string;
  content?: string;
  embeds?: unknown[];
  components?: unknown[];
  tts?: boolean;
  allowedMentions?: Record<string, unknown>;
  replyToMessageId?: string;
}

export interface VoltOpsDiscordSendWebhookMessageParams extends VoltOpsDiscordSendMessageParams {
  username?: string;
  avatarUrl?: string;
}

export interface VoltOpsDiscordChannelMessageParams extends VoltOpsDiscordBaseParams {
  channelId: string;
  messageId: string;
}

export interface VoltOpsDiscordListMessagesParams extends VoltOpsDiscordBaseParams {
  channelId: string;
  limit?: number;
  before?: string;
  after?: string;
}

export interface VoltOpsDiscordReactionParams extends VoltOpsDiscordBaseParams {
  channelId: string;
  messageId: string;
  emoji: string;
}

export interface VoltOpsDiscordCreateChannelParams extends VoltOpsDiscordBaseParams {
  guildId: string;
  name: string;
  type?: VoltOpsDiscordChannelType;
  topic?: string;
}

export interface VoltOpsDiscordUpdateChannelParams extends VoltOpsDiscordBaseParams {
  channelId: string;
  name?: string;
  topic?: string;
  archived?: boolean;
  locked?: boolean;
}

export interface VoltOpsDiscordDeleteChannelParams extends VoltOpsDiscordBaseParams {
  channelId: string;
}

export interface VoltOpsDiscordGetChannelParams extends VoltOpsDiscordBaseParams {
  channelId: string;
}

export interface VoltOpsDiscordListChannelsParams extends VoltOpsDiscordBaseParams {
  guildId: string;
}

export interface VoltOpsDiscordListMembersParams extends VoltOpsDiscordBaseParams {
  guildId: string;
  limit?: number;
  after?: string;
}

export interface VoltOpsDiscordMemberRoleParams extends VoltOpsDiscordBaseParams {
  guildId: string;
  userId: string;
  roleId: string;
}

export interface VoltOpsPostgresBaseParams {
  credential: VoltOpsPostgresCredential;
  actionId?: string;
  catalogId?: string;
  projectId?: string | null;
}

export interface VoltOpsPostgresExecuteParams extends VoltOpsPostgresBaseParams {
  query: string;
  parameters?: unknown[];
  applicationName?: string;
  statementTimeoutMs?: number;
  connectionTimeoutMs?: number;
  ssl?: {
    rejectUnauthorized?: boolean;
  };
}

export interface VoltOpsGmailBaseParams {
  credential: VoltOpsGmailCredential;
  actionId?: string;
  catalogId?: string;
  projectId?: string | null;
}

export interface VoltOpsGmailSendEmailParams extends VoltOpsGmailBaseParams {
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  subject: string;
  body?: string;
  bodyType?: "text" | "html";
  htmlBody?: string;
  textBody?: string;
  replyTo?: string | string[];
  from?: string;
  senderName?: string;
  inReplyTo?: string;
  threadId?: string;
  attachments?: VoltOpsGmailAttachment[];
  draft?: boolean;
}

export interface VoltOpsGmailReplyParams extends VoltOpsGmailSendEmailParams {}

export interface VoltOpsGmailSearchParams extends VoltOpsGmailBaseParams {
  from?: string;
  to?: string;
  subject?: string;
  label?: string;
  category?: string;
  after?: number;
  before?: number;
  maxResults?: number;
  pageToken?: string;
  query?: string;
}

export interface VoltOpsGmailGetEmailParams extends VoltOpsGmailBaseParams {
  messageId: string;
  format?: "full" | "minimal" | "raw" | "metadata";
}

export interface VoltOpsGmailGetThreadParams extends VoltOpsGmailBaseParams {
  threadId: string;
  format?: "full" | "minimal" | "raw" | "metadata";
}

export interface VoltOpsGoogleCalendarBaseParams {
  credential: VoltOpsGoogleCalendarCredential;
  actionId?: string;
  catalogId?: string;
  projectId?: string | null;
}

export interface VoltOpsGoogleCalendarCreateParams extends VoltOpsGoogleCalendarBaseParams {
  calendarId?: string;
  summary: string;
  start: { dateTime: string; timeZone?: string | null };
  end: { dateTime: string; timeZone?: string | null };
  description?: string;
  location?: string;
  status?: string;
  attendees?: Array<{ email: string; optional?: boolean; comment?: string }>;
}

export interface VoltOpsGoogleCalendarUpdateParams extends VoltOpsGoogleCalendarBaseParams {
  eventId: string;
  calendarId?: string;
  summary?: string;
  description?: string;
  location?: string;
  status?: string;
  start?: { dateTime: string; timeZone?: string | null } | null;
  end?: { dateTime: string; timeZone?: string | null } | null;
  attendees?: Array<{ email: string; optional?: boolean; comment?: string }>;
}

export interface VoltOpsGoogleCalendarDeleteParams extends VoltOpsGoogleCalendarBaseParams {
  eventId: string;
  calendarId?: string;
}

export interface VoltOpsGoogleCalendarListParams extends VoltOpsGoogleCalendarBaseParams {
  calendarId?: string;
  timeMin?: string;
  timeMax?: string;
  maxResults?: number;
  pageToken?: string;
  q?: string;
  showDeleted?: boolean;
  singleEvents?: boolean;
  orderBy?: string;
}

export interface VoltOpsGoogleCalendarGetParams extends VoltOpsGoogleCalendarBaseParams {
  eventId: string;
  calendarId?: string;
}

export interface VoltOpsGoogleDriveBaseParams {
  credential: VoltOpsGoogleDriveCredential;
  actionId?: string;
  catalogId?: string;
  projectId?: string | null;
}

export interface VoltOpsGoogleDriveListParams extends VoltOpsGoogleDriveBaseParams {
  q?: string;
  pageSize?: number;
  pageToken?: string;
  orderBy?: string;
  includeTrashed?: boolean;
}

export interface VoltOpsGoogleDriveGetFileParams extends VoltOpsGoogleDriveBaseParams {
  fileId: string;
}

export interface VoltOpsGoogleDriveDownloadParams extends VoltOpsGoogleDriveBaseParams {
  fileId: string;
}

export interface VoltOpsGoogleDriveUploadParams extends VoltOpsGoogleDriveBaseParams {
  name: string;
  mimeType?: string;
  parents?: string[];
  content?: string;
  isBase64?: boolean;
}

export interface VoltOpsGoogleDriveCreateFolderParams extends VoltOpsGoogleDriveBaseParams {
  name: string;
  parents?: string[];
}

export interface VoltOpsGoogleDriveMoveParams extends VoltOpsGoogleDriveBaseParams {
  fileId: string;
  newParentId: string;
  removeAllParents?: boolean;
}

export interface VoltOpsGoogleDriveCopyParams extends VoltOpsGoogleDriveBaseParams {
  fileId: string;
  destinationParentId?: string;
  name?: string;
}

export interface VoltOpsGoogleDriveDeleteParams extends VoltOpsGoogleDriveBaseParams {
  fileId: string;
}

export interface VoltOpsGoogleDriveShareParams extends VoltOpsGoogleDriveBaseParams {
  fileId: string;
}

export type VoltOpsActionsApi = {
  airtable: {
    createRecord: (
      params: VoltOpsAirtableCreateRecordParams,
    ) => Promise<VoltOpsActionExecutionResult>;
    updateRecord: (
      params: VoltOpsAirtableUpdateRecordParams,
    ) => Promise<VoltOpsActionExecutionResult>;
    deleteRecord: (
      params: VoltOpsAirtableDeleteRecordParams,
    ) => Promise<VoltOpsActionExecutionResult>;
    getRecord: (params: VoltOpsAirtableGetRecordParams) => Promise<VoltOpsActionExecutionResult>;
    listRecords: (
      params: VoltOpsAirtableListRecordsParams,
    ) => Promise<VoltOpsActionExecutionResult>;
  };
  slack: {
    postMessage: (params: VoltOpsSlackPostMessageParams) => Promise<VoltOpsActionExecutionResult>;
    deleteMessage: (
      params: VoltOpsSlackDeleteMessageParams,
    ) => Promise<VoltOpsActionExecutionResult>;
    searchMessages: (
      params: VoltOpsSlackSearchMessagesParams,
    ) => Promise<VoltOpsActionExecutionResult>;
  };
  discord: {
    sendMessage: (params: VoltOpsDiscordSendMessageParams) => Promise<VoltOpsActionExecutionResult>;
    sendWebhookMessage: (
      params: VoltOpsDiscordSendWebhookMessageParams,
    ) => Promise<VoltOpsActionExecutionResult>;
    deleteMessage: (
      params: VoltOpsDiscordChannelMessageParams,
    ) => Promise<VoltOpsActionExecutionResult>;
    getMessage: (
      params: VoltOpsDiscordChannelMessageParams,
    ) => Promise<VoltOpsActionExecutionResult>;
    listMessages: (
      params: VoltOpsDiscordListMessagesParams,
    ) => Promise<VoltOpsActionExecutionResult>;
    addReaction: (params: VoltOpsDiscordReactionParams) => Promise<VoltOpsActionExecutionResult>;
    removeReaction: (params: VoltOpsDiscordReactionParams) => Promise<VoltOpsActionExecutionResult>;
    createChannel: (
      params: VoltOpsDiscordCreateChannelParams,
    ) => Promise<VoltOpsActionExecutionResult>;
    updateChannel: (
      params: VoltOpsDiscordUpdateChannelParams,
    ) => Promise<VoltOpsActionExecutionResult>;
    deleteChannel: (
      params: VoltOpsDiscordDeleteChannelParams,
    ) => Promise<VoltOpsActionExecutionResult>;
    getChannel: (params: VoltOpsDiscordGetChannelParams) => Promise<VoltOpsActionExecutionResult>;
    listChannels: (
      params: VoltOpsDiscordListChannelsParams,
    ) => Promise<VoltOpsActionExecutionResult>;
    listMembers: (params: VoltOpsDiscordListMembersParams) => Promise<VoltOpsActionExecutionResult>;
    addMemberRole: (
      params: VoltOpsDiscordMemberRoleParams,
    ) => Promise<VoltOpsActionExecutionResult>;
    removeMemberRole: (
      params: VoltOpsDiscordMemberRoleParams,
    ) => Promise<VoltOpsActionExecutionResult>;
  };
  gmail: {
    sendEmail: (params: VoltOpsGmailSendEmailParams) => Promise<VoltOpsActionExecutionResult>;
    replyToEmail: (params: VoltOpsGmailReplyParams) => Promise<VoltOpsActionExecutionResult>;
    searchEmail: (params: VoltOpsGmailSearchParams) => Promise<VoltOpsActionExecutionResult>;
    getEmail: (params: VoltOpsGmailGetEmailParams) => Promise<VoltOpsActionExecutionResult>;
    getThread: (params: VoltOpsGmailGetThreadParams) => Promise<VoltOpsActionExecutionResult>;
  };
  googlecalendar: {
    createEvent: (
      params: VoltOpsGoogleCalendarCreateParams,
    ) => Promise<VoltOpsActionExecutionResult>;
    updateEvent: (
      params: VoltOpsGoogleCalendarUpdateParams,
    ) => Promise<VoltOpsActionExecutionResult>;
    deleteEvent: (
      params: VoltOpsGoogleCalendarDeleteParams,
    ) => Promise<VoltOpsActionExecutionResult>;
    listEvents: (params: VoltOpsGoogleCalendarListParams) => Promise<VoltOpsActionExecutionResult>;
    getEvent: (params: VoltOpsGoogleCalendarGetParams) => Promise<VoltOpsActionExecutionResult>;
  };
  googledrive: {
    listFiles: (params: VoltOpsGoogleDriveListParams) => Promise<VoltOpsActionExecutionResult>;
    getFileMetadata: (
      params: VoltOpsGoogleDriveGetFileParams,
    ) => Promise<VoltOpsActionExecutionResult>;
    downloadFile: (
      params: VoltOpsGoogleDriveDownloadParams,
    ) => Promise<VoltOpsActionExecutionResult>;
    uploadFile: (params: VoltOpsGoogleDriveUploadParams) => Promise<VoltOpsActionExecutionResult>;
    createFolder: (
      params: VoltOpsGoogleDriveCreateFolderParams,
    ) => Promise<VoltOpsActionExecutionResult>;
    moveFile: (params: VoltOpsGoogleDriveMoveParams) => Promise<VoltOpsActionExecutionResult>;
    copyFile: (params: VoltOpsGoogleDriveCopyParams) => Promise<VoltOpsActionExecutionResult>;
    deleteFile: (params: VoltOpsGoogleDriveDeleteParams) => Promise<VoltOpsActionExecutionResult>;
    shareFilePublic: (
      params: VoltOpsGoogleDriveShareParams,
    ) => Promise<VoltOpsActionExecutionResult>;
  };
  postgres: {
    executeQuery: (params: VoltOpsPostgresExecuteParams) => Promise<VoltOpsActionExecutionResult>;
  };
};

export interface VoltOpsEvalsApi {
  runs: {
    create(payload?: VoltOpsCreateEvalRunRequest): Promise<VoltOpsEvalRunSummary>;
    appendResults(
      runId: string,
      payload: VoltOpsAppendEvalRunResultsRequest,
    ): Promise<VoltOpsEvalRunSummary>;
    complete(runId: string, payload: VoltOpsCompleteEvalRunRequest): Promise<VoltOpsEvalRunSummary>;
    fail(runId: string, payload: VoltOpsFailEvalRunRequest): Promise<VoltOpsEvalRunSummary>;
  };
  scorers: {
    create(payload: VoltOpsCreateScorerRequest): Promise<VoltOpsScorerSummary>;
  };
}

/**
 * API response for prompt fetch operations
 * Simplified format matching the desired response structure
 */
export type PromptApiResponse = {
  /** Prompt name */
  name: string;
  /** Prompt type */
  type: "text" | "chat";
  /** Prompt content object */
  prompt: PromptContent;
  /** LLM configuration */
  config: {
    model?: string;
    temperature?: number;
    max_tokens?: number;
    top_p?: number;
    frequency_penalty?: number;
    presence_penalty?: number;
    supported_languages?: string[];
    [key: string]: any;
  };
  /** Prompt version number */
  version: number;
  /** Labels array */
  labels: string[];
  /** Tags array */
  tags: string[];
  /** Base prompt ID for tracking */
  prompt_id: string;
  /** PromptVersion ID (the actual entity ID) */
  prompt_version_id: string;
};

/**
 * API client interface for prompt operations
 */
export interface PromptApiClient {
  /** Fetch a prompt by reference */
  fetchPrompt(reference: PromptReference): Promise<PromptApiResponse>;
}

/**
 * VoltOps prompt manager interface
 */
export interface VoltOpsPromptManager {
  /** Get prompt content by reference */
  getPrompt(reference: PromptReference): Promise<PromptContent>;
  /** Preload prompts for better performance */
  preload(references: PromptReference[]): Promise<void>;
  /** Clear cache */
  clearCache(): void;
  /** Get cache statistics */
  getCacheStats(): { size: number; entries: string[] };
}

export type VoltOpsEvalRunStatus = "pending" | "running" | "succeeded" | "failed" | "cancelled";
export type VoltOpsTerminalEvalRunStatus = "succeeded" | "failed" | "cancelled";
export type VoltOpsEvalResultStatus = "pending" | "running" | "passed" | "failed" | "error";

export interface VoltOpsEvalRunSummary {
  id: string;
  status: VoltOpsEvalRunStatus | string;
  triggerSource: string;
  datasetId?: string | null;
  datasetVersionId?: string | null;
  datasetVersionLabel?: string | null;
  itemCount: number;
  successCount: number;
  failureCount: number;
  meanScore?: number | null;
  medianScore?: number | null;
  sumScore?: number | null;
  passRate?: number | null;
  startedAt?: string | null;
  completedAt?: string | null;
  durationMs?: number | null;
  tags?: string[] | null;
  createdAt: string;
  updatedAt: string;
}

export interface VoltOpsCreateEvalRunRequest {
  experimentId?: string;
  datasetVersionId?: string;
  providerCredentialId?: string;
  triggerSource?: string;
  autoQueue?: boolean;
}

export interface VoltOpsEvalRunResultScorePayload {
  scorerId: string;
  score?: number | null;
  threshold?: number | null;
  thresholdPassed?: boolean | null;
  metadata?: Record<string, unknown> | null;
}

export interface VoltOpsEvalRunResultLiveMetadata {
  traceId?: string | null;
  spanId?: string | null;
  operationId?: string | null;
  operationType?: string | null;
  sampling?: {
    strategy: string;
    rate?: number | null;
  } | null;
  triggerSource?: string | null;
  environment?: string | null;
}

export interface VoltOpsAppendEvalRunResultPayload {
  id?: string;
  datasetItemId?: string | null;
  datasetItemHash: string;
  status?: VoltOpsEvalResultStatus;
  input?: unknown;
  expected?: unknown;
  output?: unknown;
  durationMs?: number | null;
  scores?: VoltOpsEvalRunResultScorePayload[];
  metadata?: Record<string, unknown> | null;
  traceIds?: string[] | null;
  liveEval?: VoltOpsEvalRunResultLiveMetadata | null;
}

export interface VoltOpsAppendEvalRunResultsRequest {
  results: VoltOpsAppendEvalRunResultPayload[];
}

export interface VoltOpsEvalRunCompletionSummaryPayload {
  itemCount?: number;
  successCount?: number;
  failureCount?: number;
  meanScore?: number | null;
  medianScore?: number | null;
  sumScore?: number | null;
  passRate?: number | null;
  durationMs?: number | null;
  metadata?: Record<string, unknown> | null;
}

export interface VoltOpsEvalRunErrorPayload {
  message: string;
  code?: string;
  details?: Record<string, unknown>;
}

export interface VoltOpsCompleteEvalRunRequest {
  status: VoltOpsTerminalEvalRunStatus;
  summary?: VoltOpsEvalRunCompletionSummaryPayload;
  error?: VoltOpsEvalRunErrorPayload;
}

export interface VoltOpsFailEvalRunRequest {
  error: VoltOpsEvalRunErrorPayload;
}

export interface VoltOpsCreateScorerRequest {
  id: string;
  name: string;
  category?: string | null;
  description?: string | null;
  defaultThreshold?: number | null;
  thresholdOperator?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface VoltOpsScorerSummary {
  id: string;
  name: string;
  category?: string | null;
  description?: string | null;
  defaultThreshold?: number | null;
  thresholdOperator?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Main VoltOps client interface
 */
export interface VoltOpsClient {
  /** Prompt management functionality */
  prompts?: VoltOpsPromptManager;
  // observability removed - now handled by VoltAgentObservability
  /** Configuration options */
  options: VoltOpsClientOptions & { baseUrl: string };

  /** Actions client for third-party integrations */
  actions: VoltOpsActionsApi;

  /** Evaluations API surface */
  evals: VoltOpsEvalsApi;

  /** Create a prompt helper for agent instructions */
  createPromptHelper(agentId: string, historyEntryId?: string): PromptHelper;

  /** List managed memory databases available to the project */
  listManagedMemoryDatabases(): Promise<ManagedMemoryDatabaseSummary[]>;

  /** List credentials for a managed memory database */
  listManagedMemoryCredentials(databaseId: string): Promise<ManagedMemoryCredentialListResult>;

  /** Create a credential for a managed memory database */
  createManagedMemoryCredential(
    databaseId: string,
    input?: { name?: string },
  ): Promise<ManagedMemoryCredentialCreateResult>;

  /** Managed memory storage operations */
  managedMemory: ManagedMemoryVoltOpsClient;

  // Backward compatibility methods removed - migrated to OpenTelemetry
}

/**
 * Chat message structure compatible with BaseMessage
 */
export type ChatMessage = BaseMessage;

/**
 * Content of a prompt - either text or chat messages
 */
export interface PromptContent {
  type: "text" | "chat";
  text?: string;
  messages?: ChatMessage[];

  /**
   * Metadata about the prompt from VoltOps API
   * Available when prompt is fetched from VoltOps
   */
  metadata?: {
    /** Base prompt ID for tracking */
    prompt_id?: string;
    /** Specific PromptVersion ID (critical for analytics) */
    prompt_version_id?: string;
    /** Prompt name */
    name?: string;
    /** Prompt version number */
    version?: number;
    /** Labels array (e.g., 'production', 'staging', 'latest') */
    labels?: string[];
    /** Tags array for categorization */
    tags?: string[];
    /** LLM configuration from prompt */
    config?: {
      model?: string;
      temperature?: number;
      max_tokens?: number;
      top_p?: number;
      frequency_penalty?: number;
      presence_penalty?: number;
      supported_languages?: string[];
      [key: string]: any;
    };
  };
}

export interface ManagedMemoryConnectionInfo {
  host: string;
  port: number;
  database: string;
  schema: string;
  tablePrefix: string;
  ssl: boolean;
}

export interface ManagedMemoryDatabaseSummary {
  id: string;
  organization_id: string;
  name: string;
  region: string;
  schema_name: string;
  table_prefix: string;
  status: ManagedMemoryStatus;
  last_error?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  connection: ManagedMemoryConnectionInfo;
}

export interface ManagedMemoryCredentialSummary {
  id: string;
  name: string;
  role: string;
  username: string;
  secret: string | null;
  expiresAt: string | null;
  isRevoked: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ManagedMemoryCredentialListResult {
  connection: ManagedMemoryConnectionInfo;
  credentials: ManagedMemoryCredentialSummary[];
}

export interface ManagedMemoryCredentialCreateResult {
  connection: ManagedMemoryConnectionInfo;
  credential: ManagedMemoryCredentialSummary;
}

export interface ManagedMemoryAddMessageInput {
  conversationId: string;
  userId: string;
  message: UIMessage;
}

export interface ManagedMemoryAddMessagesInput {
  conversationId: string;
  userId: string;
  messages: UIMessage[];
}

export interface ManagedMemoryGetMessagesInput {
  conversationId: string;
  userId: string;
  options?: GetMessagesOptions;
}

export interface ManagedMemoryClearMessagesInput {
  userId: string;
  conversationId?: string;
}

export interface ManagedMemoryGetConversationStepsInput {
  conversationId: string;
  userId: string;
  options?: GetConversationStepsOptions;
}

export interface ManagedMemoryStoreVectorInput {
  id: string;
  vector: number[];
  metadata?: Record<string, unknown>;
  content?: string;
}

export interface ManagedMemoryStoreVectorsBatchInput {
  items: ManagedMemoryStoreVectorInput[];
}

export interface ManagedMemorySearchVectorsInput {
  vector: number[];
  limit?: number;
  threshold?: number;
  filter?: Record<string, unknown>;
}

export interface ManagedMemoryDeleteVectorsInput {
  ids: string[];
}

export interface ManagedMemoryUpdateConversationInput {
  conversationId: string;
  updates: Partial<Omit<Conversation, "id" | "createdAt" | "updatedAt">>;
}

export interface ManagedMemoryWorkingMemoryInput {
  scope: WorkingMemoryScope;
  conversationId?: string;
  userId?: string;
}

export interface ManagedMemorySetWorkingMemoryInput extends ManagedMemoryWorkingMemoryInput {
  content: string;
}

export interface ManagedMemoryQueryWorkflowRunsInput {
  workflowId?: string;
  status?: WorkflowStateEntry["status"];
  from?: Date;
  to?: Date;
  limit?: number;
  offset?: number;
}

export interface ManagedMemoryWorkflowStateUpdateInput {
  executionId: string;
  updates: Partial<WorkflowStateEntry>;
}

export interface ManagedMemoryMessagesClient {
  add(databaseId: string, input: ManagedMemoryAddMessageInput): Promise<void>;
  addBatch(databaseId: string, input: ManagedMemoryAddMessagesInput): Promise<void>;
  list(databaseId: string, input: ManagedMemoryGetMessagesInput): Promise<UIMessage[]>;
  clear(databaseId: string, input: ManagedMemoryClearMessagesInput): Promise<void>;
}

export interface ManagedMemoryConversationsClient {
  create(databaseId: string, input: CreateConversationInput): Promise<Conversation>;
  get(databaseId: string, conversationId: string): Promise<Conversation | null>;
  query(databaseId: string, options: ConversationQueryOptions): Promise<Conversation[]>;
  update(databaseId: string, input: ManagedMemoryUpdateConversationInput): Promise<Conversation>;
  delete(databaseId: string, conversationId: string): Promise<void>;
}

export interface ManagedMemoryWorkingMemoryClient {
  get(databaseId: string, input: ManagedMemoryWorkingMemoryInput): Promise<string | null>;
  set(databaseId: string, input: ManagedMemorySetWorkingMemoryInput): Promise<void>;
  delete(databaseId: string, input: ManagedMemoryWorkingMemoryInput): Promise<void>;
}

export interface ManagedMemoryWorkflowStatesClient {
  get(databaseId: string, executionId: string): Promise<WorkflowStateEntry | null>;
  set(databaseId: string, executionId: string, state: WorkflowStateEntry): Promise<void>;
  update(databaseId: string, input: ManagedMemoryWorkflowStateUpdateInput): Promise<void>;
  list(
    databaseId: string,
    input: ManagedMemoryQueryWorkflowRunsInput,
  ): Promise<WorkflowStateEntry[]>;
  query(
    databaseId: string,
    input: ManagedMemoryQueryWorkflowRunsInput,
  ): Promise<WorkflowStateEntry[]>;
  listSuspended(databaseId: string, workflowId: string): Promise<WorkflowStateEntry[]>;
}

export interface ManagedMemoryStepsClient {
  save(databaseId: string, steps: ConversationStepRecord[]): Promise<void>;
  list(
    databaseId: string,
    input: ManagedMemoryGetConversationStepsInput,
  ): Promise<ConversationStepRecord[]>;
}

export interface ManagedMemoryVectorsClient {
  store(databaseId: string, input: ManagedMemoryStoreVectorInput): Promise<void>;
  storeBatch(databaseId: string, input: ManagedMemoryStoreVectorsBatchInput): Promise<void>;
  search(databaseId: string, input: ManagedMemorySearchVectorsInput): Promise<SearchResult[]>;
  get(databaseId: string, vectorId: string): Promise<VectorItem | null>;
  delete(databaseId: string, vectorId: string): Promise<void>;
  deleteBatch(databaseId: string, input: ManagedMemoryDeleteVectorsInput): Promise<void>;
  clear(databaseId: string): Promise<void>;
  count(databaseId: string): Promise<number>;
}

export interface ManagedMemoryVoltOpsClient {
  messages: ManagedMemoryMessagesClient;
  conversations: ManagedMemoryConversationsClient;
  workingMemory: ManagedMemoryWorkingMemoryClient;
  workflowStates: ManagedMemoryWorkflowStatesClient;
  steps: ManagedMemoryStepsClient;
  vectors: ManagedMemoryVectorsClient;
}
