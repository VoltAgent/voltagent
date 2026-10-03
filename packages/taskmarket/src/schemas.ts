import { z } from "zod";

const hasUnsupportedControlCharacter = (value: string): boolean =>
  [...value].some((character) => {
    const code = character.charCodeAt(0);
    return code <= 8 || code === 11 || code === 12 || (code >= 14 && code <= 31) || code === 127;
  });

const visibleText = (label: string, maximum: number) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required`)
    .max(maximum, `${label} is too long`)
    .refine((value) => !hasUnsupportedControlCharacter(value), {
      message: `${label} contains unsupported control characters`,
    });

const exactVisibleText = (label: string, maximum: number) =>
  z
    .string()
    .min(1, `${label} is required`)
    .max(maximum, `${label} is too long`)
    .refine((value) => !hasUnsupportedControlCharacter(value), {
      message: `${label} contains unsupported control characters`,
    });

export const usdcAmountSchema = z
  .string()
  .max(30)
  .regex(
    /^(?:0|[1-9]\d*)(?:\.\d{1,6})?$/u,
    "Use a non-negative USDC decimal with at most 6 places",
  );

export const taskIdSchema = z.string().regex(/^0x[a-fA-F0-9]{64}$/u, "Invalid Taskmarket task ID");
export const submissionIdSchema = z.string().uuid();
export const artifactIdSchema = z.string().uuid();
export const planDigestSchema = z.string().regex(/^sha256:[a-f0-9]{64}$/u, "Invalid plan digest");
export const previewIdSchema = z.string().regex(/^tm_[a-f0-9]{32}$/u, "Invalid preview ID");

export const taskPreviewInputSchema = z.object({
  description: visibleText("Description", 12000),
  rewardUsdc: usdcAmountSchema,
  maximumSpendUsdc: usdcAmountSchema,
  durationHours: z.number().int().min(1).max(2160),
  deliverables: z.array(visibleText("Deliverable", 1000)).min(1).max(20),
  tags: z
    .array(
      visibleText("Tag", 50).refine((value) => !value.includes(","), {
        message: "Tags cannot contain commas",
      }),
    )
    .max(10)
    .optional(),
  taskVisibility: z.enum(["public", "unlisted"]).optional(),
  submissionVisibility: z.enum(["public", "reveal_all", "winner_only", "never"]).optional(),
});

export const createTaskInputSchema = z.object({
  previewId: previewIdSchema,
  planDigest: planDigestSchema,
  authorizationStatement: exactVisibleText("Authorization statement", 30000),
});

export const taskStatusInputSchema = z.object({ taskId: taskIdSchema });

export const submissionListInputSchema = z.object({ taskId: taskIdSchema });

export const submissionReviewInputSchema = z.object({
  taskId: taskIdSchema,
  submissionId: submissionIdSchema,
  artifactId: artifactIdSchema,
});
