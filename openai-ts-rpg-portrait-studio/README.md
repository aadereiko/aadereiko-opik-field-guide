<div align="center">

# Tabletop Portrait Studio

**`openai-ts-rpg-portrait-studio`**

*Three characters, two versions of the art brief, six portraits, each one attached to its trace.*

![Node](https://img.shields.io/badge/node-20%2B-5FA04E?style=flat&logo=node.js&logoColor=white)
![OpenAI SDK](https://img.shields.io/badge/openai-7.x-412991?style=flat&logo=openai&logoColor=white)
![Opik TS SDK](https://img.shields.io/badge/opik-2.3.4-2f54eb?style=flat)

</div>

---

A game master asks for a portrait of "Brom, the dwarf bard" and gets a nice picture. A week later the party has three more characters and the art no longer matches: one has a beige backdrop, one has a gilded frame, one has runes scribbled in a corner. The prompt was edited twice in a chat window and nobody remembers which wording made which picture. You cannot grep a PNG.

This small TypeScript app generates character portraits for a fictional adventuring party. The art brief lives in the Opik prompt library as two versions. Every portrait is one Opik trace, tagged with the brief version, with the PNG itself attached. Open a trace and you see the exact words and the exact picture side by side.

## What you'll build

- A party of three made-up characters (`src/party.ts`): Thessaly Vane the half-elf rogue, Brom Ironquill the dwarf bard, Ysolde Marrowmoth the tiefling druid.
- A prompt called `rpg-portrait-brief` with two versions. v1 only describes the character. v2 adds house-style rules: painterly bust, charcoal background, no text or frames, eyes in focus.
- A run that renders each version for each character (6 images, `gpt-image-1-mini` at low quality), calls `images.generate` on an OpenAI client wrapped by `trackOpenAI`, and writes the PNGs to `output/`.
- The PNG is put into the trace output as a base64 data URI. The Opik SDK notices it, uploads it as an attachment and replaces it in the stored output.

## See it in Opik

Open the `openai-ts-rpg-portrait-studio` project. The Traces tab shows 6 traces named `generate-portrait`. Each one has two tags (the brief version, for example `v2`, and the character id, for example `brom`) and metadata with `prompt_version`, `prompt_name`, `prompt_id` and `image_model`. Filter on the tag `v1` to see only the plain-brief images.

Click a trace. The input has the character fields and the fully rendered `image_prompt`. The output has the byte size, and the Attachments section holds the PNG, about 1.2 to 1.4 MB each in our run, which renders as the actual portrait. One child span, `images.generate`, shows the prompt that went to OpenAI, token usage (for the v1 Brom trace: 61 prompt tokens and 272 image tokens, 333 total) and an estimated cost of about $0.0001 to $0.0003 per image. Costs are tiny because the mini model at low quality is cheap. The v2 traces have more prompt tokens (139 to 146 against 61 to 68), because the style rules make the brief longer.

Then open Prompts, then `rpg-portrait-brief`. It has two versions. Compare them and the diff shows what v2 changed: the personality line, the prop line, and the new "Style rules" block. Put a v1 trace and a v2 trace for the same character next to each other. In our run Brom's v1 portrait came out with a mustard-beige backdrop, while v2 gave a dark charcoal one, as the new rule asks. Image models treat briefs as strong hints, not guarantees, so your pictures will differ. The versioning is what lets you compare them honestly.

## Run it yourself

1. `cd openai-ts-rpg-portrait-studio && npm install`
2. Put `OPENAI_API_KEY` and your Opik settings in a `.env` (copy `.env.example`). The app walks up the folders from `src/` until it finds a `.env`, so a `.env` in a parent folder works too.
3. `npm run demo`
4. Open the project in Opik as described above. The PNGs are also in `output/` (git-ignored, regenerated each run).

A run takes about a minute and costs a few cents. If you run it again, the prompt is reused (not re-registered), but you get six more traces.

Offline tests, no keys or Opik needed:

```
npm test
```

The test config sets `OPIK_TRACK_DISABLE=true`. That is the Opik TypeScript SDK's documented switch for turning tracking into a no-op.

## Poke around

- Add a v3 to `src/party.ts`, for example "three-quarter profile, rim light from the left", and register it in `registerBriefs`. The new version shows up in the library diff and new traces carry `prompt_version: v3`.
- Make the "No text" rule louder in v2 (put it first, say it twice) and see whether stray lettering disappears.
- Add a fourth character with an unusual prop and check which brief version keeps the prop visible.
- Switch `quality` from `low` to `medium` in `IMAGE_MODELS` and compare the image token counts and costs on the span.

## Gotchas we hit

**`npm install` fails with `ERESOLVE ... peer opik@"^1.8.61" from opik-openai@2.3.4`.** `opik-openai` declares an old peer range for `opik`. Add an override so it uses your installed `opik`:

```json
"overrides": { "opik-openai": { "opik": "$opik" } }
```

**The `images.generate` span has type `general`, not `llm`.** The `opik-openai` wrapper in 2.3.4 sets the type itself. Token usage and `total_estimated_cost` are still filled in, so cost tracking works. Only the type label differs from text completions.

**The prompt diff appears twice in the terminal.** `PromptVersion.compareTo()` prints the diff itself and also returns it as a string. Calling it without `console.log` is enough.

## How it's put together

- `src/demo.ts`: loads env, registers the two brief versions, picks an image model, loops over versions and characters, flushes.
- `src/party.ts`: the prompt name, both brief templates and the three characters.
- `src/portrait.ts`: pure helpers (`briefVars`, `renderBrief`, file names, data URI) and `generatePortrait`, which owns the trace for one image.
- `src/env.ts`: finds the nearest `.env` above the folder.
- `tests/portrait.test.ts`: brief rendering, v1 against v2 content, and `generatePortrait` run against a stub image client with tracking disabled.
- `vitest.config.ts`: turns Opik tracking off for tests.

---

*built with Opik · inspired by Opik's examples and documentation*
