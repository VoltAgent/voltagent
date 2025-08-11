import { LibSQLStorage, type LibSQLStorageOptions } from "./index";

/**
 * Generates a test table prefix with timestamp to avoid conflicts
 */
export function generateTestTablePrefix(): string {
  return `test_voltagent_memory_${Date.now()}_${Math.random().toString(36).substring(7)}`;
}

/**
 * Creates a test LibSQL storage instance
 */
export async function createTestLibSQLStorage(
  options?: Partial<LibSQLStorageOptions>,
): Promise<LibSQLStorage> {
  const tablePrefix = generateTestTablePrefix();
  const storage = new LibSQLStorage({
    url: ":memory:",
    tablePrefix,
    ...options,
  });
  return storage;
}
