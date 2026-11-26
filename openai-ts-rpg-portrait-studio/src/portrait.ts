import fs from "node:fs";
import path from "node:path";
import type { Opik, Trace } from "opik";
import type { Character } from "./party.js";

export type BriefVars = Record<string, string>;

export function briefVars(c: Character): BriefVars {
  return {
    name: c.name,
    race: c.race,
    charClass: c.charClass,
    age: String(c.age),
    traits: c.traits.join(", "),
    outfit: c.outfit,
    signature_prop: c.signatureProp,
  };
}

export function renderBrief(template: string, vars: BriefVars): string {
  return template.replace(/\{\{\s*([\w]+)\s*\}\}/g, (_, key: string) => {
    const value = vars[key];
    if (value === undefined) throw new Error(`Brief needs a value for "${key}"`);
    return value;
  });
}

export function portraitFileName(version: string, c: Character): string {
  return `${version}-${c.id}.png`;
}

export function toDataUri(b64: string): string {
  return `data:image/png;base64,${b64}`;
}

export interface ImagesApi {
  images: {
    generate(params: Record<string, unknown>): Promise<{ data?: { b64_json?: string }[] }>;
  };
}

export interface BriefVersion {
  template: string;
  version: string;
  promptId?: string;
}

export interface PortraitDeps {
  opik: Opik;
  imageClientFor: (parent: Trace) => ImagesApi;
  model: string;
  params: Record<string, unknown>;
  outputDir: string;
}

export async function generatePortrait(
  deps: PortraitDeps,
  brief: BriefVersion,
  character: Character,
  promptName: string,
): Promise<{ file: string; bytes: number }> {
  const vars = briefVars(character);
  const imagePrompt = renderBrief(brief.template, vars);

  // One trace per portrait; prompt_version in metadata and tags lets you filter
  // and group every image in Opik by the brief version that produced it.
  const trace = deps.opik.trace({
    name: "generate-portrait",
    input: { character: character.name, ...vars, image_prompt: imagePrompt },
    tags: [brief.version, character.id],
    metadata: {
      prompt_name: promptName,
      prompt_version: brief.version,
      prompt_id: brief.promptId,
      image_model: deps.model,
    },
  });

  try {
    const result = await deps.imageClientFor(trace).images.generate({
      model: deps.model,
      prompt: imagePrompt,
      n: 1,
      ...deps.params,
    });
    const b64 = result.data?.[0]?.b64_json;
    if (!b64) throw new Error(`${deps.model} returned no image data`);

    const bytes = Buffer.from(b64, "base64");
    fs.mkdirSync(deps.outputDir, { recursive: true });
    const file = path.join(deps.outputDir, portraitFileName(brief.version, character));
    fs.writeFileSync(file, bytes);

    // A base64 data URI in the trace output is picked up by the SDK, uploaded
    // as an attachment and shown as a real image in the trace's Attachments tab.
    trace.update({ output: { image: toDataUri(b64), bytes: bytes.length } });
    return { file, bytes: bytes.length };
  } catch (error) {
    trace.update({ output: { error: String(error) } });
    throw error;
  } finally {
    trace.end();
  }
}
