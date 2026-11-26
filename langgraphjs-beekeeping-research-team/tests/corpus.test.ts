import { describe, expect, it } from "vitest";
import { loadSections, search, splitIntoSections } from "../src/corpus.js";

describe("splitIntoSections", () => {
  it("makes one section per heading and keeps the document title", () => {
    const s = splitIntoSections("a.md", "# Log\n\n## One\nfirst\n\n## Two\nsecond\n");
    expect(s.map((x) => x.id)).toEqual(["a.md#One", "a.md#Two"]);
    expect(s[0]?.text).toBe("Log\n\n## One\nfirst");
  });
});

describe("search", () => {
  const sections = loadSections();

  it("loads the shipped logs", () => {
    expect(sections.length).toBeGreaterThanOrEqual(15);
  });

  it("finds the varroa counts for a mite question", () => {
    const top = search("Which hives are above the varroa mite threshold?", sections, 2);
    expect(top.some((s) => s.id.startsWith("varroa-counts.md"))).toBe(true);
  });

  it("returns nothing when no term matches", () => {
    expect(search("zzzz qqqq", sections, 3)).toEqual([]);
  });
});
