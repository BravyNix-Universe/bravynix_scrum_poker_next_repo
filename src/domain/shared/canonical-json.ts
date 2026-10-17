/**
 * JSON with object keys sorted at every level, so the same value always produces the same text
 * on every device. Signatures are computed over this text (SDD 12). Properties set to
 * `undefined` are left out, as `JSON.stringify` does.
 */
export function canonicalJson(value: unknown): string {
  return JSON.stringify(sortKeys(value));
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value === null || typeof value !== "object") return value;
  const record = value as Record<string, unknown>;
  const sorted: Record<string, unknown> = {};
  for (const key of Object.keys(record).sort()) {
    if (record[key] !== undefined) sorted[key] = sortKeys(record[key]);
  }
  return sorted;
}
