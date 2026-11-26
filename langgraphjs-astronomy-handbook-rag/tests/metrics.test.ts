import { describe, expect, it } from "vitest";
import { buildJudgePrompt, ContextPrecision, parseRelevance, precisionOf } from "../src/metrics.js";

describe("parseRelevance", () => {
  it("reads the JSON even when the judge wraps it in prose", () => {
    expect(parseRelevance('Sure:\n{"relevant": [true, false, true]}', 3)).toEqual([true, false, true]);
  });

  it("rejects a reply with the wrong number of verdicts", () => {
    expect(() => parseRelevance('{"relevant": [true]}', 3)).toThrow(/3 passages/);
    expect(() => parseRelevance("no json here", 3)).toThrow(/JSON/);
  });
});

describe("precisionOf", () => {
  it("is the share of relevant passages", () => {
    expect(precisionOf([true, false, false, false])).toBe(0.25);
    expect(precisionOf([])).toBe(0);
  });
});

describe("ContextPrecision", () => {
  const input = { input: "q?", context: ["a", "b", "c"], expected_output: "ref" };

  it("numbers every passage in the judge prompt", () => {
    const prompt = buildJudgePrompt(input);
    expect(prompt).toContain("[3]\nc");
    expect(prompt).toContain("Reference answer: ref");
  });

  it("scores with a stubbed judge", async () => {
    const metric = new ContextPrecision(async () => '{"relevant": [true, false, false]}');
    const result = await metric.score(input);
    expect(result.name).toBe("context_precision");
    expect(result.value).toBeCloseTo(1 / 3);
    expect(result.reason).toBe("1 of 3 retrieved passages were relevant");
  });
});
