import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PROJECT_DIR } from "../src/env.js";
import { formatContext, loadSections, parseManual, retrieve } from "../src/manuals.js";

const sections = loadSections(join(PROJECT_DIR, "data", "manuals"));

describe("manuals", () => {
  it("splits a manual into titled sections", () => {
    const parsed = parseManual("# Toaster T1\n\n## 1. Setup\nPlug it in.\nPress down.\n\n## 2. Care\nWipe it.");
    expect(parsed).toEqual([
      { manual: "Toaster T1", heading: "1. Setup", text: "Plug it in. Press down." },
      { manual: "Toaster T1", heading: "2. Care", text: "Wipe it." },
    ]);
  });

  it("loads every bundled manual", () => {
    expect(new Set(sections.map((s) => s.manual)).size).toBe(3);
    expect(sections.length).toBeGreaterThan(15);
  });

  it("retrieves the section that holds the answer", () => {
    const top = retrieve("Can I use table salt in the Brinewave dishwasher?", sections)[0];
    expect(top?.heading).toBe("4. Salt for hard water");
  });

  it("returns nothing when no word matches", () => {
    expect(retrieve("zzz qqq", sections)).toEqual([]);
  });

  it("labels each excerpt with its manual and heading", () => {
    const context = formatContext(sections.slice(0, 1));
    expect(context.startsWith("[Aeroloft AF-5 Air Fryer / 1. First use]")).toBe(true);
  });
});
