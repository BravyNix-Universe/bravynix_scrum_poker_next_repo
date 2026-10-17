import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useThrottledValue } from "./use-throttled-value";

describe("useThrottledValue", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("passes the first change straight through, then folds a burst into one update", () => {
    const { result, rerender } = renderHook(({ value }) => useThrottledValue(value, 5_000), {
      initialProps: { value: "" },
    });

    rerender({ value: "1 of 5 voted." });
    act(() => vi.advanceTimersByTime(0));
    expect(result.current).toBe("1 of 5 voted.");

    rerender({ value: "2 of 5 voted." });
    rerender({ value: "3 of 5 voted." });
    act(() => vi.advanceTimersByTime(4_000));
    expect(result.current).toBe("1 of 5 voted.");

    act(() => vi.advanceTimersByTime(1_000));
    expect(result.current).toBe("3 of 5 voted.");
  });
});
