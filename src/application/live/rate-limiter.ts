/**
 * A token bucket: `ratePerSecond` messages a second on average, with bursts up to `burst`
 * (SDD 12, rule 7).
 */
export interface RateLimiter {
  /** True if one more message is allowed now. */
  take(): boolean;
}

export function createRateLimiter({
  ratePerSecond,
  burst,
  now,
}: {
  ratePerSecond: number;
  burst: number;
  now: () => number;
}): RateLimiter {
  let tokens = burst;
  let refilledAt = now();
  return {
    take() {
      const at = now();
      tokens = Math.min(burst, tokens + ((at - refilledAt) / 1_000) * ratePerSecond);
      refilledAt = at;
      if (tokens < 1) return false;
      tokens -= 1;
      return true;
    },
  };
}
