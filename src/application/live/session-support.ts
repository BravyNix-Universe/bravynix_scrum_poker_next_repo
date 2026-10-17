/** Listeners for a session's state changes. */
export function createListeners() {
  const listeners = new Set<() => void>();
  return {
    subscribe(listener: () => void): () => void {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
    notify(): void {
      listeners.forEach((listener) => listener());
    },
    clear(): void {
      listeners.clear();
    },
  };
}

/** Timers a session owns, so closing it stops every one of them. */
export function createTimers() {
  const timeouts = new Set<ReturnType<typeof setTimeout>>();
  const intervals = new Set<ReturnType<typeof setInterval>>();
  return {
    /** Runs `task` once after `delayMs`. Returns a function that cancels it. */
    after(delayMs: number, task: () => void): () => void {
      const timeout = setTimeout(() => {
        timeouts.delete(timeout);
        task();
      }, delayMs);
      timeouts.add(timeout);
      return () => {
        clearTimeout(timeout);
        timeouts.delete(timeout);
      };
    },
    every(intervalMs: number, task: () => void): void {
      intervals.add(setInterval(task, intervalMs));
    },
    clear(): void {
      timeouts.forEach((timeout) => clearTimeout(timeout));
      intervals.forEach((interval) => clearInterval(interval));
      timeouts.clear();
      intervals.clear();
    },
  };
}

/** Longest delay a timer accepts (about 24.8 days); later deadlines are checked again then. */
export const MAX_TIMER_DELAY_MS = 2 ** 31 - 1;
