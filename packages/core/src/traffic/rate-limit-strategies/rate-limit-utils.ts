export function parseResetDurationToMs(raw: string): number | undefined {
  const value = raw.trim();
  if (!value) return undefined;

  let totalMs = 0;
  const regex = /(\d+(?:\.\d+)?)(ms|s|m|h|d)/g;
  let matched = false;
  for (const match of value.matchAll(regex)) {
    matched = true;
    const amount = Number.parseFloat(match[1] ?? "");
    if (!Number.isFinite(amount)) continue;
    const unit = match[2];
    if (unit === "ms") totalMs += amount;
    else if (unit === "s") totalMs += amount * 1000;
    else if (unit === "m") totalMs += amount * 60_000;
    else if (unit === "h") totalMs += amount * 3_600_000;
    else if (unit === "d") totalMs += amount * 86_400_000;
  }

  if (matched) {
    return Math.round(totalMs);
  }

  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n) : undefined;
}
