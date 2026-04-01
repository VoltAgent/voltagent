let nodeCounter = 0;

export function generateId(prefix: string): string {
  nodeCounter += 1;
  return `${prefix}-${Date.now()}-${nodeCounter}`;
}
