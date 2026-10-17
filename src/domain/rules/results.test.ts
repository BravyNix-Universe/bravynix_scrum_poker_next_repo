import { describe, expect, it } from "vitest";

import { formatAverage, getMostCommon, getSpread, summarizeVotes } from "./results";

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

describe("getMostCommon", () => {
  it("names the top card, or every card tied for the top count, in deck order", () => {
    expect(getMostCommon(summarizeVotes(["5", "3", "5", "8"]).distribution)).toEqual({
      cards: ["5"],
      count: 2,
    });
    expect(getMostCommon(summarizeVotes(["8", "unsure", "3"]).distribution)).toEqual({
      cards: ["3", "8", "unsure"],
      count: 1,
    });
  });

  it("is null with no votes", () => {
    expect(getMostCommon(new Map())).toBeNull();
  });
});

describe("getSpread", () => {
  it("gives the lowest and highest numeric card", () => {
    expect(getSpread(["5", "half", "13", "unsure"])).toEqual({ low: "half", high: "13" });
    expect(getSpread(["3"])).toEqual({ low: "3", high: "3" });
  });

  it("is null without numeric votes", () => {
    expect(getSpread(["unsure"])).toBeNull();
  });
});
