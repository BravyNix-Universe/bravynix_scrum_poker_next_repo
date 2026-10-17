import { describe, expect, it } from "vitest";

import { formatAverage, summarizeVotes } from "./results";

describe("summarizeVotes", () => {
  it("averages numeric votes and counts ? separately (PRD 18.4.1)", () => {
    const summary = summarizeVotes(["2", "3", "5", "5", "8", "unsure"]);
    expect(summary.displayAverage).toBe("4.6");
    expect(summary.numericCount).toBe(5);
    expect(summary.unsureCount).toBe(1);
    expect(summary.distribution.get("5")).toBe(2);
  });

  it("treats 0 and ½ as numeric (PRD 18.4.2)", () => {
    const summary = summarizeVotes(["0", "half", "1"]);
    expect(summary.numericCount).toBe(3);
    expect(summary.displayAverage).toBe("0.5");
  });

  it("gives no average when every vote is ? (PRD 18.4.3)", () => {
    const summary = summarizeVotes(["unsure", "unsure"]);
    expect(summary.displayAverage).toBeNull();
    expect(summary.unsureCount).toBe(2);
  });

  it("gives no average for no votes", () => {
    expect(summarizeVotes([]).displayAverage).toBeNull();
  });
});

describe("formatAverage (PRD 18.4.8)", () => {
  it.each([
    { votes: ["1", "2", "3"], expected: "2" },
    { votes: ["half", "1", "1"], expected: "0.83" },
    { votes: ["half", "half", "0", "0", "0", "0", "0", "0"], expected: "0.13" },
    { votes: ["2", "3", "5", "5", "8"], expected: "4.6" },
    { votes: ["20", "20", "13"], expected: "17.67" },
  ] as const)("$votes displays as $expected", ({ votes, expected }) => {
    expect(summarizeVotes(votes).displayAverage).toBe(expected);
  });

  it("rejects invalid input", () => {
    expect(() => formatAverage(1, 0)).toThrow(RangeError);
    expect(() => formatAverage(1.5, 2)).toThrow(RangeError);
  });
});
