/**
 * Builds an array of line start offsets for a given text, handling \n, \r\n, and \r.
 * Returns 0-based offsets.
 */
export function buildLineMap(text: string): number[] {
  const starts: number[] = [0];
  for (let i = 0; i < text.length; i++) {
    const ch = text[i] ?? "";
    if (ch === "\r") {
      if (text[i + 1] === "\n") {
        i += 1;
      }
      starts.push(i + 1);
    } else if (ch === "\n") {
      starts.push(i + 1);
    }
  }
  return starts;
}

export type LineCol = { line: number; column: number };

export function offsetToLineCol(offset: number, lineMap: number[]): LineCol {
  // binary search for greatest line start <= offset
  let low = 0;
  let high = lineMap.length - 1;
  while (low <= high) {
    const mid = (low + high) >> 1;
    const start = lineMap[mid] ?? 0;
    const next = lineMap[mid + 1] ?? Number.MAX_SAFE_INTEGER;
    if (offset < start) {
      high = mid - 1;
    } else if (offset >= next) {
      low = mid + 1;
    } else {
      return { line: mid + 1, column: offset - start + 1 };
    }
  }
  return {
    line: lineMap.length,
    column: Math.max(1, offset - (lineMap[lineMap.length - 1] ?? 0) + 1),
  };
}

export function positionForRange(
  start: number,
  end: number,
  lineMap: number[],
): { position: { start: LineCol; end: LineCol } } {
  return {
    position: {
      start: offsetToLineCol(start, lineMap),
      end: offsetToLineCol(end, lineMap),
    },
  };
}
