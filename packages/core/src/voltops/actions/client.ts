import { safeStringify } from "@voltagent/internal";
import type {
  VoltOpsActionExecutionResult,
  VoltOpsAirtableCreateRecordParams,
  VoltOpsAirtableDeleteRecordParams,
  VoltOpsAirtableGetRecordParams,
  VoltOpsAirtableListRecordsParams,
  VoltOpsAirtableUpdateRecordParams,
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
  credentialId: string;
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

    const credentialId = this.normalizeIdentifier(params.credentialId, "credentialId");
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
      credentialId,
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

    const credentialId = this.normalizeIdentifier(params.credentialId, "credentialId");
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
      credentialId,
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

    const credentialId = this.normalizeIdentifier(params.credentialId, "credentialId");
    const baseId = this.normalizeIdentifier(params.baseId, "baseId");
    const tableId = this.normalizeIdentifier(params.tableId, "tableId");
    const recordId = this.normalizeIdentifier(params.recordId, "recordId");

    const input: Record<string, unknown> = {
      recordId,
    };

    return this.executeAirtableAction({
      actionId: params.actionId ?? "airtable.deleteRecord",
      credentialId,
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

    const credentialId = this.normalizeIdentifier(params.credentialId, "credentialId");
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
      credentialId,
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

    const credentialId = this.normalizeIdentifier(params.credentialId, "credentialId");
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
      credentialId,
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
      credentialId: options.credentialId,
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

    const credentialId = this.normalizeIdentifier(params.credentialId, "credentialId");
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
      credentialId,
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

    const credentialId = this.normalizeIdentifier(params.credentialId, "credentialId");
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
      credentialId,
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

    const credentialId = this.normalizeIdentifier(params.credentialId, "credentialId");
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
      credentialId,
      catalogId: params.catalogId,
      projectId: params.projectId,
      config: null,
      input,
    });
  }

  private async executeSlackAction(options: {
    actionId: string;
    credentialId: string;
    catalogId?: string;
    projectId?: string | null;
    config?: Record<string, unknown> | null;
    input?: Record<string, unknown>;
  }): Promise<VoltOpsActionExecutionResult> {
    const payload: Record<string, unknown> = {
      credentialId: options.credentialId,
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
