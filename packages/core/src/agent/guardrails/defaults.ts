import { createInputGuardrail, createOutputGuardrail } from "../guardrail";
import type { VoltAgentTextStreamPart } from "../subagent/types";
import type { GuardrailSeverity, InputGuardrail, OutputGuardrail } from "../types";

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

type InputGuardrailBaseOptions = BaseGuardrailOptions & {
  message?: string;
};

type ProfanityInputGuardrailOptions = InputGuardrailBaseOptions & {
  bannedWords?: string[];
  replacement?: string;
  mode?: "mask" | "block";
};

type PIIInputGuardrailOptions = InputGuardrailBaseOptions & {
  replacement?: string;
  maskEmails?: boolean;
  maskPhones?: boolean;
};

type PromptInjectionGuardrailOptions = InputGuardrailBaseOptions & {
  phrases?: string[];
};

type InputLengthGuardrailOptions = InputGuardrailBaseOptions & {
  maxCharacters: number;
  mode?: MaxLengthGuardrailMode;
};

type HTMLSanitizerGuardrailOptions = InputGuardrailBaseOptions & {
  allowBasicFormatting?: boolean;
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

  return createOutputGuardrail({
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
  });
}

/**
 * Creates a guardrail that redacts email addresses.
 */
export function createEmailRedactorGuardrail(
  options: EmailGuardrailOptions = {},
): OutputGuardrail<string> {
  const replacement = options.replacement ?? DEFAULT_EMAIL_REPLACEMENT;
  const holdWindow = 128;

  return createOutputGuardrail({
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
  });
}

/**
 * Creates a guardrail that redacts common phone number patterns.
 */
export function createPhoneNumberGuardrail(
  options: PhoneGuardrailOptions = {},
): OutputGuardrail<string> {
  const replacement = options.replacement ?? DEFAULT_PHONE_REPLACEMENT;
  const holdWindow = 32;

  return createOutputGuardrail({
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
  });
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

  return createOutputGuardrail({
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
  });
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

  return createOutputGuardrail({
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
  });
}

// ---------------------------------------------------------------------------
// Input guardrail helpers
// ---------------------------------------------------------------------------

export function createProfanityInputGuardrail(
  options: ProfanityInputGuardrailOptions = {},
): InputGuardrail {
  const bannedWords =
    options.bannedWords && options.bannedWords.length > 0
      ? options.bannedWords
      : DEFAULT_PROFANITY_WORDS;
  const mode = options.mode ?? "mask";
  const replacement = options.replacement ?? "[censored]";
  const message =
    options.message ?? "Please avoid offensive language and try phrasing your request differently.";

  const escaped = bannedWords.map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const profanityRegex =
    escaped.length > 0 ? new RegExp(`\\b(${escaped.join("|")})\\b`, "gi") : null;

  return createInputGuardrail({
    id: options.id ?? "input-profanity-guardrail",
    name: options.name ?? "Input Profanity Guardrail",
    description:
      options.description ?? "Stops offensive or abusive language before it reaches the model.",
    severity: options.severity ?? "warning",
    handler: async ({ input, inputText }) => {
      if (!profanityRegex || !inputText) {
        return { pass: true };
      }

      const containsProfanity = profanityRegex.test(inputText);
      profanityRegex.lastIndex = 0;

      if (!containsProfanity) {
        return { pass: true };
      }

      if (mode === "block") {
        return {
          pass: false,
          action: "block",
          message,
        };
      }

      if (typeof input === "string") {
        const sanitized = input.replace(profanityRegex, replacement);
        profanityRegex.lastIndex = 0;
        return {
          pass: true,
          action: "modify",
          modifiedInput: sanitized,
          message,
        };
      }

      return {
        pass: false,
        action: "block",
        message,
      };
    },
  });
}

export function createPIIInputGuardrail(options: PIIInputGuardrailOptions = {}): InputGuardrail {
  const replacement = options.replacement ?? "[redacted]";
  const maskEmails = options.maskEmails ?? true;
  const maskPhones = options.maskPhones ?? true;
  const message =
    options.message ??
    "Sensitive personal information was detected. Please remove it and try again.";

  return createInputGuardrail({
    id: options.id ?? "input-pii-guardrail",
    name: options.name ?? "Input PII Guardrail",
    description:
      options.description ??
      "Detects personal identifiers in user input and removes them before execution.",
    severity: options.severity ?? "critical",
    handler: async ({ input, inputText }) => {
      if (!inputText) {
        return { pass: true };
      }

      const emailRegex = maskEmails ? EMAIL_REGEX : null;
      const phoneRegex = maskPhones ? PHONE_REGEX : null;
      const numberRegex = /\b\d{4,}\b/g;

      const detected =
        emailRegex?.test(inputText) || phoneRegex?.test(inputText) || numberRegex.test(inputText);

      if (!detected) {
        if (emailRegex) emailRegex.lastIndex = 0;
        if (phoneRegex) phoneRegex.lastIndex = 0;
        numberRegex.lastIndex = 0;
        return { pass: true };
      }

      const sanitize = (value: string): string => {
        let next = value;
        if (emailRegex) {
          next = next.replace(emailRegex, replacement);
          emailRegex.lastIndex = 0;
        }
        if (phoneRegex) {
          next = next.replace(phoneRegex, replacement);
          phoneRegex.lastIndex = 0;
        }
        next = next.replace(numberRegex, replacement);
        numberRegex.lastIndex = 0;
        return next;
      };

      if (typeof input === "string") {
        return {
          pass: true,
          action: "modify",
          modifiedInput: sanitize(input),
          message,
        };
      }

      return {
        pass: false,
        action: "block",
        message,
      };
    },
  });
}

export function createPromptInjectionGuardrail(
  options: PromptInjectionGuardrailOptions = {},
): InputGuardrail {
  const phrases =
    options.phrases && options.phrases.length > 0
      ? options.phrases
      : [
          "ignore previous instructions",
          "system prompt:",
          "forget all your rules",
          "act as system",
          "override safety",
        ];

  const message =
    options.message ??
    "The request contains instructions that attempt to override the assistant's safety policies.";

  const normalizedPhrases = phrases.map((phrase) => phrase.toLowerCase());

  return createInputGuardrail({
    id: options.id ?? "input-injection-guardrail",
    name: options.name ?? "Prompt Injection Guardrail",
    description:
      options.description ??
      "Detects common prompt-injection attempts and blocks them before they reach the model.",
    severity: options.severity ?? "warning",
    handler: async ({ inputText }) => {
      if (!inputText) {
        return { pass: true };
      }
      const lowered = inputText.toLowerCase();
      const flagged = normalizedPhrases.some((phrase) => lowered.includes(phrase));
      if (!flagged) {
        return { pass: true };
      }

      return {
        pass: false,
        action: "block",
        message,
      };
    },
  });
}

export function createInputLengthGuardrail(options: InputLengthGuardrailOptions): InputGuardrail {
  const { maxCharacters } = options;
  if (!maxCharacters || maxCharacters <= 0) {
    throw new Error("maxCharacters must be a positive integer");
  }
  const mode = options.mode ?? "block";
  const message =
    options.message ??
    `Input exceeds the maximum length of ${maxCharacters} characters. Please shorten your request.`;

  return createInputGuardrail({
    id: options.id ?? "input-length-guardrail",
    name: options.name ?? "Input Length Guardrail",
    description:
      options.description ??
      "Enforces maximum input length before passing the prompt to the model.",
    severity: options.severity ?? "info",
    handler: async ({ input }) => {
      if (typeof input !== "string") {
        return { pass: true };
      }

      if (input.length <= maxCharacters) {
        return { pass: true };
      }

      if (mode === "truncate") {
        return {
          pass: true,
          action: "modify",
          modifiedInput: input.slice(0, maxCharacters),
          message,
        };
      }

      return {
        pass: false,
        action: "block",
        message,
      };
    },
  });
}

export function createHTMLSanitizerInputGuardrail(
  options: HTMLSanitizerGuardrailOptions = {},
): InputGuardrail {
  const allowFormatting = options.allowBasicFormatting ?? true;
  const message = options.message ?? "Markup was removed from your request to keep things safe.";

  const allowedTags = allowFormatting ? ["b", "strong", "i", "em", "u", "code"] : [];

  const stripMarkup = (raw: string): string => {
    const allowedPattern =
      allowedTags.length > 0
        ? new RegExp(`</?(${allowedTags.join("|")})(\\s+[^>]+)?>`, "gi")
        : null;

    let result = raw.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "");
    result = result.replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "");
    result = result.replace(/<!--[\s\S]*?-->/g, "");

    if (allowedPattern) {
      const placeholders: string[] = [];
      let placeholderIndex = 0;
      result = result.replace(allowedPattern, (match) => {
        placeholders.push(match);
        return `@@ALLOWED_TAG_${placeholderIndex++}@@`;
      });

      result = result.replace(/<[^>]+>/g, "");

      placeholders.forEach((tag, index) => {
        result = result.replace(`@@ALLOWED_TAG_${index}@@`, tag);
      });

      return result.trim();
    }

    return result.replace(/<[^>]+>/g, "").trim();
  };

  return createInputGuardrail({
    id: options.id ?? "input-html-guardrail",
    name: options.name ?? "Input HTML Sanitizer",
    description:
      options.description ??
      "Removes HTML and script tags from user input before the model sees it.",
    severity: options.severity ?? "warning",
    handler: async ({ input }) => {
      if (typeof input !== "string") {
        return { pass: true };
      }

      const sanitized = stripMarkup(input);
      if (sanitized === input) {
        return { pass: true };
      }

      return {
        pass: true,
        action: "modify",
        modifiedInput: sanitized,
        message,
      };
    },
  });
}

export function createDefaultInputSafetyGuardrails(): InputGuardrail[] {
  return [
    createProfanityInputGuardrail(),
    createPIIInputGuardrail(),
    createPromptInjectionGuardrail(),
    createHTMLSanitizerInputGuardrail(),
  ];
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
