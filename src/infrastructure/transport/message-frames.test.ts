import { describe, expect, it } from "vitest";

import { createFrameAssembler, toFrames } from "./message-frames";

describe("message frames (SDD 14)", () => {
  it("sends short messages as they are", () => {
    expect(toFrames('{"type":"ping"}')).toEqual(['{"type":"ping"}']);
  });

  it("splits long messages under 16 KB a frame and joins them again", () => {
    // Devanagari and emoji take 3 and 4 bytes of UTF-8 per character.
    const message = JSON.stringify({ title: "कार्ड सहेजें 💳 ".repeat(2_000) });
    const frames = toFrames(message);

    expect(frames.length).toBeGreaterThan(1);
    for (const frame of frames) expect(new TextEncoder().encode(frame).length).toBeLessThan(16_384);

    const assembler = createFrameAssembler();
    const results = frames.map((frame) => assembler.push(frame));
    expect(results.slice(0, -1).every((result) => result === null)).toBe(true);
    expect(results.at(-1)).toBe(message);
  });

  it("never splits an emoji between frames", () => {
    const message = "a".repeat(4_999) + "💳".repeat(10);
    const assembler = createFrameAssembler();
    const frames = toFrames(message);
    expect(frames.map((frame) => assembler.push(frame)).at(-1)).toBe(message);
    for (const frame of frames) expect(frame.isWellFormed()).toBe(true);
  });

  it("discards a message whose frames arrive out of order", () => {
    const frames = toFrames("x".repeat(12_000));
    const assembler = createFrameAssembler();
    expect(assembler.push(frames[0]!)).toBeNull();
    expect(assembler.push(frames[2]!)).toBeNull();
    expect(assembler.push('{"type":"ping"}')).toBe('{"type":"ping"}');
  });
});
