import { describe, expect, it } from "vitest";
import { QUESTIONS } from "../src/questions.js";
import { GLOBAL_ASSERTIONS, SUITE_ITEMS } from "../src/suite.js";

describe("suite definition", () => {
  it("has one item per question", () => {
    expect(SUITE_ITEMS.map((i) => i.data.question)).toEqual(QUESTIONS);
  });

  it("has three global assertions, all non-empty", () => {
    expect(GLOBAL_ASSERTIONS).toHaveLength(3);
    expect(GLOBAL_ASSERTIONS.every((a) => a.trim().length > 0)).toBe(true);
  });

  it("gives the unanswerable question an item-level no-quote assertion", () => {
    const item = SUITE_ITEMS.find((i) => String(i.data.question).includes("recipe app"));
    expect(item?.assertions?.[0]).toContain("no <quote> tags");
  });
});
