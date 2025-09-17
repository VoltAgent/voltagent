/**
 * Generates a test table prefix with timestamp to avoid conflicts
 */
export function generateTestTablePrefix(): string {
  return `test_voltagent_memory_${Date.now()}_${Math.random().toString(36).substring(7)}`;
}
