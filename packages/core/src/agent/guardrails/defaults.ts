import type { VoltAgentTextStreamPart } from "../subagent/types";
import type { GuardrailSeverity, OutputGuardrail } from "../types";

type BaseGuardrailOptions = {
  id?: string;
  name?: string;
  description?: string;
  severity?: GuardrailSeverity;
};

type SensitiveNumberGuardrailOptions = BaseGuardrailOptions & {
  /**
   * Minimum digit run length that will be redacted.
   * @default 4
   */
  minimumDigits?: number;
  /**
   * Replacement text used for redacted segments.
   * @default "[redacted]"
   */
  replacement?: string;
};

type EmailGuardrailOptions = BaseGuardrailOptions & {
  replacement?: string;
};

type PhoneGuardrailOptions = BaseGuardrailOptions & {
  replacement?: string;
};

type ProfanityGuardrailMode = "redact" | "block";

type ProfanityGuardrailOptions = BaseGuardrailOptions & {
  bannedWords?: string[];
  replacement?: string;
  mode?: ProfanityGuardrailMode;
};

type MaxLengthGuardrailMode = "truncate" | "block";

type MaxLengthGuardrailOptions = BaseGuardrailOptions & {
  maxCharacters: number;
  mode?: MaxLengthGuardrailMode;
};

const DEFAULT_NUMBER_REPLACEMENT = "[redacted]";
const DEFAULT_EMAIL_REPLACEMENT = "[redacted-email]";
const DEFAULT_PHONE_REPLACEMENT = "[redacted-phone]";
const DEFAULT_PROFANITY_REPLACEMENT = "[censored]";
const DEFAULT_PROFANITY_WORDS = [
  "shit",
  "fuck",
  "damn",
  "bitch",
  "asshole",
  "bastard",
  "dick",
  "piss",
  "cunt",
];

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const PHONE_REGEX = /(?<!\w)(?:\+?\d[\d\s\-()]{6,}\d)/g;

/**
 * Creates a guardrail that redacts long numeric sequences such as account or card numbers.
 */
export function createSensitiveNumberGuardrail(
  options: SensitiveNumberGuardrailOptions = {},
): OutputGuardrail<string> {
  const minimumDigits = options.minimumDigits ?? 4;
  const replacement = options.replacement ?? DEFAULT_NUMBER_REPLACEMENT;
  const digitPattern = new RegExp(`\\d{${minimumDigits},}`, "g");

  return {
    id: options.id ?? "sensitive-number-redactor",
    name: options.name ?? "Sensitive Number Redactor",
    description:
      options.description ??
      `Redacts long numeric sequences (${minimumDigits}+ digits) that may represent sensitive identifiers.`,
    severity: options.severity ?? "critical",
    handler: async ({ output }) => {
      if (typeof output !== "string") {
        return { pass: true };
      }

      const sanitized = output.replace(digitPattern, replacement);
      if (sanitized === output) {
        return { pass: true };
      }

      return {
        pass: true,
        action: "modify",
        modifiedOutput: sanitized as unknown as string,
        message: "Sensitive numeric identifiers were redacted.",
      };
    },
    streamHandler: ({ part, state }) => {
      if (part.type !== "text-delta") {
        return part;
      }

      const chunk = part.text ?? (part as { delta?: string }).delta ?? "";
      if (!chunk) {
        return part;
      }

      let guardState = state.sensitiveNumber as { pendingDigits: string } | undefined;
      if (!guardState) {
        guardState = { pendingDigits: "" };
        state.sensitiveNumber = guardState;
      }

      const combined = guardState.pendingDigits + chunk;
      const trailingDigitsMatch = combined.match(/\d+$/);
      const trailingDigits = trailingDigitsMatch ? trailingDigitsMatch[0] : "";

      const shouldHoldTrailingDigits =
        trailingDigits.length > 0 && trailingDigits.length < minimumDigits;
      const safeSegmentEndIndex = shouldHoldTrailingDigits
        ? combined.length - trailingDigits.length
        : combined.length;

      const safeSegment = combined.slice(0, safeSegmentEndIndex);
      guardState.pendingDigits = shouldHoldTrailingDigits ? trailingDigits : "";

      const sanitized = safeSegment.replace(digitPattern, replacement);

      const clone = { ...part } as { [key: string]: unknown };
      if ("text" in clone) {
        clone.text = undefined;
      }
      clone.delta = sanitized;
      return clone as VoltAgentTextStreamPart;
    },
  };
}

/**
 * Creates a guardrail that redacts email addresses.
 */
export function createEmailRedactorGuardrail(
  options: EmailGuardrailOptions = {},
): OutputGuardrail<string> {
  const replacement = options.replacement ?? DEFAULT_EMAIL_REPLACEMENT;
  const holdWindow = 128;

  return {
    id: options.id ?? "email-redactor",
    name: options.name ?? "Email Redactor",
    description: options.description ?? "Redacts email addresses from streaming output.",
    severity: options.severity ?? "warning",
    handler: async ({ output }) => {
      if (typeof output !== "string") {
        return { pass: true };
      }

      const sanitized = output.replace(EMAIL_REGEX, replacement);
      if (sanitized === output) {
        return { pass: true };
      }

      return {
        pass: true,
        action: "modify",
        modifiedOutput: sanitized as unknown as string,
        message: "Email addresses were redacted.",
      };
    },
    streamHandler: ({ part, state }) => {
      if (part.type !== "text-delta") {
        return part;
      }

      const chunk = part.text ?? (part as { delta?: string }).delta ?? "";
      if (!chunk) {
        return part;
      }

      let guardState = state.emailRedactor as { buffer: string } | undefined;
      if (!guardState) {
        guardState = { buffer: "" };
        state.emailRedactor = guardState;
      }

      const combined = guardState.buffer + chunk;
      const safeBoundary = combined.length <= holdWindow ? 0 : combined.length - holdWindow;

      const lastWhitespace = Math.max(
        combined.lastIndexOf(" ", combined.length - 1),
        combined.lastIndexOf("\n", combined.length - 1),
        combined.lastIndexOf("\t", combined.length - 1),
        combined.lastIndexOf("\r", combined.length - 1),
      );

      const safeSegmentEndIndex =
        lastWhitespace >= safeBoundary ? lastWhitespace + 1 : safeBoundary;

      const safeSegment = combined.slice(0, safeSegmentEndIndex);
      guardState.buffer = combined.slice(safeSegmentEndIndex);

      const sanitized = safeSegment.replace(EMAIL_REGEX, replacement);

      const clone = { ...part } as { [key: string]: unknown };
      if ("text" in clone) {
        clone.text = undefined;
      }
      clone.delta = sanitized;
      return clone as VoltAgentTextStreamPart;
    },
  };
}

/**
 * Creates a guardrail that redacts common phone number patterns.
 */
export function createPhoneNumberGuardrail(
  options: PhoneGuardrailOptions = {},
): OutputGuardrail<string> {
  const replacement = options.replacement ?? DEFAULT_PHONE_REPLACEMENT;
  const holdWindow = 32;

  return {
    id: options.id ?? "phone-number-redactor",
    name: options.name ?? "Phone Number Redactor",
    description: options.description ?? "Redacts phone numbers and contact strings.",
    severity: options.severity ?? "warning",
    handler: async ({ output }) => {
      if (typeof output !== "string") {
        return { pass: true };
      }

      const sanitized = output.replace(PHONE_REGEX, replacement);
      if (sanitized === output) {
        return { pass: true };
      }

      return {
        pass: true,
        action: "modify",
        modifiedOutput: sanitized as unknown as string,
        message: "Phone numbers were redacted.",
      };
    },
    streamHandler: ({ part, state }) => {
      if (part.type !== "text-delta") {
        return part;
      }

      const chunk = part.text ?? (part as { delta?: string }).delta ?? "";
      if (!chunk) {
        return part;
      }

      let guardState = state.phoneRedactor as { buffer: string } | undefined;
      if (!guardState) {
        guardState = { buffer: "" };
        state.phoneRedactor = guardState;
      }

      const combined = guardState.buffer + chunk;
      const boundary = combined.length <= holdWindow ? 0 : combined.length - holdWindow;

      const lastSeparator = Math.max(
        combined.lastIndexOf(" ", combined.length - 1),
        combined.lastIndexOf("\n", combined.length - 1),
        combined.lastIndexOf("\t", combined.length - 1),
        combined.lastIndexOf("-", combined.length - 1),
        combined.lastIndexOf(")", combined.length - 1),
      );

      const safeSegmentEndIndex = lastSeparator >= boundary ? lastSeparator + 1 : boundary;

      const safeSegment = combined.slice(0, safeSegmentEndIndex);
      guardState.buffer = combined.slice(safeSegmentEndIndex);

      const sanitized = safeSegment.replace(PHONE_REGEX, replacement);

      const clone = { ...part } as { [key: string]: unknown };
      if ("text" in clone) {
        clone.text = undefined;
      }
      clone.delta = sanitized;
      return clone as VoltAgentTextStreamPart;
    },
  };
}

/**
 * Creates a guardrail that detects profanity and either redacts or blocks output.
 */
export function createProfanityGuardrail(
  options: ProfanityGuardrailOptions = {},
): OutputGuardrail<string> {
  const bannedWords =
    options.bannedWords && options.bannedWords.length > 0
      ? options.bannedWords
      : DEFAULT_PROFANITY_WORDS;
  const replacement = options.replacement ?? DEFAULT_PROFANITY_REPLACEMENT;
  const mode: ProfanityGuardrailMode = options.mode ?? "redact";

  const escaped = bannedWords.map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const profanityRegex =
    escaped.length > 0 ? new RegExp(`\\b(${escaped.join("|")})\\b`, "gi") : null;

  const sanitize = (text: string): { sanitized: string; matched: boolean } => {
    if (!profanityRegex) {
      return { sanitized: text, matched: false };
    }
    let matched = false;
    const sanitized = text.replace(profanityRegex, () => {
      matched = true;
      return replacement;
    });
    return { sanitized, matched };
  };

  return {
    id: options.id ?? "profanity-guardrail",
    name: options.name ?? "Profanity Guardrail",
    description:
      options.description ?? "Detects banned words and either redacts or blocks the response.",
    severity: options.severity ?? "warning",
    handler: async ({ output }) => {
      if (typeof output !== "string") {
        return { pass: true };
      }

      const { sanitized, matched } = sanitize(output);
      if (!matched) {
        return { pass: true };
      }

      if (mode === "block") {
        return {
          pass: false,
          action: "block",
          message: "Output blocked due to profanity.",
        };
      }

      return {
        pass: true,
        action: "modify",
        modifiedOutput: sanitized as unknown as string,
        message: "Profanity redacted from output.",
      };
    },
    streamHandler: ({ part, abort }) => {
      if (part.type !== "text-delta") {
        return part;
      }

      const chunk = part.text ?? (part as { delta?: string }).delta ?? "";
      if (!chunk) {
        return part;
      }

      const { sanitized, matched } = sanitize(chunk);

      if (matched && mode === "block") {
        abort("Output blocked due to profanity.");
      }

      const clone = { ...part } as { [key: string]: unknown };
      if ("text" in clone) {
        clone.text = undefined;
      }
      clone.delta = sanitized;
      return clone as VoltAgentTextStreamPart;
    },
  };
}

/**
 * Guardrail that enforces a maximum character length.
 */
export function createMaxLengthGuardrail(
  options: MaxLengthGuardrailOptions,
): OutputGuardrail<string> {
  const { maxCharacters } = options;
  if (!maxCharacters || maxCharacters <= 0) {
    throw new Error("maxCharacters must be a positive integer");
  }

  const mode: MaxLengthGuardrailMode = options.mode ?? "truncate";

  return {
    id: options.id ?? "max-length-guardrail",
    name: options.name ?? "Max Length Guardrail",
    description:
      options.description ?? `Enforces a maximum response length of ${maxCharacters} characters.`,
    severity: options.severity ?? "warning",
    handler: async ({ output, originalOutput }) => {
      if (typeof originalOutput !== "string") {
        return { pass: true };
      }

      if (originalOutput.length <= maxCharacters) {
        return { pass: true };
      }

      if (mode === "block") {
        return {
          pass: false,
          action: "block",
          message: `Output blocked. Maximum length of ${maxCharacters} characters exceeded.`,
          metadata: {
            originalLength: originalOutput.length,
            maxCharacters,
          },
        };
      }

      const latestOutput =
        typeof output === "string" ? output : originalOutput.slice(0, maxCharacters);
      const sanitizedOutput =
        latestOutput.length <= maxCharacters ? latestOutput : latestOutput.slice(0, maxCharacters);

      return {
        pass: true,
        action: "modify",
        modifiedOutput: sanitizedOutput as unknown as string,
        message: `Output truncated to ${maxCharacters} characters.`,
        metadata: {
          originalLength: originalOutput.length,
          truncatedTo: sanitizedOutput.length,
        },
      };
    },
    streamHandler: ({ part, state, abort }) => {
      if (part.type !== "text-delta") {
        return part;
      }

      const chunk = part.text ?? (part as { delta?: string }).delta ?? "";
      if (!chunk) {
        return part;
      }

      let guardState = state.maxLength as { emitted: number; truncated: boolean } | undefined;
      if (!guardState) {
        guardState = { emitted: 0, truncated: false };
        state.maxLength = guardState;
      }

      if (guardState.emitted >= maxCharacters) {
        if (mode === "block") {
          abort(`Output blocked. Maximum length of ${maxCharacters} characters exceeded.`);
        }
        return null;
      }

      const remaining = maxCharacters - guardState.emitted;
      const emitText = chunk.length <= remaining ? chunk : chunk.slice(0, remaining);
      guardState.emitted += emitText.length;
      guardState.truncated = guardState.truncated || emitText.length !== chunk.length;

      if (chunk.length > remaining && mode === "block") {
        abort(`Output blocked. Maximum length of ${maxCharacters} characters exceeded.`);
      }

      const clone = { ...part } as { [key: string]: unknown };
      if ("text" in clone) {
        clone.text = undefined;
      }
      clone.delta = emitText;
      return clone as VoltAgentTextStreamPart;
    },
  };
}

/**
 * Convenience helper that returns a collection of common PII guardrails.
 */
export function createDefaultPIIGuardrails(options?: {
  sensitiveNumber?: SensitiveNumberGuardrailOptions;
  email?: EmailGuardrailOptions;
  phone?: PhoneGuardrailOptions;
}): OutputGuardrail<string>[] {
  return [
    createSensitiveNumberGuardrail(options?.sensitiveNumber),
    createEmailRedactorGuardrail(options?.email),
    createPhoneNumberGuardrail(options?.phone),
  ];
}

/**
 * Convenience helper that returns commonly recommended safety guardrails.
 */
export function createDefaultSafetyGuardrails(options?: {
  profanity?: ProfanityGuardrailOptions;
  maxLength?: MaxLengthGuardrailOptions;
}): OutputGuardrail<string>[] {
  const guardrails: OutputGuardrail<string>[] = [createProfanityGuardrail(options?.profanity)];

  if (options?.maxLength) {
    guardrails.push(createMaxLengthGuardrail(options.maxLength));
  }

  return guardrails;
}
