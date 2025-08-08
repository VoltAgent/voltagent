/**
 * Validates if the provided VoltOps keys have valid prefixes
 * @param publicKey The public key to validate
 * @param secretKey The secret key to validate
 * @returns true if both keys have valid prefixes, false otherwise
 */
export function isValidVoltOpsKeys(publicKey: string, secretKey: string): boolean {
  if (!publicKey || !secretKey) {
    return false;
  }

  return publicKey.startsWith("pk_") && secretKey.startsWith("sk_");
}
