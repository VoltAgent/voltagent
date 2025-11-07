import { describe, expect, it, vi } from "vitest";
import { VoltOpsActionError, VoltOpsActionsClient } from "./client";

function createResponse(
  body: Record<string, unknown>,
  status = 200,
  headers: Record<string, string> = { "content-type": "application/json" },
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers,
  });
}

describe("VoltOpsActionsClient", () => {
  it("should execute Airtable createRecord", async () => {
    const executionPayload = {
      actionId: "airtable.createRecord",
      provider: "airtable",
      requestPayload: {
        fields: { Name: "Jane" },
      },
      responsePayload: {
        id: "rec_123",
      },
      metadata: {
        baseId: "base",
        tableId: "table",
      },
    } satisfies Record<string, unknown>;

    const sendRequest = vi.fn().mockResolvedValue(createResponse(executionPayload));
    const client = new VoltOpsActionsClient({ sendRequest });

    const result = await client.airtable.createRecord({
      credentialId: "cred-123",
      baseId: "base",
      tableId: "table",
      fields: { Name: "Jane" },
      typecast: true,
      returnFieldsByFieldId: false,
    });

    expect(sendRequest).toHaveBeenCalledTimes(1);
    const [path, init] = sendRequest.mock.calls[0] as [string, RequestInit];
    expect(path).toBe("/actions/execute");
    expect(init?.method).toBe("POST");
    expect(init?.headers).toMatchObject({ "Content-Type": "application/json" });

    const parsedBody = init?.body ? JSON.parse(init.body as string) : null;
    expect(parsedBody).toMatchObject({
      credentialId: "cred-123",
      actionId: "airtable.createRecord",
      config: {
        airtable: {
          baseId: "base",
          tableId: "table",
          typecast: true,
          returnFieldsByFieldId: false,
        },
      },
      payload: {
        input: {
          baseId: "base",
          tableId: "table",
          fields: { Name: "Jane" },
          typecast: true,
          returnFieldsByFieldId: false,
        },
      },
    });

    expect(result).toMatchObject({
      actionId: "airtable.createRecord",
      provider: "airtable",
      responsePayload: { id: "rec_123" },
      metadata: { baseId: "base", tableId: "table" },
    });
  });

  it("should execute Airtable updateRecord", async () => {
    const executionPayload = {
      actionId: "airtable.updateRecord",
      provider: "airtable",
      requestPayload: {
        recordId: "rec_123",
        fields: { Status: "Complete" },
      },
      responsePayload: {
        id: "rec_123",
        fields: { Status: "Complete" },
      },
    } satisfies Record<string, unknown>;

    const sendRequest = vi.fn().mockResolvedValue(createResponse(executionPayload));
    const client = new VoltOpsActionsClient({ sendRequest });

    await client.airtable.updateRecord({
      credentialId: "cred-123",
      baseId: "base",
      tableId: "table",
      recordId: "rec_123",
      fields: { Status: "Complete" },
      typecast: true,
      returnFieldsByFieldId: true,
    });

    expect(sendRequest).toHaveBeenCalledTimes(1);
    const [, init] = sendRequest.mock.calls[0] as [string, RequestInit];
    const parsedBody = init?.body ? JSON.parse(init.body as string) : null;
    expect(parsedBody).toMatchObject({
      actionId: "airtable.updateRecord",
      config: {
        airtable: {
          baseId: "base",
          tableId: "table",
          typecast: true,
          returnFieldsByFieldId: true,
        },
      },
      payload: {
        input: {
          recordId: "rec_123",
          fields: { Status: "Complete" },
          typecast: true,
          returnFieldsByFieldId: true,
        },
      },
    });
  });

  it("should execute Airtable deleteRecord", async () => {
    const executionPayload = {
      actionId: "airtable.deleteRecord",
      provider: "airtable",
      requestPayload: {
        recordId: "rec_123",
      },
      responsePayload: {
        deleted: true,
      },
    } satisfies Record<string, unknown>;

    const sendRequest = vi.fn().mockResolvedValue(createResponse(executionPayload));
    const client = new VoltOpsActionsClient({ sendRequest });

    await client.airtable.deleteRecord({
      credentialId: "cred-123",
      baseId: "base",
      tableId: "table",
      recordId: "rec_123",
    });

    const [, init] = sendRequest.mock.calls[0] as [string, RequestInit];
    const parsedBody = init?.body ? JSON.parse(init.body as string) : null;
    expect(parsedBody).toMatchObject({
      actionId: "airtable.deleteRecord",
      payload: {
        input: {
          recordId: "rec_123",
          baseId: "base",
          tableId: "table",
        },
      },
    });
  });

  it("should execute Airtable getRecord", async () => {
    const executionPayload = {
      actionId: "airtable.getRecord",
      provider: "airtable",
      responsePayload: {
        id: "rec_123",
        fields: {
          Name: "Ada Lovelace",
        },
      },
    } satisfies Record<string, unknown>;

    const sendRequest = vi.fn().mockResolvedValue(createResponse(executionPayload));
    const client = new VoltOpsActionsClient({ sendRequest });

    await client.airtable.getRecord({
      credentialId: "cred-123",
      baseId: "base",
      tableId: "table",
      recordId: "rec_123",
      returnFieldsByFieldId: true,
    });

    const [, init] = sendRequest.mock.calls[0] as [string, RequestInit];
    const parsedBody = init?.body ? JSON.parse(init.body as string) : null;
    expect(parsedBody).toMatchObject({
      actionId: "airtable.getRecord",
      payload: {
        input: {
          recordId: "rec_123",
          returnFieldsByFieldId: true,
        },
      },
      config: {
        airtable: {
          returnFieldsByFieldId: true,
        },
      },
    });
  });

  it("should execute Airtable listRecords", async () => {
    const executionPayload = {
      actionId: "airtable.listRecords",
      provider: "airtable",
      responsePayload: {
        records: [],
      },
    } satisfies Record<string, unknown>;

    const sendRequest = vi.fn().mockResolvedValue(createResponse(executionPayload));
    const client = new VoltOpsActionsClient({ sendRequest });

    await client.airtable.listRecords({
      credentialId: "cred-123",
      baseId: "base",
      tableId: "table",
      view: "Grid view",
      filterByFormula: "FIND('Ada', {Name})",
      maxRecords: 10,
      pageSize: 5,
      offset: "itrNext",
      fields: ["Name", "Status", ""],
      sort: [
        { field: "Created", direction: "DESC" },
        { field: "", direction: "ignored" },
      ],
      returnFieldsByFieldId: true,
    });

    const [, init] = sendRequest.mock.calls[0] as [string, RequestInit];
    const parsedBody = init?.body ? JSON.parse(init.body as string) : null;
    expect(parsedBody).toMatchObject({
      actionId: "airtable.listRecords",
      payload: {
        input: {
          view: "Grid view",
          filterByFormula: "FIND('Ada', {Name})",
          maxRecords: 10,
          pageSize: 5,
          offset: "itrNext",
          fields: ["Name", "Status"],
          sort: [{ field: "Created", direction: "desc" }],
          returnFieldsByFieldId: true,
        },
      },
      config: {
        airtable: {
          baseId: "base",
          tableId: "table",
          returnFieldsByFieldId: true,
        },
      },
    });
  });

  it("should throw VoltOpsActionError when params missing", async () => {
    const sendRequest = vi.fn();
    const client = new VoltOpsActionsClient({ sendRequest });

    await expect(
      client.airtable.createRecord({
        credentialId: "",
        baseId: "base",
        tableId: "table",
        fields: {},
      }),
    ).rejects.toBeInstanceOf(VoltOpsActionError);
  });

  it("should throw VoltOpsActionError when recordId missing for update", async () => {
    const sendRequest = vi.fn();
    const client = new VoltOpsActionsClient({ sendRequest });

    await expect(
      client.airtable.updateRecord({
        credentialId: "cred-123",
        baseId: "base",
        tableId: "table",
        recordId: "",
      }),
    ).rejects.toBeInstanceOf(VoltOpsActionError);
  });
});
