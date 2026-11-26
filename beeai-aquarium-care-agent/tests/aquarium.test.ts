import { describe, expect, it } from "vitest";
import { checkCompatibility, checkWater, computeDose } from "../src/aquarium.ts";
import { waterCheckTool, dosingTool } from "../src/tools.ts";

describe("checkWater", () => {
  it("flags ammonia at 0.5 ppm as dangerous", () => {
    const verdict = checkWater("neon_tetra", { temperatureC: 25, ph: 6.4, ammoniaPpm: 0.5 });
    expect(verdict.status).toBe("dangerous");
    expect(verdict.issues[0]).toContain("ammonia");
  });

  it("accepts a healthy reading", () => {
    expect(checkWater("guppy", { temperatureC: 25, ph: 7.2, ammoniaPpm: 0, nitratePpm: 10 }).status).toBe("ok");
  });

  it("flags pH outside the species range without calling it dangerous", () => {
    const verdict = checkWater("clownfish", { ph: 7.2 });
    expect(verdict.status).toBe("needs_attention");
  });
});

describe("checkCompatibility", () => {
  it("rejects a betta with tiger barbs", () => {
    const verdict = checkCompatibility("betta", "tiger_barb", 100);
    expect(verdict.compatible).toBe(false);
    expect(verdict.reasons.join(" ")).toContain("nips");
  });

  it("rejects a pair when the tank is too small", () => {
    expect(checkCompatibility("betta", "tiger_barb", 60).reasons.join(" ")).toContain("75 L");
  });

  it("accepts neon tetras with guppies in a 60 L tank", () => {
    expect(checkCompatibility("neon_tetra", "guppy", 60)).toEqual({ compatible: true, reasons: [] });
  });

  it("rejects freshwater and saltwater fish together", () => {
    expect(checkCompatibility("neon_tetra", "clownfish", 200).reasons.join(" ")).toContain("saltwater");
  });
});

describe("computeDose", () => {
  it("scales conditioner with tank size", () => {
    expect(computeDose("water_conditioner", 150)).toMatchObject({ amount: 7.5, unit: "ml" });
  });

  it("doses salt in grams", () => {
    expect(computeDose("salt", 150)).toMatchObject({ amount: 300, unit: "g" });
  });

  it("rejects a non-positive tank size", () => {
    expect(() => computeDose("salt", 0)).toThrow();
  });
});

describe("tools with tracking disabled", () => {
  it("runs a tool end to end without Opik or a model", async () => {
    const out = await dosingTool.run({ treatment: "water_conditioner", tankLiters: 100 });
    expect(JSON.parse(out.getTextContent())).toMatchObject({ amount: 5, unit: "ml" });
  });

  it("runs the water tool the agent would call", async () => {
    const out = await waterCheckTool.run({ species: "neon_tetra", ammoniaPpm: 0.5 });
    expect(JSON.parse(out.getTextContent()).status).toBe("dangerous");
  });
});
