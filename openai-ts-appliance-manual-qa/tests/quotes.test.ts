import { describe, expect, it } from "vitest";
import { extractQuotes, findMissingQuotes } from "../src/quotes.js";

const context = "Use only coarse dishwasher salt and never table salt.";

describe("quotes", () => {
  it("pulls text out of quote tags", () => {
    const answer = "No. <quote>never table salt</quote> and <quote>coarse dishwasher salt</quote>.";
    expect(extractQuotes(answer)).toEqual(["never table salt", "coarse dishwasher salt"]);
  });

  it("accepts a quote that is in the context, ignoring line breaks", () => {
    expect(findMissingQuotes(["coarse dishwasher\nsalt"], context)).toEqual([]);
  });

  it("flags a quote with curly quotation marks that the manual does not have", () => {
    const curly = "“never table salt”";
    expect(findMissingQuotes([curly], context)).toEqual([curly]);
  });

  it("flags a reworded quote", () => {
    expect(findMissingQuotes(["do not use table salt"], context)).toEqual(["do not use table salt"]);
  });
});
