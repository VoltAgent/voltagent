import { LibSQLStorage } from "../memory/libsql";

/**
 * Generate a unique table prefix for tests to avoid conflicts
 * @param testName - Name of the test for better identification
 * @returns A unique table prefix
 */
export function generateTestTablePrefix(testName: string = ""): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const sanitized = testName.replace(/[^a-zA-Z0-9]/g, "_").substring(0, 20);
  return `test_${sanitized}_${timestamp}_${random}`;
}

/**
 * Create a LibSQLStorage instance with a unique table prefix for testing
 * @param testName - Name of the test for identification
 * @returns A new LibSQLStorage instance with unique tables
 */
export function createTestLibSQLStorage(testName: string = ""): LibSQLStorage {
  return new LibSQLStorage({
    url: ":memory:",
    tablePrefix: generateTestTablePrefix(testName),
  });
}
