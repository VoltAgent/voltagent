export const BASE_CHAIN_ID = 8453;
export const BASE_USDC_CONTRACT = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
export const TASKMARKET_API_ORIGIN = "https://api.taskmarket.dev";
export const TASKMARKET_WEB_ORIGIN = "https://taskmarket.dev";

export type CliRunResult = {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  timedOut: boolean;
  outputLimitExceeded: boolean;
};

export interface TaskmarketCliRunner {
  run(args: readonly string[]): Promise<CliRunResult>;
}

export type TaskmarketCliRunnerOptions = {
  binary?: string;
  timeoutMs?: number;
  maxOutputBytes?: number;
};

export type TaskmarketRequesterOptions = {
  /** Wallet address already held by the first-party Taskmarket CLI keystore. */
  requesterAddress: string;
  /** Hard host-side ceiling, expressed as a decimal USDC string. */
  maximumSpendUsdc: string;
  /**
   * Optional externally reviewed legal bundle digest. Use only when the CLI
   * reports the same draft digest but cannot issue a server acceptance receipt.
   */
  acceptedLegalBundleDigest?: string;
  cliPath?: string;
  cliRunner?: TaskmarketCliRunner;
  minimumCliVersion?: string;
  /** Preview lifetime from 30 seconds up to the fixed five-minute authorization ceiling. */
  previewTtlMs?: number;
  maxPendingPreviews?: number;
  maxSubmissionReviewBytes?: number;
  now?: () => Date;
};

export type TaskmarketTaskPreviewInput = {
  description: string;
  rewardUsdc: string;
  maximumSpendUsdc: string;
  durationHours: number;
  deliverables: string[];
  tags?: string[];
  taskVisibility?: "public" | "unlisted";
  submissionVisibility?: "public" | "reveal_all" | "winner_only" | "never";
};

export type TaskmarketTaskPreview = {
  schema: "voltagent.taskmarket-requester-preview.v1";
  previewId: string;
  planDigest: string;
  createdAt: string;
  expiresAt: string;
  authorizationRequired: true;
  authorizationStatement: string;
  network: {
    name: "Base";
    chainId: typeof BASE_CHAIN_ID;
    asset: "USDC";
    contract: typeof BASE_USDC_CONTRACT;
  };
  requesterAddress: string;
  exactDescription: string;
  rewardUsdc: string;
  maximumSpendUsdc: string;
  durationHours: number;
  deadlineRule: string;
  deliverables: string[];
  tags: string[];
  taskVisibility: "public" | "unlisted";
  submissionVisibility: "public" | "reveal_all" | "winner_only" | "never";
  commandArguments: string[];
};

export type TaskmarketCreateResult =
  | {
      status: "created";
      retryAllowed: false;
      taskId: string;
      taskUrl: string;
      referenceCode: string | null;
      transactionHash: string | null;
      idempotencyKey: string | null;
      liveStatus: "open";
      expiryTime: string;
      planDigest: string;
    }
  | {
      status: "unknown";
      retryAllowed: false;
      planDigest: string;
      idempotencyKey: string | null;
      pending: boolean | null;
      reason: string;
      recovery: string;
    };

export type TaskmarketTaskStatus = {
  taskId: string;
  taskUrl: string;
  referenceCode: string | null;
  status: string;
  phase: string | null;
  mode: string;
  taskVisibility: string;
  submissionVisibility: string;
  tags: string[];
  description: string;
  rewardBaseUnits: string;
  escrowTransactionHash: string | null;
  expiryTime: string;
  submissionWindowOpen: boolean;
  submissionCount: number;
  awardCount: number;
};

export type TaskmarketSubmissionSummary = {
  submissionId: string;
  workerAddress: string;
  submittedAt: string;
  rejectedAt: string | null;
  deliverableHash: string;
  submitTransactionHash: string | null;
  artifactCount: number;
  artifactsTruncated: boolean;
  artifacts: Array<{
    artifactId: string;
    role: string;
    fileName: string;
    mimeType: string;
    sizeBytes: number;
    sha256Hash: string;
  }>;
};
