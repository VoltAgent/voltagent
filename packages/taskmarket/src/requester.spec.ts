import { createHash } from "node:crypto";
import { safeStringify } from "@voltagent/internal";
import { describe, expect, it } from "vitest";
import { TaskmarketRequester, parseUsdcBaseUnits } from "./requester";
import {
  BASE_CHAIN_ID,
  BASE_USDC_CONTRACT,
  type CliRunResult,
  type TaskmarketCliRunner,
  type TaskmarketTaskPreviewInput,
} from "./types";

const REQUESTER = "0x1111111111111111111111111111111111111111";
const TASK_ID = `0x${"a".repeat(64)}`;
const SUBMISSION_ID = "11111111-1111-4111-8111-111111111111";
const ARTIFACT_ID = "22222222-2222-4222-8222-222222222222";
const LEGAL_DIGEST = `sha256:${"b".repeat(64)}`;

function result(stdout: string, overrides: Partial<CliRunResult> = {}): CliRunResult {
  return {
    stdout,
    stderr: "",
    exitCode: 0,
    timedOut: false,
    outputLimitExceeded: false,
    ...overrides,
  };
}

function success(data: unknown, idempotencyKey?: string): CliRunResult {
  return result(safeStringify({ ok: true, data, ...(idempotencyKey ? { idempotencyKey } : {}) }));
}

class FakeRunner implements TaskmarketCliRunner {
  readonly calls: string[][] = [];
  readonly responses: CliRunResult[];

  constructor(responses: CliRunResult[]) {
    this.responses = [...responses];
  }

  async run(args: readonly string[]): Promise<CliRunResult> {
    this.calls.push([...args]);
    const response = this.responses.shift();
    if (!response) throw new Error(`Unexpected CLI call: ${args.join(" ")}`);
    return response;
  }
}

function input(overrides: Partial<TaskmarketTaskPreviewInput> = {}): TaskmarketTaskPreviewInput {
  return {
    description: "Analyze the supplied dataset.",
    rewardUsdc: "5.000000",
    maximumSpendUsdc: "5",
    durationHours: 24,
    deliverables: ["report.md with evidence", "results.json"],
    tags: ["research", "data"],
    submissionVisibility: "winner_only",
    ...overrides,
  };
}

function taskData(overrides: Record<string, unknown> = {}) {
  return {
    id: TASK_ID,
    referenceCode: "TSK-TEST",
    requester: REQUESTER,
    description:
      "Analyze the supplied dataset.\n\n## Deliverables\n1. report.md with evidence\n2. results.json",
    reward: "5000000",
    escrowTxHash: `0x${"c".repeat(64)}`,
    expiryTime: "2026-08-24T00:00:00.000Z",
    status: "open",
    phase: "active",
    mode: "bounty",
    taskVisibility: "public",
    submissionVisibility: "winner_only",
    tags: ["research", "data"],
    submissionWindowOpen: true,
    submissionCount: 0,
    awardCount: 0,
    ...overrides,
  };
}

function successfulCreateRunner(options: { accepted?: boolean; bundleDigest?: string } = {}) {
  return new FakeRunner([
    result("1.11.0\n"),
    success({
      address: REQUESTER,
      network: "Base",
      chainId: BASE_CHAIN_ID,
      currency: "USDC",
      usdcContract: BASE_USDC_CONTRACT,
    }),
    success({ address: REQUESTER }),
    success({ address: REQUESTER, balanceBaseUnits: "10000000", balanceUsdc: "10" }),
    success({
      accepted: options.accepted ?? true,
      bundleDigest: options.bundleDigest ?? LEGAL_DIGEST,
    }),
    success({ taskId: TASK_ID }, "33333333-3333-4333-8333-333333333333"),
    success(taskData()),
  ]);
}

function requester(
  runner: TaskmarketCliRunner,
  overrides: Partial<ConstructorParameters<typeof TaskmarketRequester>[0]> = {},
) {
  return new TaskmarketRequester({
    requesterAddress: REQUESTER,
    maximumSpendUsdc: "10",
    cliRunner: runner,
    now: () => new Date("2026-08-23T00:00:00.000Z"),
    ...overrides,
  });
}

describe("parseUsdcBaseUnits", () => {
  it("parses decimal strings without floating point", () => {
    expect(parseUsdcBaseUnits("0.000001")).toBe(1n);
    expect(parseUsdcBaseUnits("12.34")).toBe(12_340_000n);
  });

  it("rejects exponents, signs, and excess precision", () => {
    for (const value of ["1e2", "-1", "+1", "1.0000001"]) {
      expect(() => parseUsdcBaseUnits(value)).toThrow();
    }
  });
});

describe("TaskmarketRequester previews", () => {
  it("creates an immutable exact plan without calling the CLI", () => {
    const runner = new FakeRunner([]);
    const client = requester(runner);
    const preview = client.previewTask(input());

    expect(runner.calls).toEqual([]);
    expect(preview.rewardUsdc).toBe("5");
    expect(preview.network).toEqual({
      name: "Base",
      chainId: BASE_CHAIN_ID,
      asset: "USDC",
      contract: BASE_USDC_CONTRACT,
    });
    expect(preview.exactDescription).toContain("## Deliverables\n1. report.md with evidence");
    expect(preview.authorizationStatement).toContain("Maximum spend: 5 USDC");
    expect(preview.authorizationStatement).toContain(preview.planDigest);
    expect(preview.commandArguments).toEqual([
      "task",
      "create",
      "--description",
      preview.exactDescription,
      "--reward",
      "5",
      "--duration",
      "24",
      "--mode",
      "bounty",
      "--task-visibility",
      "public",
      "--submission-visibility",
      "winner_only",
      "--tags",
      "research,data",
    ]);
  });

  it("binds the digest to every economically relevant field", () => {
    const client = requester(new FakeRunner([]));
    const original = client.previewTask(input());
    const changedReward = client.previewTask(input({ rewardUsdc: "4" }));
    const changedDeliverable = client.previewTask(input({ deliverables: ["different.txt"] }));
    expect(changedReward.planDigest).not.toBe(original.planDigest);
    expect(changedDeliverable.planDigest).not.toBe(original.planDigest);
  });

  it("deduplicates tags while retaining their order", () => {
    const client = requester(new FakeRunner([]));
    expect(client.previewTask(input({ tags: ["research", "data", "research"] })).tags).toEqual([
      "research",
      "data",
    ]);
  });

  it("rejects zero rewards and both spend-cap violations", () => {
    const client = requester(new FakeRunner([]));
    expect(() => client.previewTask(input({ rewardUsdc: "0" }))).toThrow("greater than zero");
    expect(() => client.previewTask(input({ rewardUsdc: "6" }))).toThrow("shown to the user");
    expect(() => client.previewTask(input({ maximumSpendUsdc: "11" }))).toThrow("host-side");
  });

  it("rejects hidden control characters", () => {
    const client = requester(new FakeRunner([]));
    expect(() => client.previewTask(input({ description: "bad\u0000text" }))).toThrow();
  });

  it("bounds pending preview state and prunes expired previews", () => {
    let now = new Date("2026-08-23T00:00:00.000Z");
    const client = requester(new FakeRunner([]), {
      now: () => now,
      previewTtlMs: 30_000,
      maxPendingPreviews: 1,
    });
    client.previewTask(input());
    expect(() => client.previewTask(input())).toThrow("Too many pending previews");
    now = new Date("2026-08-23T00:01:00.000Z");
    expect(client.previewTask(input())).toHaveProperty("previewId");
  });
});

describe("TaskmarketRequester creation", () => {
  it("runs exact preflight checks, creates once, and verifies live state", async () => {
    const runner = successfulCreateRunner();
    const client = requester(runner);
    const preview = client.previewTask(input());
    const created = await client.createTask({
      previewId: preview.previewId,
      planDigest: preview.planDigest,
      authorizationStatement: preview.authorizationStatement,
    });

    expect(created).toMatchObject({
      status: "created",
      retryAllowed: false,
      taskId: TASK_ID,
      taskUrl: `https://taskmarket.dev/tasks/${TASK_ID}`,
      liveStatus: "open",
      idempotencyKey: "33333333-3333-4333-8333-333333333333",
    });
    expect(runner.calls).toEqual([
      ["--version"],
      ["deposit"],
      ["address"],
      ["wallet", "balance"],
      ["legal", "status"],
      preview.commandArguments,
      ["task", "get", TASK_ID],
    ]);
  });

  it("supports an exact externally accepted draft digest", async () => {
    const runner = successfulCreateRunner({ accepted: false, bundleDigest: LEGAL_DIGEST });
    const client = requester(runner, { acceptedLegalBundleDigest: LEGAL_DIGEST });
    const preview = client.previewTask(input());
    await expect(
      client.createTask({
        previewId: preview.previewId,
        planDigest: preview.planDigest,
        authorizationStatement: preview.authorizationStatement,
      }),
    ).resolves.toMatchObject({ status: "created" });
  });

  it("fails closed on a changed or unaccepted legal bundle", async () => {
    const runner = successfulCreateRunner({ accepted: false, bundleDigest: LEGAL_DIGEST });
    const client = requester(runner, { acceptedLegalBundleDigest: `sha256:${"d".repeat(64)}` });
    const preview = client.previewTask(input());
    await expect(
      client.createTask({
        previewId: preview.previewId,
        planDigest: preview.planDigest,
        authorizationStatement: preview.authorizationStatement,
      }),
    ).rejects.toThrow("legal bundle");
    expect(runner.calls).toHaveLength(5);
  });

  it("rejects mutated, expired, and reused previews before any payment", async () => {
    const runner = successfulCreateRunner();
    let now = new Date("2026-08-23T00:00:00.000Z");
    const client = requester(runner, { now: () => now, previewTtlMs: 30_000 });
    const preview = client.previewTask(input());
    await expect(
      client.createTask({
        previewId: preview.previewId,
        planDigest: preview.planDigest,
        authorizationStatement: `${preview.authorizationStatement} changed`,
      }),
    ).rejects.toThrow("does not exactly match");
    expect(runner.calls).toEqual([]);

    now = new Date("2026-08-23T00:01:00.000Z");
    await expect(
      client.createTask({
        previewId: preview.previewId,
        planDigest: preview.planDigest,
        authorizationStatement: preview.authorizationStatement,
      }),
    ).rejects.toThrow("expired");
    await expect(
      client.createTask({
        previewId: preview.previewId,
        planDigest: preview.planDigest,
        authorizationStatement: preview.authorizationStatement,
      }),
    ).rejects.toThrow("single-use");
    expect(runner.calls).toEqual([]);
  });

  it("returns an unknown non-retryable result after an ambiguous write", async () => {
    const runner = successfulCreateRunner();
    runner.responses.splice(
      5,
      runner.responses.length - 5,
      result("", { exitCode: null, timedOut: true }),
    );
    const client = requester(runner);
    const preview = client.previewTask(input());
    const created = await client.createTask({
      previewId: preview.previewId,
      planDigest: preview.planDigest,
      authorizationStatement: preview.authorizationStatement,
    });
    expect(created).toMatchObject({ status: "unknown", retryAllowed: false });
    expect(created).toHaveProperty("recovery");
    await expect(
      client.createTask({
        previewId: preview.previewId,
        planDigest: preview.planDigest,
        authorizationStatement: preview.authorizationStatement,
      }),
    ).rejects.toThrow("single-use");
    expect(runner.calls).toHaveLength(6);
  });

  it("preserves bounded recovery handles from a pending CLI failure", async () => {
    const runner = successfulCreateRunner();
    runner.responses.splice(
      5,
      runner.responses.length - 5,
      result("", {
        stderr: safeStringify({
          ok: false,
          error: "api_token=should-not-leak write still confirming",
          pending: true,
          idempotencyKey: "44444444-4444-4444-8444-444444444444",
        }),
        exitCode: 1,
      }),
    );
    const client = requester(runner);
    const preview = client.previewTask(input());
    const outcome = await client.createTask({
      previewId: preview.previewId,
      planDigest: preview.planDigest,
      authorizationStatement: preview.authorizationStatement,
    });
    expect(outcome).toMatchObject({
      status: "unknown",
      retryAllowed: false,
      pending: true,
      idempotencyKey: "44444444-4444-4444-8444-444444444444",
    });
    if (outcome.status !== "unknown") throw new Error("Expected unknown settlement status");
    expect(outcome.reason).not.toContain("should-not-leak");
  });

  it.each([
    ["old CLI", [result("1.10.9\n")], "newer is required"],
    [
      "wrong network",
      [
        result("1.11.0\n"),
        success({
          address: REQUESTER,
          network: "Ethereum",
          chainId: 1,
          currency: "USDC",
          usdcContract: BASE_USDC_CONTRACT,
        }),
      ],
      "Base USDC",
    ],
    [
      "wrong wallet",
      [
        result("1.11.0\n"),
        success({
          address: REQUESTER,
          network: "Base",
          chainId: BASE_CHAIN_ID,
          currency: "USDC",
          usdcContract: BASE_USDC_CONTRACT,
        }),
        success({ address: `0x${"2".repeat(40)}` }),
      ],
      "does not match",
    ],
    [
      "insufficient balance",
      [
        result("1.11.0\n"),
        success({
          address: REQUESTER,
          network: "Base",
          chainId: BASE_CHAIN_ID,
          currency: "USDC",
          usdcContract: BASE_USDC_CONTRACT,
        }),
        success({ address: REQUESTER }),
        success({ address: REQUESTER, balanceBaseUnits: "4999999" }),
      ],
      "insufficient USDC",
    ],
  ])("blocks %s before creation", async (_label, responses, message) => {
    const runner = new FakeRunner(responses as CliRunResult[]);
    const client = requester(runner);
    const preview = client.previewTask(input());
    await expect(
      client.createTask({
        previewId: preview.previewId,
        planDigest: preview.planDigest,
        authorizationStatement: preview.authorizationStatement,
      }),
    ).rejects.toThrow(message as string);
    expect(runner.calls.some((call) => call[0] === "task" && call[1] === "create")).toBe(false);
  });

  it("does not claim success when live economics differ", async () => {
    const runner = successfulCreateRunner();
    runner.responses[6] = success(taskData({ reward: "4999999" }));
    const client = requester(runner);
    const preview = client.previewTask(input());
    await expect(
      client.createTask({
        previewId: preview.previewId,
        planDigest: preview.planDigest,
        authorizationStatement: preview.authorizationStatement,
      }),
    ).resolves.toMatchObject({ status: "unknown", retryAllowed: false });
  });
});

describe("TaskmarketRequester review tools", () => {
  it("returns bounded live status only for the configured requester", async () => {
    const good = requester(new FakeRunner([success(taskData())]));
    await expect(good.getTask(TASK_ID)).resolves.toMatchObject({
      taskId: TASK_ID,
      status: "open",
      rewardBaseUnits: "5000000",
    });

    const other = requester(
      new FakeRunner([success(taskData({ requester: `0x${"2".repeat(40)}` }))]),
    );
    await expect(other.getTask(TASK_ID)).rejects.toThrow("does not belong");
  });

  it("lists sanitized submission metadata without decision operations", async () => {
    const runner = new FakeRunner([
      success(taskData({ submissionCount: 1 })),
      success([
        {
          id: SUBMISSION_ID,
          workerAddress: `0x${"3".repeat(40)}`,
          submittedAt: "2026-08-23T00:00:00.000Z",
          rejectedAt: null,
          deliverableHash: `0x${"4".repeat(64)}`,
          submitTxHash: `0x${"5".repeat(64)}`,
          secretField: "must-not-leak",
          artifacts: [
            {
              id: ARTIFACT_ID,
              role: "final",
              fileName: "report.md",
              mimeType: "text/markdown",
              sizeBytes: 12,
              sha256Hash: "a".repeat(64),
              storageUri: "private-location",
            },
          ],
        },
      ]),
    ]);
    const listing = await requester(runner).listSubmissions(TASK_ID);
    expect(listing.reviewOnly).toBe(true);
    expect(listing).toMatchObject({ returnedCount: 1, availableCount: 1, truncated: false });
    expect(listing.submissions).toHaveLength(1);
    expect(listing.submissions[0]).not.toHaveProperty("secretField");
    expect(listing.submissions[0].artifacts[0]).not.toHaveProperty("storageUri");
  });

  it("retrieves and hash-verifies one bounded text artifact", async () => {
    const content = "# Candidate\nEvidence only.\n";
    const hash = createHash("sha256").update(content, "utf8").digest("hex");
    const submission = {
      id: SUBMISSION_ID,
      workerAddress: `0x${"3".repeat(40)}`,
      submittedAt: "2026-08-23T00:00:00.000Z",
      rejectedAt: null,
      deliverableHash: `0x${"4".repeat(64)}`,
      submitTxHash: `0x${"5".repeat(64)}`,
      artifacts: [
        {
          id: ARTIFACT_ID,
          role: "final",
          fileName: "report.md",
          mimeType: "text/markdown",
          sizeBytes: Buffer.byteLength(content),
          sha256Hash: hash,
        },
      ],
    };
    const runner = new FakeRunner([success(taskData()), success([submission]), result(content)]);
    const reviewed = await requester(runner).reviewSubmissionArtifact({
      taskId: TASK_ID,
      submissionId: SUBMISSION_ID,
      artifactId: ARTIFACT_ID,
    });
    expect(reviewed).toMatchObject({
      untrusted: true,
      reviewOnly: true,
      content,
      sha256Hash: hash,
    });
    expect(runner.calls.at(-1)).toEqual([
      "task",
      "download",
      TASK_ID,
      "--submission",
      SUBMISSION_ID,
      "--artifact",
      ARTIFACT_ID,
    ]);
  });

  it("rejects unsupported and hash-mismatched artifacts", async () => {
    const baseSubmission = {
      id: SUBMISSION_ID,
      workerAddress: `0x${"3".repeat(40)}`,
      submittedAt: "2026-08-23T00:00:00.000Z",
      rejectedAt: null,
      deliverableHash: `0x${"4".repeat(64)}`,
      submitTxHash: `0x${"5".repeat(64)}`,
    };
    const binaryRunner = new FakeRunner([
      success(taskData()),
      success([
        {
          ...baseSubmission,
          artifacts: [
            {
              id: ARTIFACT_ID,
              role: "final",
              fileName: "result.zip",
              mimeType: "application/zip",
              sizeBytes: 10,
              sha256Hash: "a".repeat(64),
            },
          ],
        },
      ]),
    ]);
    await expect(
      requester(binaryRunner).reviewSubmissionArtifact({
        taskId: TASK_ID,
        submissionId: SUBMISSION_ID,
        artifactId: ARTIFACT_ID,
      }),
    ).rejects.toThrow("Only text");

    const badHashRunner = new FakeRunner([
      success(taskData()),
      success([
        {
          ...baseSubmission,
          artifacts: [
            {
              id: ARTIFACT_ID,
              role: "final",
              fileName: "result.txt",
              mimeType: "text/plain",
              sizeBytes: 10,
              sha256Hash: "a".repeat(64),
            },
          ],
        },
      ]),
      result("different"),
    ]);
    await expect(
      requester(badHashRunner).reviewSubmissionArtifact({
        taskId: TASK_ID,
        submissionId: SUBMISSION_ID,
        artifactId: ARTIFACT_ID,
      }),
    ).rejects.toThrow("hash does not match");
  });
});
