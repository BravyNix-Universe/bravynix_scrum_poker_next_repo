/** The subset of the Web Storage API the app uses. Injected so stores can be tested in isolation. */
export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/**
 * Returns localStorage when it is usable. Private windows, blocked site data and some embedded
 * browsers throw on access, so callers must treat a null result as "nothing stored".
 */
export function getBrowserStorage(): KeyValueStorage | null {
  try {
    if (typeof window === "undefined") return null;
    const storage = window.localStorage;
    const probe = "bvx:probe";
    storage.setItem(probe, probe);
    storage.removeItem(probe);
    return storage;
  } catch {
    return null;
  }
}
