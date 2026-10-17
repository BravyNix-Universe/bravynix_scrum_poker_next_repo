const BASE62_ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

/** Encodes `value` as exactly `length` base62 characters (most significant first). */
export function toBase62(value: bigint, length: number): string {
  if (value < 0n) throw new RangeError("toBase62 needs a non-negative value");
  let remaining = value;
  let out = "";
  for (let i = 0; i < length; i += 1) {
    out = BASE62_ALPHABET.charAt(Number(remaining % 62n)) + out;
    remaining /= 62n;
  }
  return out;
}

export function bytesToBigInt(bytes: Uint8Array): bigint {
  let value = 0n;
  for (const byte of bytes) value = (value << 8n) | BigInt(byte);
  return value;
}

/** RFC 4648 base64url without padding, safe in URL fragments. */
export function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function fromBase64Url(value: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]*$/.test(value)) throw new SyntaxError("Invalid base64url string");
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
