export type NormalizedCommand = {
  command: string;
  args?: string[];
};

const tokenizeCommandLine = (value: string): string[] | null => {
  const tokens: string[] = [];
  let current = "";
  let quote: "'" | '"' | null = null;
  let escapeNext = false;

  const pushCurrent = () => {
    if (current.length > 0) {
      tokens.push(current);
      current = "";
    }
  };

  for (const char of value) {
    if (escapeNext) {
      current += char;
      escapeNext = false;
      continue;
    }

    if (quote === null) {
      if (char === "\\") {
        escapeNext = true;
        continue;
      }

      if (char === "'" || char === '"') {
        quote = char;
        continue;
      }

      if (/\s/.test(char)) {
        pushCurrent();
        continue;
      }

      current += char;
      continue;
    }

    if (quote === "'") {
      if (char === "'") {
        quote = null;
      } else {
        current += char;
      }
      continue;
    }

    if (char === '"') {
      quote = null;
      continue;
    }

    if (char === "\\") {
      escapeNext = true;
      continue;
    }

    current += char;
  }

  if (escapeNext) {
    current += "\\";
  }

  if (quote !== null) {
    return null;
  }

  pushCurrent();
  return tokens.length > 0 ? tokens : null;
};

export const normalizeCommandAndArgs = (command: string, args?: string[]): NormalizedCommand => {
  const trimmedCommand = command.trim();
  const normalizedArgs = args && args.length > 0 ? args : undefined;

  if (!trimmedCommand) {
    return { command: trimmedCommand, args: normalizedArgs };
  }

  if (!/\s/.test(trimmedCommand)) {
    return { command: trimmedCommand, args: normalizedArgs };
  }

  const parsed = tokenizeCommandLine(trimmedCommand);
  if (!parsed || parsed.length === 0) {
    return { command: trimmedCommand, args: normalizedArgs };
  }

  const [normalizedCommand, ...parsedArgs] = parsed;
  const mergedArgs = [...parsedArgs, ...(normalizedArgs ?? [])];

  return {
    command: normalizedCommand,
    args: mergedArgs.length > 0 ? mergedArgs : undefined,
  };
};
