import { safeStringify } from "@voltagent/internal";
import type {
  VoltOpsActionExecutionResult,
  VoltOpsAirtableCreateRecordParams,
  VoltOpsAirtableCredential,
  VoltOpsAirtableDeleteRecordParams,
  VoltOpsAirtableGetRecordParams,
  VoltOpsAirtableListRecordsParams,
  VoltOpsAirtableUpdateRecordParams,
  VoltOpsDiscordChannelMessageParams,
  VoltOpsDiscordChannelType,
  VoltOpsDiscordConfig,
  VoltOpsDiscordCreateChannelParams,
  VoltOpsDiscordCredential,
  VoltOpsDiscordDeleteChannelParams,
  VoltOpsDiscordGetChannelParams,
  VoltOpsDiscordListChannelsParams,
  VoltOpsDiscordListMembersParams,
  VoltOpsDiscordListMessagesParams,
  VoltOpsDiscordMemberRoleParams,
  VoltOpsDiscordReactionParams,
  VoltOpsDiscordSendMessageParams,
  VoltOpsDiscordSendWebhookMessageParams,
  VoltOpsDiscordUpdateChannelParams,
  VoltOpsGmailCredential,
  VoltOpsGmailGetEmailParams,
  VoltOpsGmailGetThreadParams,
  VoltOpsGmailReplyParams,
  VoltOpsGmailSearchParams,
  VoltOpsGmailSendEmailParams,
  VoltOpsGoogleCalendarCreateParams,
  VoltOpsGoogleCalendarCredential,
  VoltOpsGoogleCalendarDeleteParams,
  VoltOpsGoogleCalendarGetParams,
  VoltOpsGoogleCalendarListParams,
  VoltOpsGoogleCalendarUpdateParams,
  VoltOpsGoogleDriveCopyParams,
  VoltOpsGoogleDriveCreateFolderParams,
  VoltOpsGoogleDriveCredential,
  VoltOpsGoogleDriveDeleteParams,
  VoltOpsGoogleDriveDownloadParams,
  VoltOpsGoogleDriveGetFileParams,
  VoltOpsGoogleDriveListParams,
  VoltOpsGoogleDriveMoveParams,
  VoltOpsGoogleDriveShareParams,
  VoltOpsGoogleDriveUploadParams,
  VoltOpsPostgresCredential,
  VoltOpsPostgresExecuteParams,
  VoltOpsSlackCredential,
  VoltOpsSlackDeleteMessageParams,
  VoltOpsSlackPostMessageParams,
  VoltOpsSlackSearchMessagesParams,
} from "../types";

export interface VoltOpsActionsTransport {
  sendRequest(path: string, init?: RequestInit): Promise<Response>;
}

export class VoltOpsActionError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "VoltOpsActionError";
  }
}

interface ActionExecutionResponse {
  actionId?: unknown;
  provider?: unknown;
  requestPayload?: unknown;
  request_payload?: unknown;
  responsePayload?: unknown;
  response_payload?: unknown;
  metadata?: unknown;
  metadata_json?: unknown;
}

interface ExecuteAirtableActionOptions {
  actionId: string;
  credential: VoltOpsAirtableCredential;
  baseId: string;
  tableId: string;
  catalogId?: string;
  projectId?: string | null;
  typecast?: boolean;
  returnFieldsByFieldId?: boolean;
  input: Record<string, unknown>;
}

export class VoltOpsActionsClient {
  public readonly airtable: {
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
  public readonly slack: {
    postMessage: (params: VoltOpsSlackPostMessageParams) => Promise<VoltOpsActionExecutionResult>;
    deleteMessage: (
      params: VoltOpsSlackDeleteMessageParams,
    ) => Promise<VoltOpsActionExecutionResult>;
    searchMessages: (
      params: VoltOpsSlackSearchMessagesParams,
    ) => Promise<VoltOpsActionExecutionResult>;
  };
  public readonly discord: {
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
  public readonly gmail: {
    sendEmail: (params: VoltOpsGmailSendEmailParams) => Promise<VoltOpsActionExecutionResult>;
    replyToEmail: (params: VoltOpsGmailReplyParams) => Promise<VoltOpsActionExecutionResult>;
    searchEmail: (params: VoltOpsGmailSearchParams) => Promise<VoltOpsActionExecutionResult>;
    getEmail: (params: VoltOpsGmailGetEmailParams) => Promise<VoltOpsActionExecutionResult>;
    getThread: (params: VoltOpsGmailGetThreadParams) => Promise<VoltOpsActionExecutionResult>;
  };
  public readonly googlecalendar: {
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
  public readonly googledrive: {
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
  public readonly postgres: {
    executeQuery: (params: VoltOpsPostgresExecuteParams) => Promise<VoltOpsActionExecutionResult>;
  };

  constructor(
    private readonly transport: VoltOpsActionsTransport,
    options?: { useProjectEndpoint?: boolean },
  ) {
    this.useProjectEndpoint = options?.useProjectEndpoint ?? false;
    this.airtable = {
      createRecord: this.createAirtableRecord.bind(this),
      updateRecord: this.updateAirtableRecord.bind(this),
      deleteRecord: this.deleteAirtableRecord.bind(this),
      getRecord: this.getAirtableRecord.bind(this),
      listRecords: this.listAirtableRecords.bind(this),
    };
    this.slack = {
      postMessage: this.postSlackMessage.bind(this),
      deleteMessage: this.deleteSlackMessage.bind(this),
      searchMessages: this.searchSlackMessages.bind(this),
    };
    this.discord = {
      sendMessage: this.sendDiscordMessage.bind(this),
      sendWebhookMessage: this.sendDiscordWebhookMessage.bind(this),
      deleteMessage: this.deleteDiscordMessage.bind(this),
      getMessage: this.getDiscordMessage.bind(this),
      listMessages: this.listDiscordMessages.bind(this),
      addReaction: this.addDiscordReaction.bind(this),
      removeReaction: this.removeDiscordReaction.bind(this),
      createChannel: this.createDiscordChannel.bind(this),
      updateChannel: this.updateDiscordChannel.bind(this),
      deleteChannel: this.deleteDiscordChannel.bind(this),
      getChannel: this.getDiscordChannel.bind(this),
      listChannels: this.listDiscordChannels.bind(this),
      listMembers: this.listDiscordMembers.bind(this),
      addMemberRole: this.addDiscordMemberRole.bind(this),
      removeMemberRole: this.removeDiscordMemberRole.bind(this),
    };
    this.gmail = {
      sendEmail: this.sendGmailEmail.bind(this),
      replyToEmail: this.replyGmailEmail.bind(this),
      searchEmail: this.searchGmailEmails.bind(this),
      getEmail: this.getGmailEmail.bind(this),
      getThread: this.getGmailThread.bind(this),
    };
    this.googlecalendar = {
      createEvent: this.createCalendarEvent.bind(this),
      updateEvent: this.updateCalendarEvent.bind(this),
      deleteEvent: this.deleteCalendarEvent.bind(this),
      listEvents: this.listCalendarEvents.bind(this),
      getEvent: this.getCalendarEvent.bind(this),
    };
    this.googledrive = {
      listFiles: this.listDriveFiles.bind(this),
      getFileMetadata: this.getDriveFileMetadata.bind(this),
      downloadFile: this.downloadDriveFile.bind(this),
      uploadFile: this.uploadDriveFile.bind(this),
      createFolder: this.createDriveFolder.bind(this),
      moveFile: this.moveDriveFile.bind(this),
      copyFile: this.copyDriveFile.bind(this),
      deleteFile: this.deleteDriveFile.bind(this),
      shareFilePublic: this.shareDriveFilePublic.bind(this),
    };
    this.postgres = {
      executeQuery: this.executePostgresQuery.bind(this),
    };
  }

  private readonly useProjectEndpoint: boolean;

  private get actionExecutionPath(): string {
    return this.useProjectEndpoint ? "/actions/project/run" : "/actions/execute";
  }

  private async createAirtableRecord(
    params: VoltOpsAirtableCreateRecordParams,
  ): Promise<VoltOpsActionExecutionResult> {
    if (!params || typeof params !== "object") {
      throw new VoltOpsActionError("params must be provided", 400);
    }

    const credential = this.ensureAirtableCredential(params.credential);
    const baseId = this.normalizeIdentifier(params.baseId, "baseId");
    const tableId = this.normalizeIdentifier(params.tableId, "tableId");
    const fields = this.ensureRecord(params.fields, "fields");

    const typecastValue = params.typecast ?? false;
    const returnFieldsValue = params.returnFieldsByFieldId ?? false;

    const input: Record<string, unknown> = {
      fields,
    };

    if (params.typecast !== undefined) {
      input.typecast = params.typecast;
    }
    if (params.returnFieldsByFieldId !== undefined) {
      input.returnFieldsByFieldId = params.returnFieldsByFieldId;
    }

    return this.executeAirtableAction({
      actionId: params.actionId ?? "airtable.createRecord",
      credential,
      baseId,
      tableId,
      catalogId: params.catalogId,
      projectId: params.projectId,
      typecast: typecastValue,
      returnFieldsByFieldId: returnFieldsValue,
      input,
    });
  }

  private async updateAirtableRecord(
    params: VoltOpsAirtableUpdateRecordParams,
  ): Promise<VoltOpsActionExecutionResult> {
    if (!params || typeof params !== "object") {
      throw new VoltOpsActionError("params must be provided", 400);
    }

    const credential = this.ensureAirtableCredential(params.credential);
    const baseId = this.normalizeIdentifier(params.baseId, "baseId");
    const tableId = this.normalizeIdentifier(params.tableId, "tableId");
    const recordId = this.normalizeIdentifier(params.recordId, "recordId");
    const fields =
      params.fields === undefined ? undefined : this.ensureRecord(params.fields, "fields");

    const typecastValue = params.typecast ?? false;
    const returnFieldsValue = params.returnFieldsByFieldId ?? false;

    const input: Record<string, unknown> = {
      recordId,
    };
    if (fields) {
      input.fields = fields;
    }
    if (params.typecast !== undefined) {
      input.typecast = params.typecast;
    }
    if (params.returnFieldsByFieldId !== undefined) {
      input.returnFieldsByFieldId = params.returnFieldsByFieldId;
    }

    return this.executeAirtableAction({
      actionId: params.actionId ?? "airtable.updateRecord",
      credential,
      baseId,
      tableId,
      catalogId: params.catalogId,
      projectId: params.projectId,
      typecast: typecastValue,
      returnFieldsByFieldId: returnFieldsValue,
      input,
    });
  }

  private async deleteAirtableRecord(
    params: VoltOpsAirtableDeleteRecordParams,
  ): Promise<VoltOpsActionExecutionResult> {
    if (!params || typeof params !== "object") {
      throw new VoltOpsActionError("params must be provided", 400);
    }

    const credential = this.ensureAirtableCredential(params.credential);
    const baseId = this.normalizeIdentifier(params.baseId, "baseId");
    const tableId = this.normalizeIdentifier(params.tableId, "tableId");
    const recordId = this.normalizeIdentifier(params.recordId, "recordId");

    const input: Record<string, unknown> = {
      recordId,
    };

    return this.executeAirtableAction({
      actionId: params.actionId ?? "airtable.deleteRecord",
      credential,
      baseId,
      tableId,
      catalogId: params.catalogId,
      projectId: params.projectId,
      input,
    });
  }

  private async getAirtableRecord(
    params: VoltOpsAirtableGetRecordParams,
  ): Promise<VoltOpsActionExecutionResult> {
    if (!params || typeof params !== "object") {
      throw new VoltOpsActionError("params must be provided", 400);
    }

    const credential = this.ensureAirtableCredential(params.credential);
    const baseId = this.normalizeIdentifier(params.baseId, "baseId");
    const tableId = this.normalizeIdentifier(params.tableId, "tableId");
    const recordId = this.normalizeIdentifier(params.recordId, "recordId");
    const returnFieldsValue = params.returnFieldsByFieldId ?? false;

    const input: Record<string, unknown> = {
      recordId,
    };
    if (params.returnFieldsByFieldId !== undefined) {
      input.returnFieldsByFieldId = params.returnFieldsByFieldId;
    }

    return this.executeAirtableAction({
      actionId: params.actionId ?? "airtable.getRecord",
      credential,
      baseId,
      tableId,
      catalogId: params.catalogId,
      projectId: params.projectId,
      returnFieldsByFieldId: returnFieldsValue,
      input,
    });
  }

  private async listAirtableRecords(
    params: VoltOpsAirtableListRecordsParams,
  ): Promise<VoltOpsActionExecutionResult> {
    if (!params || typeof params !== "object") {
      throw new VoltOpsActionError("params must be provided", 400);
    }

    const credential = this.ensureAirtableCredential(params.credential);
    const baseId = this.normalizeIdentifier(params.baseId, "baseId");
    const tableId = this.normalizeIdentifier(params.tableId, "tableId");

    const view = this.trimString(params.view);
    const filterByFormula = this.trimString(params.filterByFormula);
    const maxRecords = this.normalizePositiveInteger(params.maxRecords, "maxRecords");
    const pageSize = this.normalizePositiveInteger(params.pageSize, "pageSize");
    const offset = this.trimString(params.offset);
    const fields = this.sanitizeStringArray(params.fields);
    const sort = this.sanitizeSortArray(params.sort);
    const returnFieldsValue = params.returnFieldsByFieldId ?? false;

    const input: Record<string, unknown> = {};
    if (view) {
      input.view = view;
    }
    if (filterByFormula) {
      input.filterByFormula = filterByFormula;
    }
    if (typeof maxRecords === "number") {
      input.maxRecords = maxRecords;
    }
    if (typeof pageSize === "number") {
      input.pageSize = pageSize;
    }
    if (offset) {
      input.offset = offset;
    }
    if (Array.isArray(fields) && fields.length > 0) {
      input.fields = fields;
    }
    if (Array.isArray(sort) && sort.length > 0) {
      input.sort = sort;
    }
    if (params.returnFieldsByFieldId !== undefined) {
      input.returnFieldsByFieldId = params.returnFieldsByFieldId;
    }

    return this.executeAirtableAction({
      actionId: params.actionId ?? "airtable.listRecords",
      credential,
      baseId,
      tableId,
      catalogId: params.catalogId,
      projectId: params.projectId,
      returnFieldsByFieldId: returnFieldsValue,
      input,
    });
  }

  private async executeAirtableAction(
    options: ExecuteAirtableActionOptions,
  ): Promise<VoltOpsActionExecutionResult> {
    const config: Record<string, unknown> = {
      baseId: options.baseId,
      tableId: options.tableId,
    };
    if (options.typecast !== undefined) {
      config.typecast = options.typecast;
    }
    if (options.returnFieldsByFieldId !== undefined) {
      config.returnFieldsByFieldId = options.returnFieldsByFieldId;
    }

    const input = { ...options.input };
    if (!("baseId" in input)) {
      input.baseId = options.baseId;
    }
    if (!("tableId" in input)) {
      input.tableId = options.tableId;
    }

    const payload: Record<string, unknown> = {
      credential: options.credential,
      catalogId: options.catalogId ?? undefined,
      actionId: options.actionId,
      projectId: options.projectId ?? undefined,
      config: {
        airtable: config,
      },
      payload: {
        input,
      },
    };

    const response = await this.postActionExecution(this.actionExecutionPath, payload);
    return this.mapActionExecution(response);
  }

  private async postSlackMessage(
    params: VoltOpsSlackPostMessageParams,
  ): Promise<VoltOpsActionExecutionResult> {
    if (!params || typeof params !== "object") {
      throw new VoltOpsActionError("params must be provided", 400);
    }

    const credential = this.ensureSlackCredential(params.credential);
    const channelId = params.channelId
      ? this.normalizeIdentifier(params.channelId, "channelId")
      : null;
    const channelLabel =
      params.channelLabel !== undefined && params.channelLabel !== null
        ? this.normalizeString(params.channelLabel)
        : null;
    const defaultThreadTs =
      params.defaultThreadTs !== undefined && params.defaultThreadTs !== null
        ? this.normalizeString(params.defaultThreadTs)
        : null;

    const config =
      channelId || channelLabel || defaultThreadTs
        ? {
            channelId,
            channelLabel,
            defaultThreadTs,
          }
        : undefined;

    const input: Record<string, unknown> = {};
    if (params.targetType) {
      input.targetType = params.targetType;
    }
    if (params.channelId) {
      input.channelId = params.channelId;
    }
    if (params.channelName) {
      input.channelName = params.channelName;
    }
    if (params.userId) {
      input.userId = params.userId;
    }
    if (params.userName) {
      input.userName = params.userName;
    }
    if (params.text !== undefined) {
      input.text = params.text;
    }
    if (params.blocks !== undefined) {
      input.blocks = params.blocks;
    }
    if (params.attachments !== undefined) {
      input.attachments = params.attachments;
    }
    if (params.threadTs !== undefined) {
      input.threadTs = params.threadTs;
    }
    if (params.metadata !== undefined) {
      input.metadata = params.metadata;
    }
    if (params.linkNames !== undefined) {
      input.linkNames = params.linkNames;
    }
    if (params.unfurlLinks !== undefined) {
      input.unfurlLinks = params.unfurlLinks;
    }
    if (params.unfurlMedia !== undefined) {
      input.unfurlMedia = params.unfurlMedia;
    }

    return this.executeSlackAction({
      actionId: params.actionId ?? "slack.postMessage",
      credential,
      catalogId: params.catalogId,
      projectId: params.projectId,
      config,
      input,
    });
  }

  private async deleteSlackMessage(
    params: VoltOpsSlackDeleteMessageParams,
  ): Promise<VoltOpsActionExecutionResult> {
    if (!params || typeof params !== "object") {
      throw new VoltOpsActionError("params must be provided", 400);
    }

    const credential = this.ensureSlackCredential(params.credential);
    const channelId = this.normalizeIdentifier(params.channelId, "channelId");
    const messageTs = this.normalizeIdentifier(params.messageTs, "messageTs");

    const config = {
      channelId,
      channelLabel: null,
      defaultThreadTs: null,
    };

    const input: Record<string, unknown> = {
      channelId,
      messageTs,
    };
    if (params.threadTs) {
      input.threadTs = params.threadTs;
    }

    return this.executeSlackAction({
      actionId: params.actionId ?? "slack.deleteMessage",
      credential,
      catalogId: params.catalogId,
      projectId: params.projectId,
      config,
      input,
    });
  }

  private async searchSlackMessages(
    params: VoltOpsSlackSearchMessagesParams,
  ): Promise<VoltOpsActionExecutionResult> {
    if (!params || typeof params !== "object") {
      throw new VoltOpsActionError("params must be provided", 400);
    }

    const credential = this.ensureSlackCredential(params.credential);
    const query = this.trimString(params.query);
    if (!query) {
      throw new VoltOpsActionError("query must be provided", 400);
    }

    const input: Record<string, unknown> = {
      query,
    };

    if (params.sort) {
      input.sort = params.sort;
    }
    if (params.sortDirection) {
      input.sortDirection = params.sortDirection;
    }
    const channelIds = this.sanitizeStringArray(params.channelIds);
    if (channelIds) {
      input.channelIds = channelIds;
    }
    if (params.limit !== undefined) {
      input.limit = params.limit;
    }

    return this.executeSlackAction({
      actionId: params.actionId ?? "slack.searchMessages",
      credential,
      catalogId: params.catalogId,
      projectId: params.projectId,
      config: null,
      input,
    });
  }

  private async executeSlackAction(options: {
    actionId: string;
    credential: VoltOpsSlackCredential;
    catalogId?: string;
    projectId?: string | null;
    config?: Record<string, unknown> | null;
    input?: Record<string, unknown>;
  }): Promise<VoltOpsActionExecutionResult> {
    const payload: Record<string, unknown> = {
      credential: options.credential,
      catalogId: options.catalogId ?? undefined,
      actionId: options.actionId,
      projectId: options.projectId ?? undefined,
      config:
        options.config === undefined
          ? undefined
          : options.config === null
            ? null
            : { slack: options.config },
      payload: {
        input: options.input ?? {},
      },
    };

    const response = await this.postActionExecution(this.actionExecutionPath, payload);
    return this.mapActionExecution(response);
  }

  private async sendGmailEmail(
    params: VoltOpsGmailSendEmailParams,
  ): Promise<VoltOpsActionExecutionResult> {
    if (!params || typeof params !== "object") {
      throw new VoltOpsActionError("params must be provided", 400);
    }

    const credential = this.ensureGmailCredential(params.credential);
    const input = this.buildGmailSendInput(params, { requireThreadAnchor: false });

    return this.executeGmailAction({
      actionId: params.actionId ?? "gmail.sendEmail",
      credential,
      catalogId: params.catalogId,
      projectId: params.projectId,
      input,
    });
  }

  private async replyGmailEmail(
    params: VoltOpsGmailReplyParams,
  ): Promise<VoltOpsActionExecutionResult> {
    if (!params || typeof params !== "object") {
      throw new VoltOpsActionError("params must be provided", 400);
    }

    const credential = this.ensureGmailCredential(params.credential);
    const input = this.buildGmailSendInput(params, { requireThreadAnchor: true });

    return this.executeGmailAction({
      actionId: params.actionId ?? "gmail.replyToEmail",
      credential,
      catalogId: params.catalogId,
      projectId: params.projectId,
      input,
    });
  }

  private async searchGmailEmails(
    params: VoltOpsGmailSearchParams,
  ): Promise<VoltOpsActionExecutionResult> {
    if (!params || typeof params !== "object") {
      throw new VoltOpsActionError("params must be provided", 400);
    }

    const credential = this.ensureGmailCredential(params.credential);

    const rawParams = params as unknown as Record<string, unknown>;
    const input: Record<string, unknown> = {};
    const from = this.trimString(params.from);
    if (from) {
      input.from = from;
    }
    const to = this.trimString(params.to);
    if (to) {
      input.to = to;
    }
    const subject = this.trimString(params.subject);
    if (subject) {
      input.subject = subject;
    }
    const label = this.trimString(params.label);
    if (label) {
      input.label = label;
    }
    const category = this.trimString(params.category);
    if (category) {
      input.category = category;
    }
    const after = this.normalizePositiveInteger(params.after, "after");
    if (after !== undefined) {
      input.after = after;
    }
    const before = this.normalizePositiveInteger(params.before, "before");
    if (before !== undefined) {
      input.before = before;
    }
    const maxResults = this.normalizePositiveInteger(
      params.maxResults ?? rawParams.max_results,
      "maxResults",
    );
    if (maxResults !== undefined) {
      input.maxResults = maxResults;
    }
    const pageToken = this.trimString(params.pageToken ?? rawParams.page_token);
    if (pageToken) {
      input.pageToken = pageToken;
    }
    const query = this.trimString(params.query);
    if (query) {
      input.query = query;
    }

    return this.executeGmailAction({
      actionId: params.actionId ?? "gmail.searchEmail",
      credential,
      catalogId: params.catalogId,
      projectId: params.projectId,
      input,
    });
  }

  private async getGmailEmail(
    params: VoltOpsGmailGetEmailParams,
  ): Promise<VoltOpsActionExecutionResult> {
    if (!params || typeof params !== "object") {
      throw new VoltOpsActionError("params must be provided", 400);
    }

    const credential = this.ensureGmailCredential(params.credential);
    const messageId = this.normalizeIdentifier(params.messageId, "messageId");
    const format = this.normalizeGmailFormat(params.format);

    const input: Record<string, unknown> = { messageId };
    if (format) {
      input.format = format;
    }

    return this.executeGmailAction({
      actionId: params.actionId ?? "gmail.getEmail",
      credential,
      catalogId: params.catalogId,
      projectId: params.projectId,
      input,
    });
  }

  private async getGmailThread(
    params: VoltOpsGmailGetThreadParams,
  ): Promise<VoltOpsActionExecutionResult> {
    if (!params || typeof params !== "object") {
      throw new VoltOpsActionError("params must be provided", 400);
    }

    const credential = this.ensureGmailCredential(params.credential);
    const threadId = this.normalizeIdentifier(params.threadId, "threadId");
    const format = this.normalizeGmailFormat(params.format);

    const input: Record<string, unknown> = { threadId };
    if (format) {
      input.format = format;
    }

    return this.executeGmailAction({
      actionId: params.actionId ?? "gmail.getThread",
      credential,
      catalogId: params.catalogId,
      projectId: params.projectId,
      input,
    });
  }

  private async createCalendarEvent(
    params: VoltOpsGoogleCalendarCreateParams,
  ): Promise<VoltOpsActionExecutionResult> {
    if (!params || typeof params !== "object") {
      throw new VoltOpsActionError("params must be provided", 400);
    }

    const credential = this.ensureGoogleCalendarCredential(params.credential);
    const calendarId = this.trimString(params.calendarId) ?? "primary";
    const summary = this.trimString(params.summary);
    if (!summary) {
      throw new VoltOpsActionError("summary must be provided", 400);
    }
    const start = this.normalizeCalendarDateTime(params.start, "start");
    const end = this.normalizeCalendarDateTime(params.end, "end");
    if (!start || !end) {
      throw new VoltOpsActionError("start and end must be provided", 400);
    }

    const input: Record<string, unknown> = {
      calendarId,
      summary,
      start,
      end,
    };

    const description = this.trimString(params.description);
    if (description) input.description = description;
    const location = this.trimString(params.location);
    if (location) input.location = location;
    const status = this.trimString(params.status);
    if (status) input.status = status;
    const attendees = this.normalizeCalendarAttendees(params.attendees);
    if (attendees) input.attendees = attendees;

    return this.postActionExecution(this.actionExecutionPath, {
      credential,
      catalogId: params.catalogId ?? undefined,
      actionId: params.actionId ?? "calendar.createEvent",
      projectId: params.projectId ?? undefined,
      payload: { input },
    }).then((response) => this.mapActionExecution(response));
  }

  private async listDriveFiles(
    params: VoltOpsGoogleDriveListParams,
  ): Promise<VoltOpsActionExecutionResult> {
    if (!params || typeof params !== "object") {
      throw new VoltOpsActionError("params must be provided", 400);
    }
    const credential = this.ensureGoogleDriveCredential(params.credential);

    const input: Record<string, unknown> = {};
    const q = this.trimString(params.q);
    if (q) input.q = q;
    const orderBy = this.trimString(params.orderBy);
    if (orderBy) input.orderBy = orderBy;
    const pageSize = this.normalizePositiveInteger(params.pageSize, "pageSize");
    if (pageSize !== undefined) input.pageSize = pageSize;
    const pageToken = this.trimString(params.pageToken);
    if (pageToken) input.pageToken = pageToken;
    if (typeof params.includeTrashed === "boolean") {
      input.includeTrashed = params.includeTrashed;
    }

    return this.executeGoogleDriveAction({
      actionId: params.actionId ?? "drive.listFiles",
      credential,
      catalogId: params.catalogId,
      projectId: params.projectId,
      input,
    });
  }

  private async getDriveFileMetadata(
    params: VoltOpsGoogleDriveGetFileParams,
  ): Promise<VoltOpsActionExecutionResult> {
    if (!params || typeof params !== "object") {
      throw new VoltOpsActionError("params must be provided", 400);
    }
    const credential = this.ensureGoogleDriveCredential(params.credential);
    const fileId = this.normalizeIdentifier(params.fileId, "fileId");

    return this.executeGoogleDriveAction({
      actionId: params.actionId ?? "drive.getFileMetadata",
      credential,
      catalogId: params.catalogId,
      projectId: params.projectId,
      input: { fileId },
    });
  }

  private async downloadDriveFile(
    params: VoltOpsGoogleDriveDownloadParams,
  ): Promise<VoltOpsActionExecutionResult> {
    if (!params || typeof params !== "object") {
      throw new VoltOpsActionError("params must be provided", 400);
    }
    const credential = this.ensureGoogleDriveCredential(params.credential);
    const fileId = this.normalizeIdentifier(params.fileId, "fileId");

    return this.executeGoogleDriveAction({
      actionId: params.actionId ?? "drive.downloadFile",
      credential,
      catalogId: params.catalogId,
      projectId: params.projectId,
      input: { fileId },
    });
  }

  private async uploadDriveFile(
    params: VoltOpsGoogleDriveUploadParams,
  ): Promise<VoltOpsActionExecutionResult> {
    if (!params || typeof params !== "object") {
      throw new VoltOpsActionError("params must be provided", 400);
    }
    const credential = this.ensureGoogleDriveCredential(params.credential);
    const name = this.trimString(params.name);
    if (!name) {
      throw new VoltOpsActionError("name must be provided", 400);
    }

    const input: Record<string, unknown> = { name };
    const mimeType = this.trimString(params.mimeType);
    if (mimeType) input.mimeType = mimeType;
    const parents = this.normalizeStringArray(params.parents);
    if (parents) input.parents = parents;
    const content = this.trimString(params.content);
    if (content) input.content = content;
    if (typeof params.isBase64 === "boolean") {
      input.isBase64 = params.isBase64;
    }

    return this.executeGoogleDriveAction({
      actionId: params.actionId ?? "drive.uploadFile",
      credential,
      catalogId: params.catalogId,
      projectId: params.projectId,
      input,
    });
  }

  private async createDriveFolder(
    params: VoltOpsGoogleDriveCreateFolderParams,
  ): Promise<VoltOpsActionExecutionResult> {
    if (!params || typeof params !== "object") {
      throw new VoltOpsActionError("params must be provided", 400);
    }
    const credential = this.ensureGoogleDriveCredential(params.credential);
    const name = this.trimString(params.name);
    if (!name) {
      throw new VoltOpsActionError("name must be provided", 400);
    }

    const input: Record<string, unknown> = { name };
    const parents = this.normalizeStringArray(params.parents);
    if (parents) input.parents = parents;

    return this.executeGoogleDriveAction({
      actionId: params.actionId ?? "drive.createFolder",
      credential,
      catalogId: params.catalogId,
      projectId: params.projectId,
      input,
    });
  }

  private async moveDriveFile(
    params: VoltOpsGoogleDriveMoveParams,
  ): Promise<VoltOpsActionExecutionResult> {
    if (!params || typeof params !== "object") {
      throw new VoltOpsActionError("params must be provided", 400);
    }
    const credential = this.ensureGoogleDriveCredential(params.credential);
    const fileId = this.normalizeIdentifier(params.fileId, "fileId");
    const newParentId = this.normalizeIdentifier(params.newParentId, "newParentId");

    const input: Record<string, unknown> = { fileId, newParentId };
    if (typeof params.removeAllParents === "boolean") {
      input.removeAllParents = params.removeAllParents;
    }

    return this.executeGoogleDriveAction({
      actionId: params.actionId ?? "drive.moveFile",
      credential,
      catalogId: params.catalogId,
      projectId: params.projectId,
      input,
    });
  }

  private async copyDriveFile(
    params: VoltOpsGoogleDriveCopyParams,
  ): Promise<VoltOpsActionExecutionResult> {
    if (!params || typeof params !== "object") {
      throw new VoltOpsActionError("params must be provided", 400);
    }
    const credential = this.ensureGoogleDriveCredential(params.credential);
    const fileId = this.normalizeIdentifier(params.fileId, "fileId");

    const input: Record<string, unknown> = { fileId };
    const destinationParentId = this.trimString(params.destinationParentId);
    if (destinationParentId) input.destinationParentId = destinationParentId;
    const name = this.trimString(params.name);
    if (name) input.name = name;

    return this.executeGoogleDriveAction({
      actionId: params.actionId ?? "drive.copyFile",
      credential,
      catalogId: params.catalogId,
      projectId: params.projectId,
      input,
    });
  }

  private async deleteDriveFile(
    params: VoltOpsGoogleDriveDeleteParams,
  ): Promise<VoltOpsActionExecutionResult> {
    if (!params || typeof params !== "object") {
      throw new VoltOpsActionError("params must be provided", 400);
    }
    const credential = this.ensureGoogleDriveCredential(params.credential);
    const fileId = this.normalizeIdentifier(params.fileId, "fileId");

    return this.executeGoogleDriveAction({
      actionId: params.actionId ?? "drive.deleteFile",
      credential,
      catalogId: params.catalogId,
      projectId: params.projectId,
      input: { fileId },
    });
  }

  private async shareDriveFilePublic(
    params: VoltOpsGoogleDriveShareParams,
  ): Promise<VoltOpsActionExecutionResult> {
    if (!params || typeof params !== "object") {
      throw new VoltOpsActionError("params must be provided", 400);
    }
    const credential = this.ensureGoogleDriveCredential(params.credential);
    const fileId = this.normalizeIdentifier(params.fileId, "fileId");

    return this.executeGoogleDriveAction({
      actionId: params.actionId ?? "drive.shareFilePublic",
      credential,
      catalogId: params.catalogId,
      projectId: params.projectId,
      input: { fileId },
    });
  }

  private async executeGoogleDriveAction(options: {
    actionId: string;
    credential: VoltOpsGoogleDriveCredential;
    catalogId?: string;
    projectId?: string | null;
    input?: Record<string, unknown>;
  }): Promise<VoltOpsActionExecutionResult> {
    const payload: Record<string, unknown> = {
      credential: options.credential,
      catalogId: options.catalogId ?? undefined,
      actionId: options.actionId,
      projectId: options.projectId ?? undefined,
      payload: {
        input: options.input ?? {},
      },
    };

    const response = await this.postActionExecution(this.actionExecutionPath, payload);
    return this.mapActionExecution(response);
  }

  private async updateCalendarEvent(
    params: VoltOpsGoogleCalendarUpdateParams,
  ): Promise<VoltOpsActionExecutionResult> {
    if (!params || typeof params !== "object") {
      throw new VoltOpsActionError("params must be provided", 400);
    }

    const credential = this.ensureGoogleCalendarCredential(params.credential);
    const calendarId = this.trimString(params.calendarId) ?? "primary";
    const eventId = this.trimString(params.eventId);
    if (!eventId) {
      throw new VoltOpsActionError("eventId must be provided", 400);
    }

    const input: Record<string, unknown> = {
      calendarId,
      eventId,
    };

    const summary = this.trimString(params.summary);
    if (summary) input.summary = summary;
    const description = this.trimString(params.description);
    if (description) input.description = description;
    const location = this.trimString(params.location);
    if (location) input.location = location;
    const status = this.trimString(params.status);
    if (status) input.status = status;
    const start = this.normalizeCalendarDateTime(params.start, "start", { optional: true });
    if (start) input.start = start;
    const end = this.normalizeCalendarDateTime(params.end, "end", { optional: true });
    if (end) input.end = end;
    const attendees = this.normalizeCalendarAttendees(params.attendees);
    if (attendees) input.attendees = attendees;

    return this.postActionExecution(this.actionExecutionPath, {
      credential,
      catalogId: params.catalogId ?? undefined,
      actionId: params.actionId ?? "calendar.updateEvent",
      projectId: params.projectId ?? undefined,
      payload: { input },
    }).then((response) => this.mapActionExecution(response));
  }

  private async deleteCalendarEvent(
    params: VoltOpsGoogleCalendarDeleteParams,
  ): Promise<VoltOpsActionExecutionResult> {
    if (!params || typeof params !== "object") {
      throw new VoltOpsActionError("params must be provided", 400);
    }
    const credential = this.ensureGoogleCalendarCredential(params.credential);
    const calendarId = this.trimString(params.calendarId) ?? "primary";
    const eventId = this.trimString(params.eventId);
    if (!eventId) {
      throw new VoltOpsActionError("eventId must be provided", 400);
    }

    const input: Record<string, unknown> = {
      calendarId,
      eventId,
    };

    return this.postActionExecution(this.actionExecutionPath, {
      credential,
      catalogId: params.catalogId ?? undefined,
      actionId: params.actionId ?? "calendar.deleteEvent",
      projectId: params.projectId ?? undefined,
      payload: { input },
    }).then((response) => this.mapActionExecution(response));
  }

  private async listCalendarEvents(
    params: VoltOpsGoogleCalendarListParams,
  ): Promise<VoltOpsActionExecutionResult> {
    if (!params || typeof params !== "object") {
      throw new VoltOpsActionError("params must be provided", 400);
    }
    const credential = this.ensureGoogleCalendarCredential(params.credential);
    const calendarId = this.trimString(params.calendarId) ?? "primary";

    const input: Record<string, unknown> = {
      calendarId,
    };
    const timeMin = this.trimString(params.timeMin);
    if (timeMin) input.timeMin = timeMin;
    const timeMax = this.trimString(params.timeMax);
    if (timeMax) input.timeMax = timeMax;
    const maxResults = this.normalizePositiveInteger(params.maxResults, "maxResults", {
      allowZero: false,
    });
    if (typeof maxResults === "number") {
      input.maxResults = maxResults;
    }
    const pageToken = this.trimString(params.pageToken);
    if (pageToken) input.pageToken = pageToken;
    const q = this.trimString(params.q);
    if (q) input.q = q;
    if (typeof params.showDeleted === "boolean") {
      input.showDeleted = params.showDeleted;
    }
    if (typeof params.singleEvents === "boolean") {
      input.singleEvents = params.singleEvents;
    }
    const orderBy = this.trimString(params.orderBy);
    if (orderBy) input.orderBy = orderBy;

    return this.postActionExecution(this.actionExecutionPath, {
      credential,
      catalogId: params.catalogId ?? undefined,
      actionId: params.actionId ?? "calendar.listEvents",
      projectId: params.projectId ?? undefined,
      payload: { input },
    }).then((response) => this.mapActionExecution(response));
  }

  private async getCalendarEvent(
    params: VoltOpsGoogleCalendarGetParams,
  ): Promise<VoltOpsActionExecutionResult> {
    if (!params || typeof params !== "object") {
      throw new VoltOpsActionError("params must be provided", 400);
    }
    const credential = this.ensureGoogleCalendarCredential(params.credential);
    const calendarId = this.trimString(params.calendarId) ?? "primary";
    const eventId = this.trimString(params.eventId);
    if (!eventId) {
      throw new VoltOpsActionError("eventId must be provided", 400);
    }

    const input: Record<string, unknown> = {
      calendarId,
      eventId,
    };

    return this.postActionExecution(this.actionExecutionPath, {
      credential,
      catalogId: params.catalogId ?? undefined,
      actionId: params.actionId ?? "calendar.getEvent",
      projectId: params.projectId ?? undefined,
      payload: { input },
    }).then((response) => this.mapActionExecution(response));
  }

  private async executePostgresQuery(
    params: VoltOpsPostgresExecuteParams,
  ): Promise<VoltOpsActionExecutionResult> {
    if (!params || typeof params !== "object") {
      throw new VoltOpsActionError("params must be provided", 400);
    }

    const credential = this.ensurePostgresCredential(params.credential);
    const query = this.trimString(params.query);
    if (!query) {
      throw new VoltOpsActionError("query must be provided", 400);
    }

    const parameters = Array.isArray(params.parameters) ? params.parameters : [];
    const applicationName = this.trimString(params.applicationName);
    const statementTimeoutMs = this.normalizePositiveInteger(
      params.statementTimeoutMs,
      "statementTimeoutMs",
      { allowZero: false },
    );
    const connectionTimeoutMs = this.normalizePositiveInteger(
      params.connectionTimeoutMs,
      "connectionTimeoutMs",
      { allowZero: false },
    );
    const ssl =
      params.ssl && typeof params.ssl === "object" && !Array.isArray(params.ssl)
        ? {
            rejectUnauthorized:
              typeof (params.ssl as any).rejectUnauthorized === "boolean"
                ? (params.ssl as any).rejectUnauthorized
                : undefined,
          }
        : undefined;

    const input: Record<string, unknown> = {
      query,
    };
    if (parameters.length) {
      input.parameters = parameters;
    }
    if (applicationName) {
      input.applicationName = applicationName;
    }
    if (typeof statementTimeoutMs === "number") {
      input.statementTimeoutMs = statementTimeoutMs;
    }
    if (typeof connectionTimeoutMs === "number") {
      input.connectionTimeoutMs = connectionTimeoutMs;
    }
    if (ssl) {
      input.ssl = ssl;
    }

    const payload: Record<string, unknown> = {
      credential,
      catalogId: params.catalogId ?? undefined,
      actionId: params.actionId ?? "postgres.executeQuery",
      projectId: params.projectId ?? undefined,
      payload: {
        input,
      },
    };

    const response = await this.postActionExecution(this.actionExecutionPath, payload);
    return this.mapActionExecution(response);
  }

  private async sendDiscordMessage(
    params: VoltOpsDiscordSendMessageParams,
  ): Promise<VoltOpsActionExecutionResult> {
    if (!params || typeof params !== "object") {
      throw new VoltOpsActionError("params must be provided", 400);
    }

    const credential = this.ensureDiscordCredential(params.credential);
    const { input, configDefaults } = this.buildDiscordMessageInput(params);
    const config = this.mergeDiscordConfig(configDefaults, params.config);

    return this.executeDiscordAction({
      actionId: params.actionId ?? "discord.sendMessage",
      credential,
      catalogId: params.catalogId,
      projectId: params.projectId,
      config,
      input,
    });
  }

  private async sendDiscordWebhookMessage(
    params: VoltOpsDiscordSendWebhookMessageParams,
  ): Promise<VoltOpsActionExecutionResult> {
    if (!params || typeof params !== "object") {
      throw new VoltOpsActionError("params must be provided", 400);
    }

    const credential = this.ensureDiscordCredential(params.credential);
    const { input, configDefaults } = this.buildDiscordMessageInput(params);

    const username = this.trimString(params.username);
    if (username) {
      input.username = username;
    }
    const avatarUrl = this.trimString(params.avatarUrl);
    if (avatarUrl) {
      input.avatarUrl = avatarUrl;
    }

    const config = this.mergeDiscordConfig(configDefaults, params.config);

    return this.executeDiscordAction({
      actionId: params.actionId ?? "discord.sendWebhookMessage",
      credential,
      catalogId: params.catalogId,
      projectId: params.projectId,
      config,
      input,
    });
  }

  private async deleteDiscordMessage(
    params: VoltOpsDiscordChannelMessageParams,
  ): Promise<VoltOpsActionExecutionResult> {
    if (!params || typeof params !== "object") {
      throw new VoltOpsActionError("params must be provided", 400);
    }

    const credential = this.ensureDiscordCredential(params.credential);
    const channelId = this.normalizeIdentifier(params.channelId, "channelId");
    const messageId = this.normalizeIdentifier(params.messageId, "messageId");

    const input: Record<string, unknown> = {
      channelId,
      messageId,
    };

    const config = this.mergeDiscordConfig({ channelId }, params.config);

    return this.executeDiscordAction({
      actionId: params.actionId ?? "discord.deleteMessage",
      credential,
      catalogId: params.catalogId,
      projectId: params.projectId,
      config,
      input,
    });
  }

  private async getDiscordMessage(
    params: VoltOpsDiscordChannelMessageParams,
  ): Promise<VoltOpsActionExecutionResult> {
    if (!params || typeof params !== "object") {
      throw new VoltOpsActionError("params must be provided", 400);
    }

    const credential = this.ensureDiscordCredential(params.credential);
    const channelId = this.normalizeIdentifier(params.channelId, "channelId");
    const messageId = this.normalizeIdentifier(params.messageId, "messageId");

    const input: Record<string, unknown> = {
      channelId,
      messageId,
    };

    const config = this.mergeDiscordConfig({ channelId }, params.config);

    return this.executeDiscordAction({
      actionId: params.actionId ?? "discord.getMessage",
      credential,
      catalogId: params.catalogId,
      projectId: params.projectId,
      config,
      input,
    });
  }

  private async listDiscordMessages(
    params: VoltOpsDiscordListMessagesParams,
  ): Promise<VoltOpsActionExecutionResult> {
    if (!params || typeof params !== "object") {
      throw new VoltOpsActionError("params must be provided", 400);
    }

    const credential = this.ensureDiscordCredential(params.credential);
    const channelId = this.normalizeIdentifier(params.channelId, "channelId");
    const limit = this.normalizePositiveInteger(params.limit, "limit");
    const before = this.trimString(params.before);
    const after = this.trimString(params.after);

    const input: Record<string, unknown> = {
      channelId,
    };
    if (typeof limit === "number") {
      input.limit = limit;
    }
    if (before) {
      input.before = before;
    }
    if (after) {
      input.after = after;
    }

    const config = this.mergeDiscordConfig({ channelId }, params.config);

    return this.executeDiscordAction({
      actionId: params.actionId ?? "discord.listMessages",
      credential,
      catalogId: params.catalogId,
      projectId: params.projectId,
      config,
      input,
    });
  }

  private async addDiscordReaction(
    params: VoltOpsDiscordReactionParams,
  ): Promise<VoltOpsActionExecutionResult> {
    return this.handleDiscordReaction(params, "discord.reactToMessage");
  }

  private async removeDiscordReaction(
    params: VoltOpsDiscordReactionParams,
  ): Promise<VoltOpsActionExecutionResult> {
    return this.handleDiscordReaction(params, "discord.removeReaction");
  }

  private async handleDiscordReaction(
    params: VoltOpsDiscordReactionParams,
    defaultActionId: string,
  ): Promise<VoltOpsActionExecutionResult> {
    if (!params || typeof params !== "object") {
      throw new VoltOpsActionError("params must be provided", 400);
    }

    const credential = this.ensureDiscordCredential(params.credential);
    const channelId = this.normalizeIdentifier(params.channelId, "channelId");
    const messageId = this.normalizeIdentifier(params.messageId, "messageId");
    const emoji = this.normalizeIdentifier(params.emoji, "emoji");

    const input: Record<string, unknown> = {
      channelId,
      messageId,
      emoji,
    };

    const config = this.mergeDiscordConfig({ channelId }, params.config);

    return this.executeDiscordAction({
      actionId: params.actionId ?? defaultActionId,
      credential,
      catalogId: params.catalogId,
      projectId: params.projectId,
      config,
      input,
    });
  }

  private async createDiscordChannel(
    params: VoltOpsDiscordCreateChannelParams,
  ): Promise<VoltOpsActionExecutionResult> {
    if (!params || typeof params !== "object") {
      throw new VoltOpsActionError("params must be provided", 400);
    }

    const credential = this.ensureDiscordCredential(params.credential);
    const guildId = this.normalizeIdentifier(params.guildId, "guildId");
    const name = this.normalizeIdentifier(params.name, "name");
    const channelType = this.normalizeDiscordChannelType(params.type);
    const topic = this.trimString(params.topic);

    const input: Record<string, unknown> = {
      guildId,
      name,
    };
    if (channelType) {
      input.type = channelType;
    }
    if (topic) {
      input.topic = topic;
    }

    const config = this.mergeDiscordConfig({ guildId }, params.config);

    return this.executeDiscordAction({
      actionId: params.actionId ?? "discord.createChannel",
      credential,
      catalogId: params.catalogId,
      projectId: params.projectId,
      config,
      input,
    });
  }

  private async updateDiscordChannel(
    params: VoltOpsDiscordUpdateChannelParams,
  ): Promise<VoltOpsActionExecutionResult> {
    if (!params || typeof params !== "object") {
      throw new VoltOpsActionError("params must be provided", 400);
    }

    const credential = this.ensureDiscordCredential(params.credential);
    const channelId = this.normalizeIdentifier(params.channelId, "channelId");
    const name = this.trimString(params.name);
    const topic = this.trimString(params.topic);
    const archived = typeof params.archived === "boolean" ? params.archived : undefined;
    const locked = typeof params.locked === "boolean" ? params.locked : undefined;

    const input: Record<string, unknown> = {
      channelId,
    };
    if (name) {
      input.name = name;
    }
    if (topic) {
      input.topic = topic;
    }
    if (archived !== undefined) {
      input.archived = archived;
    }
    if (locked !== undefined) {
      input.locked = locked;
    }

    const config = this.mergeDiscordConfig({ channelId }, params.config);

    return this.executeDiscordAction({
      actionId: params.actionId ?? "discord.updateChannel",
      credential,
      catalogId: params.catalogId,
      projectId: params.projectId,
      config,
      input,
    });
  }

  private async deleteDiscordChannel(
    params: VoltOpsDiscordDeleteChannelParams,
  ): Promise<VoltOpsActionExecutionResult> {
    if (!params || typeof params !== "object") {
      throw new VoltOpsActionError("params must be provided", 400);
    }

    const credential = this.ensureDiscordCredential(params.credential);
    const channelId = this.normalizeIdentifier(params.channelId, "channelId");

    const input: Record<string, unknown> = {
      channelId,
    };

    const config = this.mergeDiscordConfig({ channelId }, params.config);

    return this.executeDiscordAction({
      actionId: params.actionId ?? "discord.deleteChannel",
      credential,
      catalogId: params.catalogId,
      projectId: params.projectId,
      config,
      input,
    });
  }

  private async getDiscordChannel(
    params: VoltOpsDiscordGetChannelParams,
  ): Promise<VoltOpsActionExecutionResult> {
    if (!params || typeof params !== "object") {
      throw new VoltOpsActionError("params must be provided", 400);
    }

    const credential = this.ensureDiscordCredential(params.credential);
    const channelId = this.normalizeIdentifier(params.channelId, "channelId");

    const config = this.mergeDiscordConfig({ channelId }, params.config);

    return this.executeDiscordAction({
      actionId: params.actionId ?? "discord.getChannel",
      credential,
      catalogId: params.catalogId,
      projectId: params.projectId,
      config,
      input: {
        channelId,
      },
    });
  }

  private async listDiscordChannels(
    params: VoltOpsDiscordListChannelsParams,
  ): Promise<VoltOpsActionExecutionResult> {
    if (!params || typeof params !== "object") {
      throw new VoltOpsActionError("params must be provided", 400);
    }

    const credential = this.ensureDiscordCredential(params.credential);
    const guildId = this.normalizeIdentifier(params.guildId, "guildId");

    const config = this.mergeDiscordConfig({ guildId }, params.config);

    return this.executeDiscordAction({
      actionId: params.actionId ?? "discord.listChannels",
      credential,
      catalogId: params.catalogId,
      projectId: params.projectId,
      config,
      input: {
        guildId,
      },
    });
  }

  private async listDiscordMembers(
    params: VoltOpsDiscordListMembersParams,
  ): Promise<VoltOpsActionExecutionResult> {
    if (!params || typeof params !== "object") {
      throw new VoltOpsActionError("params must be provided", 400);
    }

    const credential = this.ensureDiscordCredential(params.credential);
    const guildId = this.normalizeIdentifier(params.guildId, "guildId");
    const limit = this.normalizePositiveInteger(params.limit, "limit");
    const after = this.trimString(params.after);

    const input: Record<string, unknown> = {
      guildId,
    };
    if (typeof limit === "number") {
      input.limit = limit;
    }
    if (after) {
      input.after = after;
    }

    const config = this.mergeDiscordConfig({ guildId }, params.config);

    return this.executeDiscordAction({
      actionId: params.actionId ?? "discord.listMembers",
      credential,
      catalogId: params.catalogId,
      projectId: params.projectId,
      config,
      input,
    });
  }

  private async addDiscordMemberRole(
    params: VoltOpsDiscordMemberRoleParams,
  ): Promise<VoltOpsActionExecutionResult> {
    return this.handleDiscordMemberRole(params, "discord.addMemberRole");
  }

  private async removeDiscordMemberRole(
    params: VoltOpsDiscordMemberRoleParams,
  ): Promise<VoltOpsActionExecutionResult> {
    return this.handleDiscordMemberRole(params, "discord.removeMemberRole");
  }

  private async handleDiscordMemberRole(
    params: VoltOpsDiscordMemberRoleParams,
    defaultActionId: string,
  ): Promise<VoltOpsActionExecutionResult> {
    if (!params || typeof params !== "object") {
      throw new VoltOpsActionError("params must be provided", 400);
    }

    const credential = this.ensureDiscordCredential(params.credential);
    const guildId = this.normalizeIdentifier(params.guildId, "guildId");
    const userId = this.normalizeIdentifier(params.userId, "userId");
    const roleId = this.normalizeIdentifier(params.roleId, "roleId");

    const config = this.mergeDiscordConfig({ guildId, userId, roleId }, params.config);

    return this.executeDiscordAction({
      actionId: params.actionId ?? defaultActionId,
      credential,
      catalogId: params.catalogId,
      projectId: params.projectId,
      config,
      input: {
        guildId,
        userId,
        roleId,
      },
    });
  }

  private async executeDiscordAction(options: {
    actionId: string;
    credential: VoltOpsDiscordCredential;
    catalogId?: string;
    projectId?: string | null;
    config?: VoltOpsDiscordConfig | null;
    input?: Record<string, unknown>;
  }): Promise<VoltOpsActionExecutionResult> {
    let normalizedConfig: VoltOpsDiscordConfig | null | undefined;
    if (options.config === undefined) {
      normalizedConfig = undefined;
    } else if (options.config === null) {
      normalizedConfig = null;
    } else {
      normalizedConfig = this.mergeDiscordConfig(options.config, undefined);
    }

    const payload: Record<string, unknown> = {
      credential: options.credential,
      catalogId: options.catalogId ?? undefined,
      actionId: options.actionId,
      projectId: options.projectId ?? undefined,
      config:
        normalizedConfig === undefined
          ? undefined
          : normalizedConfig === null
            ? null
            : { discord: normalizedConfig },
      payload: {
        input: options.input ?? {},
      },
    };

    const response = await this.postActionExecution(this.actionExecutionPath, payload);
    return this.mapActionExecution(response);
  }

  private buildDiscordMessageInput(params: VoltOpsDiscordSendMessageParams): {
    input: Record<string, unknown>;
    configDefaults?: VoltOpsDiscordConfig;
  } {
    const guildId = this.optionalIdentifier(params.guildId);
    const channelId = this.optionalIdentifier(params.channelId);
    const threadId = this.optionalIdentifier(params.threadId);
    const content = this.trimString(params.content);
    const embeds =
      params.embeds === undefined || params.embeds === null
        ? undefined
        : this.ensureArray(params.embeds, "embeds");
    const components =
      params.components === undefined || params.components === null
        ? undefined
        : this.ensureArray(params.components, "components");
    const allowedMentions =
      params.allowedMentions === undefined || params.allowedMentions === null
        ? undefined
        : this.ensureRecord(params.allowedMentions, "allowedMentions");
    const legacyMessageId =
      typeof (params as { messageId?: unknown }).messageId === "string"
        ? ((params as { messageId?: string }).messageId ?? undefined)
        : undefined;
    const replyToMessageId = this.optionalIdentifier(params.replyToMessageId ?? legacyMessageId);

    if (!content && (!embeds || embeds.length === 0) && (!components || components.length === 0)) {
      throw new VoltOpsActionError(
        "Provide at least one of content, embeds, or components for Discord messages",
        400,
      );
    }

    const input: Record<string, unknown> = {};
    if (guildId) {
      input.guildId = guildId;
    }
    if (channelId) {
      input.channelId = channelId;
    }
    if (threadId) {
      input.threadId = threadId;
    }
    if (content) {
      input.content = content;
    }
    if (embeds && embeds.length > 0) {
      input.embeds = embeds;
    }
    if (components && components.length > 0) {
      input.components = components;
    }
    if (typeof params.tts === "boolean") {
      input.tts = params.tts;
    }
    if (allowedMentions) {
      input.allowedMentions = allowedMentions;
    }
    if (replyToMessageId) {
      input.replyToMessageId = replyToMessageId;
    }

    const configDefaults =
      guildId || channelId || threadId
        ? {
            guildId,
            channelId,
            threadId,
          }
        : undefined;

    return { input, configDefaults };
  }

  private mergeDiscordConfig(
    base?: VoltOpsDiscordConfig | null,
    override?: VoltOpsDiscordConfig | null,
  ): VoltOpsDiscordConfig | null | undefined {
    if (base === null || override === null) {
      return null;
    }

    const normalized: VoltOpsDiscordConfig = {};
    const apply = (source?: VoltOpsDiscordConfig | null) => {
      if (!source) {
        return;
      }
      const guildId = this.optionalIdentifier(source.guildId);
      if (guildId) {
        normalized.guildId = guildId;
      }
      const channelId = this.optionalIdentifier(source.channelId);
      if (channelId) {
        normalized.channelId = channelId;
      }
      const threadId = this.optionalIdentifier(source.threadId);
      if (threadId) {
        normalized.threadId = threadId;
      }
      const userId = this.optionalIdentifier(source.userId);
      if (userId) {
        normalized.userId = userId;
      }
      const roleId = this.optionalIdentifier(source.roleId);
      if (roleId) {
        normalized.roleId = roleId;
      }
    };

    apply(base ?? undefined);
    apply(override ?? undefined);

    return Object.keys(normalized).length > 0 ? normalized : undefined;
  }

  private optionalIdentifier(value: unknown): string | undefined {
    const trimmed = this.trimString(value);
    return trimmed ?? undefined;
  }

  private ensureArray(value: unknown, field: string): unknown[] {
    if (!Array.isArray(value)) {
      throw new VoltOpsActionError(`${field} must be an array`, 400);
    }
    return value;
  }

  private normalizeDiscordChannelType(value: unknown): VoltOpsDiscordChannelType | undefined {
    if (value === undefined || value === null) {
      return undefined;
    }
    const trimmed = this.trimString(value);
    if (!trimmed) {
      throw new VoltOpsActionError(
        "type must be one of text, voice, announcement, category, or forum",
        400,
      );
    }
    const normalized = trimmed.toLowerCase();
    const allowed: VoltOpsDiscordChannelType[] = [
      "text",
      "voice",
      "announcement",
      "category",
      "forum",
    ];
    if (allowed.includes(normalized as VoltOpsDiscordChannelType)) {
      return normalized as VoltOpsDiscordChannelType;
    }
    throw new VoltOpsActionError(
      "type must be one of text, voice, announcement, category, or forum",
      400,
    );
  }

  private ensureAirtableCredential(
    value: VoltOpsAirtableCredential | null | undefined,
  ): VoltOpsAirtableCredential {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new VoltOpsActionError("credential must be an object", 400);
    }
    const record = value as Record<string, unknown>;
    const metadata = this.normalizeCredentialMetadata(record.metadata);
    const storedId = this.trimString(
      typeof (record as any).credentialId === "string"
        ? ((record as any).credentialId as string)
        : typeof (record as any).id === "string"
          ? ((record as any).id as string)
          : undefined,
    );
    if (storedId) {
      return metadata ? { credentialId: storedId, metadata } : { credentialId: storedId };
    }
    const apiKey = this.trimString(record.apiKey);
    if (apiKey) {
      return metadata ? { apiKey, metadata } : { apiKey };
    }
    throw new VoltOpsActionError(
      "credential.id or credential.apiKey must be provided for Airtable actions",
      400,
    );
  }

  private ensureSlackCredential(
    value: VoltOpsSlackCredential | null | undefined,
  ): VoltOpsSlackCredential {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new VoltOpsActionError("credential must be an object", 400);
    }
    const record = value as Record<string, unknown>;
    const metadata = this.normalizeCredentialMetadata(record.metadata);
    const storedId = this.trimString(
      typeof (record as any).credentialId === "string"
        ? ((record as any).credentialId as string)
        : typeof (record as any).id === "string"
          ? ((record as any).id as string)
          : undefined,
    );
    if (storedId) {
      return metadata ? { credentialId: storedId, metadata } : { credentialId: storedId };
    }
    const botToken = this.trimString(record.botToken);
    if (botToken) {
      return metadata ? { botToken, metadata } : { botToken };
    }
    throw new VoltOpsActionError(
      "credential.id or credential.botToken must be provided for Slack actions",
      400,
    );
  }

  private ensureDiscordCredential(
    value: VoltOpsDiscordCredential | null | undefined,
  ): VoltOpsDiscordCredential {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new VoltOpsActionError("credential must be an object", 400);
    }
    const record = value as Record<string, unknown>;
    const metadata = this.normalizeCredentialMetadata(record.metadata);
    const storedId = this.trimString(
      typeof (record as any).credentialId === "string"
        ? ((record as any).credentialId as string)
        : typeof (record as any).id === "string"
          ? ((record as any).id as string)
          : undefined,
    );
    if (storedId) {
      return metadata ? { credentialId: storedId, metadata } : { credentialId: storedId };
    }
    const botToken = this.trimString(record.botToken);
    if (botToken) {
      return metadata ? { botToken, metadata } : { botToken };
    }
    const webhookUrl = this.trimString(record.webhookUrl);
    if (webhookUrl) {
      return metadata ? { webhookUrl, metadata } : { webhookUrl };
    }
    throw new VoltOpsActionError(
      "credential must include id, botToken, or webhookUrl for Discord actions",
      400,
    );
  }

  private ensureGmailCredential(
    value: VoltOpsGmailCredential | null | undefined,
  ): VoltOpsGmailCredential {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new VoltOpsActionError("credential must be an object", 400);
    }

    const record = value as Record<string, unknown>;
    const metadata = this.normalizeCredentialMetadata(record.metadata);
    const storedId = this.trimString(
      typeof (record as any).credentialId === "string"
        ? ((record as any).credentialId as string)
        : typeof (record as any).id === "string"
          ? ((record as any).id as string)
          : undefined,
    );
    if (storedId) {
      return metadata ? { credentialId: storedId, metadata } : { credentialId: storedId };
    }

    const clientEmail = this.trimString(record.clientEmail);
    const privateKey = this.trimString(record.privateKey);
    if (clientEmail && privateKey) {
      const subject = this.trimString(record.subject ?? (record as any).userEmail);
      const payload: Record<string, unknown> = {
        clientEmail,
        privateKey,
      };
      if (subject) {
        payload.subject = subject;
      }
      if (metadata) {
        payload.metadata = metadata;
      }
      return payload as VoltOpsGmailCredential;
    }

    const accessToken = this.trimString(
      record.accessToken ?? (record as any).token ?? (record as any).access_token,
    );
    const refreshToken = this.trimString(record.refreshToken);
    const clientId = this.trimString(record.clientId);
    const clientSecret = this.trimString(record.clientSecret);
    const tokenType = this.trimString(record.tokenType);
    const expiresAt = this.trimString(record.expiresAt);

    if (!accessToken && !refreshToken) {
      throw new VoltOpsActionError(
        "credential must include credentialId, accessToken, or refreshToken for Gmail actions",
        400,
      );
    }

    if (refreshToken && (!clientId || !clientSecret) && !accessToken) {
      throw new VoltOpsActionError(
        "refreshToken requires clientId and clientSecret (or provide an accessToken) for Gmail actions",
        400,
      );
    }

    const payload: Record<string, unknown> = {};
    if (accessToken) {
      payload.accessToken = accessToken;
    }
    if (refreshToken) {
      payload.refreshToken = refreshToken;
    }
    if (clientId) {
      payload.clientId = clientId;
    }
    if (clientSecret) {
      payload.clientSecret = clientSecret;
    }
    if (tokenType) {
      payload.tokenType = tokenType;
    }
    if (expiresAt) {
      payload.expiresAt = expiresAt;
    }
    if (metadata) {
      payload.metadata = metadata;
    }

    return payload as VoltOpsGmailCredential;
  }

  private ensureGoogleCalendarCredential(
    value: VoltOpsGoogleCalendarCredential | null | undefined,
  ): VoltOpsGoogleCalendarCredential {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new VoltOpsActionError("credential must be an object", 400);
    }

    const record = value as Record<string, unknown>;
    const metadata = this.normalizeCredentialMetadata(record.metadata);
    const storedId = this.trimString(
      typeof (record as any).credentialId === "string"
        ? ((record as any).credentialId as string)
        : typeof (record as any).id === "string"
          ? ((record as any).id as string)
          : undefined,
    );
    if (storedId) {
      return metadata ? { credentialId: storedId, metadata } : { credentialId: storedId };
    }

    const accessToken = this.trimString(record.accessToken ?? (record as any).token);
    const refreshToken = this.trimString(record.refreshToken);
    const clientId = this.trimString(record.clientId);
    const clientSecret = this.trimString(record.clientSecret);
    if (!accessToken && (!refreshToken || !clientId || !clientSecret)) {
      throw new VoltOpsActionError(
        "credential must include credentialId, accessToken, or refreshToken + clientId + clientSecret for Google Calendar actions",
        400,
      );
    }

    const tokenType = this.trimString(record.tokenType);
    const expiresAt = this.trimString(record.expiresAt);

    const payload: VoltOpsGoogleCalendarCredential = {};
    if (accessToken) payload.accessToken = accessToken;
    if (refreshToken) payload.refreshToken = refreshToken;
    if (clientId) payload.clientId = clientId;
    if (clientSecret) payload.clientSecret = clientSecret;
    if (tokenType) payload.tokenType = tokenType;
    if (expiresAt) payload.expiresAt = expiresAt;
    if (metadata) {
      payload.metadata = metadata;
    }

    return payload;
  }

  private ensureGoogleDriveCredential(
    value: VoltOpsGoogleDriveCredential | null | undefined,
  ): VoltOpsGoogleDriveCredential {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new VoltOpsActionError("credential must be an object", 400);
    }

    const record = value as Record<string, unknown>;
    const metadata = this.normalizeCredentialMetadata(record.metadata);
    const storedId = this.trimString(
      typeof (record as any).credentialId === "string"
        ? ((record as any).credentialId as string)
        : typeof (record as any).id === "string"
          ? ((record as any).id as string)
          : undefined,
    );
    if (storedId) {
      return metadata ? { credentialId: storedId, metadata } : { credentialId: storedId };
    }

    const accessToken = this.trimString(record.accessToken ?? (record as any).token);
    const refreshToken = this.trimString(record.refreshToken);
    const clientId = this.trimString(record.clientId);
    const clientSecret = this.trimString(record.clientSecret);
    if (!accessToken && (!refreshToken || !clientId || !clientSecret)) {
      throw new VoltOpsActionError(
        "credential must include credentialId, accessToken, or refreshToken + clientId + clientSecret for Google Drive actions",
        400,
      );
    }

    const tokenType = this.trimString(record.tokenType);
    const expiresAt = this.trimString(record.expiresAt);

    const payload: VoltOpsGoogleDriveCredential = {};
    if (accessToken) payload.accessToken = accessToken;
    if (refreshToken) payload.refreshToken = refreshToken;
    if (clientId) payload.clientId = clientId;
    if (clientSecret) payload.clientSecret = clientSecret;
    if (tokenType) payload.tokenType = tokenType;
    if (expiresAt) payload.expiresAt = expiresAt;
    if (metadata) {
      payload.metadata = metadata;
    }

    return payload;
  }

  private ensurePostgresCredential(
    value: VoltOpsPostgresCredential | null | undefined,
  ): VoltOpsPostgresCredential {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new VoltOpsActionError("credential must be an object", 400);
    }

    const record = value as Record<string, unknown>;
    const metadata = this.normalizeCredentialMetadata(record.metadata);
    const storedId = this.trimString(
      typeof (record as any).credentialId === "string"
        ? ((record as any).credentialId as string)
        : typeof (record as any).id === "string"
          ? ((record as any).id as string)
          : undefined,
    );
    if (storedId) {
      return metadata ? { credentialId: storedId, metadata } : { credentialId: storedId };
    }

    const host = this.trimString(record.host);
    const user = this.trimString(record.user);
    const password = this.trimString(record.password);
    const database = this.trimString(record.database);
    if (!host || !user || !password || !database) {
      throw new VoltOpsActionError(
        "credential must include host, user, password, and database for Postgres actions",
        400,
      );
    }

    const port =
      typeof record.port === "number" && Number.isFinite(record.port)
        ? Math.trunc(record.port)
        : undefined;
    const ssl = typeof record.ssl === "boolean" ? record.ssl : undefined;
    const rejectUnauthorized =
      typeof (record as any).rejectUnauthorized === "boolean"
        ? (record as any).rejectUnauthorized
        : undefined;

    const payload: Record<string, unknown> = {
      host,
      user,
      password,
      database,
    };
    if (port !== undefined) {
      payload.port = port;
    }
    if (ssl !== undefined) {
      payload.ssl = ssl;
    }
    if (rejectUnauthorized !== undefined) {
      payload.rejectUnauthorized = rejectUnauthorized;
    }
    if (metadata) {
      payload.metadata = metadata;
    }

    return payload as VoltOpsPostgresCredential;
  }

  private normalizeCredentialMetadata(metadata: unknown): Record<string, unknown> | undefined {
    if (metadata === undefined || metadata === null) {
      return undefined;
    }
    if (typeof metadata !== "object" || Array.isArray(metadata)) {
      throw new VoltOpsActionError("credential.metadata must be an object", 400);
    }
    return metadata as Record<string, unknown>;
  }

  private normalizeIdentifier(value: unknown, field: string): string {
    const trimmed = this.trimString(value);
    if (!trimmed) {
      throw new VoltOpsActionError(`${field} must be provided`, 400);
    }
    return trimmed;
  }

  private ensureRecord(value: unknown, field: string): Record<string, unknown> {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new VoltOpsActionError(`${field} must be an object`, 400);
    }
    return value as Record<string, unknown>;
  }

  private sanitizeStringArray(value: unknown): string[] | undefined {
    if (value === undefined || value === null) {
      return undefined;
    }
    if (!Array.isArray(value)) {
      throw new VoltOpsActionError("fields must be an array", 400);
    }
    const entries = value
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
    return entries.length > 0 ? entries : undefined;
  }

  private normalizeStringArray(value: unknown): string[] | null {
    if (!Array.isArray(value)) {
      return null;
    }
    const entries = value
      .map((item) => this.trimString(item))
      .filter((item): item is string => Boolean(item));
    return entries.length > 0 ? entries : null;
  }

  private sanitizeSortArray(
    value: unknown,
  ): Array<{ field: string; direction?: "asc" | "desc" }> | undefined {
    if (value === undefined || value === null) {
      return undefined;
    }
    if (!Array.isArray(value)) {
      throw new VoltOpsActionError("sort must be an array", 400);
    }
    const entries: Array<{ field: string; direction?: "asc" | "desc" }> = [];
    for (const candidate of value) {
      if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
        continue;
      }
      const record = candidate as Record<string, unknown>;
      const fieldValue = this.trimString(record.field);
      if (!fieldValue) {
        continue;
      }
      const directionValue = this.trimString(record.direction);
      let normalizedDirection: "asc" | "desc" | undefined;
      if (directionValue) {
        const lower = directionValue.toLowerCase();
        if (lower === "asc" || lower === "desc") {
          normalizedDirection = lower;
        }
      }
      entries.push({
        field: fieldValue,
        direction: normalizedDirection,
      });
    }
    return entries.length > 0 ? entries : undefined;
  }

  private normalizePositiveInteger(
    value: unknown,
    field: string,
    options?: { allowZero?: boolean },
  ): number | undefined {
    if (value === undefined || value === null) {
      return undefined;
    }
    if (typeof value !== "number" || !Number.isFinite(value)) {
      throw new VoltOpsActionError(`${field} must be a finite number`, 400);
    }
    const normalized = Math.floor(value);
    const allowZero = options?.allowZero ?? false;
    if (normalized < 0 || (!allowZero && normalized === 0)) {
      throw new VoltOpsActionError(`${field} must be greater than ${allowZero ? "-1" : "0"}`, 400);
    }
    return normalized;
  }

  private trimString(value: unknown): string | null {
    if (typeof value !== "string") {
      return null;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  private normalizeEmailList(
    value: unknown,
    field: string,
    options?: { optional?: boolean },
  ): string[] | undefined {
    if (value === undefined || value === null) {
      if (options?.optional) {
        return undefined;
      }
      throw new VoltOpsActionError(`${field} must be provided`, 400);
    }

    const entries: string[] = [];
    if (Array.isArray(value)) {
      for (const item of value) {
        const normalized = this.trimString(item);
        if (normalized) {
          entries.push(normalized);
        }
      }
    } else if (typeof value === "string") {
      const parts = value.split(",").map((part) => part.trim());
      parts.forEach((part) => {
        if (part.length > 0) {
          entries.push(part);
        }
      });
    } else {
      throw new VoltOpsActionError(`${field} must be a string or string[]`, 400);
    }

    if (entries.length === 0) {
      if (options?.optional) {
        return undefined;
      }
      throw new VoltOpsActionError(`${field} must include at least one email`, 400);
    }

    return entries;
  }

  private normalizeCalendarDateTime(
    value: unknown,
    field: string,
    options?: { optional?: boolean },
  ): { dateTime: string; timeZone?: string | null } | null {
    if (value === undefined || value === null) {
      if (options?.optional) {
        return null;
      }
      throw new VoltOpsActionError(`${field} must be provided`, 400);
    }
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new VoltOpsActionError(`${field} must be an object`, 400);
    }
    const record = value as Record<string, unknown>;
    const dateTime = this.trimString(record.dateTime ?? (record as any).date_time);
    if (!dateTime) {
      if (options?.optional) {
        return null;
      }
      throw new VoltOpsActionError(`${field}.dateTime must be provided`, 400);
    }
    const timeZone = this.trimString(record.timeZone ?? (record as any).time_zone);
    return {
      dateTime,
      timeZone: timeZone ?? undefined,
    };
  }

  private normalizeCalendarAttendees(
    value: unknown,
  ): Array<{ email: string; optional?: boolean; comment?: string }> | undefined {
    if (!Array.isArray(value)) {
      return undefined;
    }
    const attendees: Array<{ email: string; optional?: boolean; comment?: string }> = [];
    for (const candidate of value) {
      if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
        continue;
      }
      const email = this.trimString((candidate as Record<string, unknown>).email);
      if (!email) {
        continue;
      }
      const optionalRaw = (candidate as Record<string, unknown>).optional;
      const optional = typeof optionalRaw === "boolean" ? optionalRaw : undefined;
      const comment = this.trimString((candidate as Record<string, unknown>).comment);
      const attendee: { email: string; optional?: boolean; comment?: string } = { email };
      if (optional !== undefined) {
        attendee.optional = optional;
      }
      if (comment) {
        attendee.comment = comment;
      }
      attendees.push(attendee);
    }
    return attendees.length ? attendees : undefined;
  }

  private normalizeGmailBodyType(value: unknown): "text" | "html" {
    const normalized = this.trimString(value);
    return normalized === "html" ? "html" : "text";
  }

  private normalizeGmailFormat(
    value: unknown,
  ): "full" | "minimal" | "raw" | "metadata" | undefined {
    const normalized = this.trimString(value);
    if (!normalized) {
      return undefined;
    }
    const allowed = ["full", "minimal", "raw", "metadata"];
    if (allowed.includes(normalized)) {
      return normalized as "full" | "minimal" | "raw" | "metadata";
    }
    throw new VoltOpsActionError(
      "format must be one of full, minimal, raw, or metadata for Gmail actions",
      400,
    );
  }

  private normalizeGmailAttachments(
    attachments: unknown,
  ): Array<Record<string, unknown>> | undefined {
    if (attachments === undefined || attachments === null) {
      return undefined;
    }
    if (!Array.isArray(attachments)) {
      throw new VoltOpsActionError("attachments must be an array", 400);
    }

    const entries: Array<Record<string, unknown>> = [];
    for (const attachment of attachments) {
      if (!attachment || typeof attachment !== "object" || Array.isArray(attachment)) {
        throw new VoltOpsActionError("each attachment must be an object", 400);
      }
      const record = attachment as Record<string, unknown>;
      const filename =
        this.trimString(
          record.filename ?? (record as any).name ?? (record as any).file?.filename,
        ) ?? undefined;
      const content =
        this.trimString(record.content ?? (record as any).base64 ?? (record as any).data) ??
        undefined;
      if (!content) {
        throw new VoltOpsActionError("attachment.content must be provided (base64 string)", 400);
      }
      const contentType =
        this.trimString(record.contentType ?? (record as any).mimeType) ?? undefined;

      const sanitized: Record<string, unknown> = {
        content,
      };
      if (filename) {
        sanitized.filename = filename;
      }
      if (contentType) {
        sanitized.contentType = contentType;
      }
      entries.push(sanitized);
    }

    return entries.length > 0 ? entries : undefined;
  }

  private buildGmailSendInput(
    params: VoltOpsGmailSendEmailParams,
    options: { requireThreadAnchor: boolean },
  ): Record<string, unknown> {
    const rawParams = params as unknown as Record<string, unknown>;
    const toList = this.normalizeEmailList(params.to, "to");
    const ccList = this.normalizeEmailList(params.cc, "cc", { optional: true });
    const bccList = this.normalizeEmailList(params.bcc, "bcc", { optional: true });
    const replyToList = this.normalizeEmailList(params.replyTo ?? rawParams.reply_to, "replyTo", {
      optional: true,
    });

    const subject = this.trimString(params.subject);
    if (!subject) {
      throw new VoltOpsActionError("subject must be provided for Gmail actions", 400);
    }

    const bodyType = this.normalizeGmailBodyType(params.bodyType ?? rawParams.body_type);
    const htmlBody =
      bodyType === "html"
        ? this.trimString(
            rawParams.html ?? params.body ?? params.htmlBody ?? rawParams.html_body ?? undefined,
          )
        : this.trimString(params.htmlBody ?? rawParams.html_body ?? undefined);
    const textBody =
      bodyType === "text"
        ? this.trimString(
            rawParams.text ?? params.body ?? params.textBody ?? rawParams.text_body ?? undefined,
          )
        : this.trimString(params.textBody ?? rawParams.text_body ?? undefined);

    if (!htmlBody && !textBody) {
      throw new VoltOpsActionError("body or htmlBody must be provided for Gmail actions", 400);
    }

    const threadId = this.trimString(params.threadId ?? rawParams.thread_id);
    const inReplyTo = this.trimString(params.inReplyTo ?? rawParams.in_reply_to);

    if (options.requireThreadAnchor && !threadId && !inReplyTo) {
      throw new VoltOpsActionError(
        "threadId or inReplyTo must be provided for Gmail reply action",
        400,
      );
    }

    const attachments = this.normalizeGmailAttachments(params.attachments);

    const input: Record<string, unknown> = {
      to: toList,
      subject,
      bodyType,
    };

    if (ccList?.length) {
      input.cc = ccList;
    }
    if (bccList?.length) {
      input.bcc = bccList;
    }
    if (replyToList?.length) {
      input.replyTo = replyToList;
    }
    if (params.from) {
      const from = this.trimString(params.from);
      if (from) {
        input.from = from;
      }
    }
    if (params.senderName) {
      const senderName = this.trimString(params.senderName);
      if (senderName) {
        input.senderName = senderName;
      }
    }
    if (inReplyTo) {
      input.inReplyTo = inReplyTo;
    }
    if (threadId) {
      input.threadId = threadId;
    }
    if (attachments) {
      input.attachments = attachments;
    }
    if (bodyType === "html") {
      if (htmlBody) {
        input.htmlBody = htmlBody;
      }
      if (textBody) {
        input.textBody = textBody;
      }
    } else {
      if (textBody) {
        input.textBody = textBody;
      }
      if (htmlBody) {
        input.htmlBody = htmlBody;
      }
    }

    const primaryBody = bodyType === "html" ? (htmlBody ?? textBody) : (textBody ?? htmlBody);
    if (primaryBody) {
      input.body = primaryBody;
    }

    if (typeof params.draft === "boolean") {
      input.draft = params.draft;
    }

    return input;
  }

  private async executeGmailAction(options: {
    actionId: string;
    credential: VoltOpsGmailCredential;
    catalogId?: string;
    projectId?: string | null;
    input?: Record<string, unknown>;
  }): Promise<VoltOpsActionExecutionResult> {
    const payload: Record<string, unknown> = {
      credential: options.credential,
      catalogId: options.catalogId ?? undefined,
      actionId: options.actionId,
      projectId: options.projectId ?? undefined,
      payload: {
        input: options.input ?? {},
      },
    };

    const response = await this.postActionExecution(this.actionExecutionPath, payload);
    return this.mapActionExecution(response);
  }

  private async postActionExecution(
    path: string,
    body: Record<string, unknown>,
  ): Promise<ActionExecutionResponse> {
    let response: Response;
    try {
      response = await this.transport.sendRequest(path, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: safeStringify(body),
      });
    } catch (error) {
      if (error instanceof VoltOpsActionError) {
        throw error;
      }
      const message = error instanceof Error ? error.message : "Unknown network error";
      throw new VoltOpsActionError(message, 0, error);
    }

    const contentType =
      typeof response.headers?.get === "function"
        ? (response.headers.get("content-type") ?? "")
        : "";
    const canParseJson = typeof response.json === "function";
    const isJson = contentType.includes("application/json") || (!contentType && canParseJson);
    let data: unknown;
    if (isJson && canParseJson) {
      try {
        data = await response.json();
      } catch {
        data = undefined;
      }
    }

    if (!response.ok) {
      const baseMessage = `VoltOps action request failed with status ${response.status}`;
      const detailedMessage = this.extractErrorMessage(data);
      throw new VoltOpsActionError(
        detailedMessage ? `${baseMessage}: ${detailedMessage}` : baseMessage,
        response.status,
        data,
      );
    }

    const payload = this.unwrapActionResponse(data);
    return payload ?? {};
  }

  private unwrapActionResponse(data: unknown): ActionExecutionResponse | undefined {
    if (!data || typeof data !== "object") {
      return undefined;
    }
    const record = data as Record<string, unknown>;
    const inner =
      record.data && typeof record.data === "object"
        ? (record.data as Record<string, unknown>)
        : null;
    if (inner) {
      return inner as ActionExecutionResponse;
    }
    return record as ActionExecutionResponse;
  }

  private mapActionExecution(payload: ActionExecutionResponse): VoltOpsActionExecutionResult {
    return {
      actionId: this.normalizeString(payload.actionId) ?? "unknown",
      provider: this.normalizeString(payload.provider) ?? "unknown",
      requestPayload: this.normalizeRecord(payload.requestPayload ?? payload.request_payload) ?? {},
      responsePayload: payload.responsePayload ?? payload.response_payload ?? null,
      metadata: this.normalizeRecord(payload.metadata ?? payload.metadata_json),
    } satisfies VoltOpsActionExecutionResult;
  }

  private normalizeString(value: unknown): string | null {
    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }
    return null;
  }

  private normalizeRecord(value: unknown): Record<string, unknown> | null {
    if (value === null || value === undefined) {
      return null;
    }

    if (Array.isArray(value)) {
      return { items: value };
    }

    if (typeof value === "object") {
      return value as Record<string, unknown>;
    }

    return { value };
  }

  private extractErrorMessage(payload: unknown): string | null {
    if (!payload || typeof payload !== "object") {
      return null;
    }

    const record = payload as Record<string, unknown>;

    const directMessage = this.normalizeString(record.message);
    if (directMessage) {
      return directMessage;
    }

    const nestedError = record.error;
    if (nestedError && typeof nestedError === "object" && !Array.isArray(nestedError)) {
      const nestedRecord = nestedError as Record<string, unknown>;
      const nestedMessage = this.normalizeString(nestedRecord.message);
      const nestedType = this.normalizeString(nestedRecord.type);
      if (nestedMessage && nestedType) {
        return `${nestedType}: ${nestedMessage}`;
      }
      if (nestedMessage) {
        return nestedMessage;
      }
    }

    const errors = record.errors;
    if (Array.isArray(errors)) {
      const messages = errors
        .map((item) => (typeof item === "string" ? item.trim() : undefined))
        .filter((value): value is string => Boolean(value));
      if (messages.length > 0) {
        return messages.join("; ");
      }
    } else if (errors && typeof errors === "object") {
      const messages: string[] = [];
      for (const [key, value] of Object.entries(errors as Record<string, unknown>)) {
        if (Array.isArray(value)) {
          const joined = value
            .map((item) => (typeof item === "string" ? item.trim() : undefined))
            .filter((text): text is string => Boolean(text))
            .join(", ");
          if (joined.length > 0) {
            messages.push(`${key}: ${joined}`);
          }
        } else if (typeof value === "string" && value.trim().length > 0) {
          messages.push(`${key}: ${value.trim()}`);
        }
      }
      if (messages.length > 0) {
        return messages.join("; ");
      }
    }

    return null;
  }
}
