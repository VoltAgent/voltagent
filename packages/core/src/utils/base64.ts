/**
 * Convert a Uint8Array to a base64 string in both Node.js and edge runtimes.
 */
export const bytesToBase64 = (bytes: Uint8Array): string => {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes).toString("base64");
  }

  if (typeof btoa === "function") {
    let binary = "";
    for (let i = 0; i < bytes.length; i += 1) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  const base64Chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
  let output = "";
  let i = 0;

  while (i < bytes.length) {
    const byte1 = bytes[i++] ?? 0;
    const byte2 = bytes[i++] ?? undefined;
    const byte3 = bytes[i++] ?? undefined;

    const enc1 = byte1 >> 2;
    const enc2 = ((byte1 & 0x03) << 4) | ((byte2 ?? 0) >> 4);
    const enc3 = (((byte2 ?? 0) & 0x0f) << 2) | ((byte3 ?? 0) >> 6);
    const enc4 = (byte3 ?? 0) & 0x3f;

    output += base64Chars.charAt(enc1);
    output += base64Chars.charAt(enc2);
    output += byte2 === undefined ? "=" : base64Chars.charAt(enc3);
    output += byte3 === undefined ? "=" : base64Chars.charAt(enc4);
  }

  return output;
};
