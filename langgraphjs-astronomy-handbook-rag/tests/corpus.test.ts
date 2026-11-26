import { describe, expect, it } from "vitest";
import { cosine, loadChunks, splitIntoChunks, topK, type IndexedChunk } from "../src/corpus.js";

describe("splitIntoChunks", () => {
  it("makes one chunk per section and keeps the document title in the text", () => {
    const chunks = splitIntoChunks("a.md", "# Title\n\n## One\nfirst\n\n## Two\nsecond\n");
    expect(chunks.map((c) => c.id)).toEqual(["a.md#One", "a.md#Two"]);
    expect(chunks[0]?.text).toBe("Title\n\n## One\nfirst");
  });
});

describe("loadChunks", () => {
  it("reads the shipped handbook", () => {
    const chunks = loadChunks();
    expect(chunks.length).toBeGreaterThanOrEqual(15);
    expect(chunks.some((c) => c.id === "telescopes-and-optics.md#Cooling down a reflector")).toBe(true);
  });
});

describe("topK", () => {
  const index: IndexedChunk[] = [
    { id: "x", text: "x", vector: [1, 0] },
    { id: "y", text: "y", vector: [0, 1] },
    { id: "xy", text: "xy", vector: [1, 1] },
  ];

  it("ranks by cosine similarity and respects k", () => {
    expect(topK([1, 0.1], index, 2).map((c) => c.id)).toEqual(["x", "xy"]);
    expect(topK([1, 0.1], index, 1)).toHaveLength(1);
  });

  it("scores identical vectors as 1 and orthogonal as 0", () => {
    expect(cosine([2, 0], [5, 0])).toBeCloseTo(1);
    expect(cosine([1, 0], [0, 1])).toBeCloseTo(0);
  });
});
