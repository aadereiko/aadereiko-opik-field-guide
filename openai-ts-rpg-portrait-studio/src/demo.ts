import path from "node:path";
import process from "node:process";
import OpenAI from "openai";
import { Opik, PromptType, type Trace } from "opik";
import { trackOpenAI } from "opik-openai";
import { loadNearestEnv } from "./env.js";
import { BRIEF_V1, BRIEF_V2, PARTY, PROMPT_NAME, V2_CHANGE_DESCRIPTION } from "./party.js";
import { generatePortrait, type ImagesApi } from "./portrait.js";

loadNearestEnv(path.dirname(new URL(import.meta.url).pathname));

delete process.env.OPENAI_BASE_URL;

if (!process.env.OPENAI_API_KEY) {
  console.error("OPENAI_API_KEY is not set. Put it in .env (this folder or any parent).");
  process.exit(1);
}

const PROJECT = "openai-ts-rpg-portrait-studio";
const OUTPUT_DIR = path.resolve("output");
const IMAGE_MODELS = [
  { model: "gpt-image-1-mini", params: { size: "1024x1024", quality: "low" } },
  { model: "gpt-image-1", params: { size: "1024x1024", quality: "low" } },
];

// projectName routes every trace, span and prompt of this client to one Opik project.
const opik = new Opik({ projectName: PROJECT });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function registerBriefs() {
  let existing = await opik.getPrompt({ name: PROMPT_NAME });
  if (!existing) {
    // Each createPrompt with different text adds a version; the library diffs v1 against v2.
    // TS createPrompt does not dedupe, so we only register when the prompt is missing.
    await opik.createPrompt({
      name: PROMPT_NAME,
      prompt: BRIEF_V1,
      type: PromptType.MUSTACHE,
      changeDescription: "Initial brief: who, personality, outfit",
      tags: ["image-generation", "rpg"],
      projectName: PROJECT,
    });
    await opik.createPrompt({
      name: PROMPT_NAME,
      prompt: BRIEF_V2,
      type: PromptType.MUSTACHE,
      changeDescription: V2_CHANGE_DESCRIPTION,
      tags: ["image-generation", "rpg"],
      projectName: PROJECT,
    });
    existing = await opik.getPrompt({ name: PROMPT_NAME });
  }
  if (!existing) throw new Error(`Prompt ${PROMPT_NAME} was not created`);

  const versions = await existing.getVersions();
  const ordered = [...versions].reverse();
  if (ordered.length < 2) throw new Error("Expected two brief versions in the library");
  console.log("\nWhat v2 changed (from the Opik prompt library):");
  // compareTo prints the coloured v1 -> v2 diff itself.
  ordered[ordered.length - 1].compareTo(ordered[0]);
  return ordered.map((v, i) => ({
    template: v.prompt,
    version: v.version ?? `v${i + 1}`,
    promptId: existing!.id,
  }));
}

async function pickModel() {
  for (const candidate of IMAGE_MODELS) {
    try {
      await openai.models.retrieve(candidate.model);
      return candidate;
    } catch {
      console.warn(`${candidate.model} is not available for this key, trying the next one.`);
    }
  }
  throw new Error("No image model available");
}

async function main() {
  const briefs = await registerBriefs();
  const { model, params } = await pickModel();
  console.log(`\nImage model: ${model}`);

  const deps = {
    opik,
    model,
    params,
    outputDir: OUTPUT_DIR,
    // trackOpenAI wraps the client so images.generate becomes a span under this portrait's
    // trace, with the rendered prompt as input and the usage the Images API reports.
    imageClientFor: (parent: Trace) =>
      trackOpenAI(openai, { client: opik, parent, generationName: "images.generate" }) as unknown as ImagesApi,
  };

  for (const brief of briefs) {
    console.log(`\nBrief ${brief.version}:`);
    for (const character of PARTY) {
      const { file, bytes } = await generatePortrait(deps, brief, character, PROMPT_NAME);
      console.log(`  ${character.name} -> ${path.relative(process.cwd(), file)} (${bytes} bytes)`);
    }
  }

  // Traces are sent in batches in the background; without a flush the process can exit first.
  await opik.flush();
  console.log(`\nDone. Open project "${PROJECT}" in Opik.`);
}

main().catch(async (error) => {
  console.error("Run failed:", error);
  await opik.flush();
  process.exit(1);
});
