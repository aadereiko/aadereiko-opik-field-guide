import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { Opik } from "opik";
import { BRIEF_V1, BRIEF_V2, PARTY } from "../src/party.js";
import {
  briefVars,
  generatePortrait,
  portraitFileName,
  renderBrief,
  toDataUri,
  type ImagesApi,
} from "../src/portrait.js";

const PNG_B64 = Buffer.from("fake-png-bytes").toString("base64");

describe("briefs", () => {
  it("fills every placeholder of both versions for each character", () => {
    for (const c of PARTY) {
      for (const template of [BRIEF_V1, BRIEF_V2]) {
        const text = renderBrief(template, briefVars(c));
        expect(text).toContain(c.name);
        expect(text).not.toMatch(/\{\{/);
      }
    }
  });

  it("v2 adds the style rules that v1 lacks", () => {
    const text = renderBrief(BRIEF_V2, briefVars(PARTY[0]));
    expect(text).toContain("No text");
    expect(renderBrief(BRIEF_V1, briefVars(PARTY[0]))).not.toContain("No text");
  });

  it("throws when a variable is missing", () => {
    expect(() => renderBrief("Hello {{who}}", {})).toThrow(/who/);
  });

  it("builds stable file names and data URIs", () => {
    expect(portraitFileName("v2", PARTY[1])).toBe("v2-brom.png");
    expect(toDataUri("QUJD")).toBe("data:image/png;base64,QUJD");
  });
});

describe("generatePortrait with tracking disabled", () => {
  it("renders the brief, calls the image client and writes the PNG", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "portrait-"));
    const generate = vi.fn(async () => ({ data: [{ b64_json: PNG_B64 }] }));
    const stub: ImagesApi = { images: { generate } };
    const opik = new Opik({ projectName: "tests" });

    const out = await generatePortrait(
      { opik, imageClientFor: () => stub, model: "stub-image", params: { size: "1024x1024" }, outputDir: dir },
      { template: BRIEF_V2, version: "v2" },
      PARTY[2],
      "rpg-portrait-brief",
    );

    expect(generate).toHaveBeenCalledOnce();
    const call = generate.mock.calls[0] as unknown as [Record<string, unknown>];
    expect(String(call[0].prompt)).toContain("Ysolde Marrowmoth");
    expect(fs.readFileSync(out.file).toString()).toBe("fake-png-bytes");
    fs.rmSync(dir, { recursive: true });
  });

  it("fails clearly when the model returns no image", async () => {
    const stub: ImagesApi = { images: { generate: async () => ({ data: [] }) } };
    const opik = new Opik({ projectName: "tests" });
    await expect(
      generatePortrait(
        { opik, imageClientFor: () => stub, model: "stub-image", params: {}, outputDir: os.tmpdir() },
        { template: BRIEF_V1, version: "v1" },
        PARTY[0],
        "rpg-portrait-brief",
      ),
    ).rejects.toThrow(/no image data/);
  });
});
