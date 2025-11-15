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

  private normalizePositiveInteger(value: unknown, field: string): number | undefined {
    if (value === undefined || value === null) {
      return undefined;
    }
    if (typeof value !== "number" || !Number.isFinite(value)) {
      throw new VoltOpsActionError(`${field} must be a finite number`, 400);
    }
    const normalized = Math.floor(value);
    if (normalized <= 0) {
      throw new VoltOpsActionError(`${field} must be greater than 0`, 400);
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
