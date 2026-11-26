# opik-ts-science-fair-feedback-prompts

*Teacher feedback on student science-fair projects, with the prompt kept in Opik's library: version 1 passes 0% of the suite, version 2 passes 100%.*

![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?style=flat&logo=typescript&logoColor=white)
![Opik SDK](https://img.shields.io/badge/opik-2.3.4-2f54eb?style=flat)
![Model](https://img.shields.io/badge/model-gpt--4o--mini-412991?style=flat)

A middle-school science teacher wants an assistant that drafts written feedback on student projects. The first prompt anyone writes for this ("be friendly and encouraging") produces warm essays that are far too long for a project card and sometimes hand out grades. The second prompt fixes that with four explicit rules. The question this example answers is how you *prove* the second one is better, and how you keep both around, instead of overwriting the old text and hoping.

## What you'll build

A small TypeScript app, using only the Opik TypeScript SDK and the OpenAI client, that:

1. Registers a prompt called `science-fair-feedback` in the Opik prompt library, twice. v1 is the generic encouraging prompt. v2 adds rules: address the student by name and cite one detail of their project, at most 4 sentences, exactly one concrete suggestion for a fairer test, never a grade or prize guess.
2. Fetches the prompt from the library by name at run time, so the app never has the prompt text in its source.
3. Runs the same test suite twice, once per prompt version. The suite holds five fictional student projects (bean sprouts under colored light, paper planes, salt and ice, fruit batteries, sunscreen and UV beads) and four plain-language assertions that an LLM judge checks on every answer.

## See it in Opik

Open `http://localhost:5173` (or your own Opik), workspace `default`.

**Prompt library.** Open Prompt library and click `science-fair-feedback`. It lists two versions, `v1` and `v2`, each with its change description. Select both and Opik shows a diff: three removed lines (the generic tone) against ten added lines (the rules). Versions are immutable. Editing the text later creates `v3` and leaves `v1` and `v2` untouched.

**Experiments.** Open the test suite `science-fair-feedback-suite`. It has two runs:

| run | items passed | pass rate |
|---|---|---|
| `science-fair-feedback-v1` | 0 of 5 | 0% |
| `science-fair-feedback-v2` | 5 of 5 | 100% |

Under v1 the answers run long (the sample call for Marisol came back as 16 sentences with a numbered list and a sign-off), so "4 sentences or fewer" fails on all five. The judge scores the other three assertions 5 of 5 for v1, so the length rule alone sinks it. Each run is linked to the exact prompt version it used, and its configuration records `prompt_version` and `model`.

**Traces.** The project `opik-ts-science-fair-feedback-prompts` holds 12 traces: 10 `evaluation_task` traces (5 per run), plus 2 `teacher-feedback` traces from the sample calls the demo makes before the suite runs. Open one: the `teacher-feedback` span (type general) contains a `write-feedback` span of type `llm` with token usage and an estimated cost, and the span's metadata has an `opik_prompts` entry holding the prompt name and the exact version template that was used. In a run, the judge's work appears as extra spans (`llm_judge`, `model.generateText`) under the same trace.

## Run it yourself

1. Put `OPENAI_API_KEY` in a `.env` file in this folder or any parent folder (see `.env.example`). For a self-hosted Opik also set `OPIK_URL_OVERRIDE` and `OPIK_WORKSPACE`.
2. `npm install`
3. `npm run demo` (about 40 seconds, a few cents of OpenAI usage).
4. Optional: `npm run check` reads back the prompt versions, traces, spans, usage and cost from Opik.
5. Offline tests, no keys needed: `env -u OPENAI_API_KEY OPIK_TRACK_DISABLE=true npm test`. `OPIK_TRACK_DISABLE=true` is the TypeScript SDK's switch that turns tracing into a no-op.

The demo is safe to re-run. Registering text that is already in the library adds no version, and the suite items are inserted once. Each run does add two new experiments and new traces, so delete the old ones if you want counts for a single run.

## Poke around

- Add a rule to `PROMPT_V2` in `src/prompts.ts` (for example "end with one question for the student") and run again. The library gains `v3`, and the `v1 -> v2` diff stays readable next to it.
- Remove the sentence cap from v2 and watch which assertion fails. The per-assertion scores show which rule was carrying the pass rate.
- Edit a prompt in the Opik UI, then call `feedbackFor(project)` without a version. The app picks up the new text without a deploy.
- Add a sixth project that mentions a prize ("I hope I win first place") and see whether v2 still refuses to predict one.

## Gotchas we hit

**`npm install` fails with `ERESOLVE` after adding `opik-openai`.** `opik-openai@2.3.4` declares a peer dependency on an older `opik`, so npm refuses to pair it with `opik@2.3.4`. It also needs `openai@^6`. Pin both and tell npm to use your `opik` for it:

```json
"overrides": { "opik-openai": { "opik": "$opik" } }
```

**The `llm` badge is missing on the completion span.** `opik-openai` creates its spans with type `general`. Pass it a parent whose `span()` forces the type, as `withLlmSpans` does in `src/tracing.ts`. Usage and cost are filled in either way.

**`getPrompt()` still returns `v1` right after you created `v2`.** The SDK caches a prompt lookup for 5 minutes (`OPIK_PROMPT_CACHE_TTL_SECONDS`), and a `getPrompt` made earlier in the same process had cached the old latest. Read the history with `prompt.getVersions()`, which asks the backend, or pin the version you want with `getPrompt({ name, version: "v2" })`.

## How it's put together

- `src/demo.ts` runs the whole flow: register prompts, print the diff, two sample calls, build the suite, run it per version, print pass rates.
- `src/prompts.ts` holds both prompt texts and `ensurePromptVersions`, which pushes them to the library.
- `src/feedback.ts` fetches a prompt version by name and writes the feedback through the traced OpenAI client.
- `src/projects.ts` holds the five fictional student projects and the text sent to the model.
- `src/rules.ts` holds the four assertions the judge checks and a sentence counter.
- `src/tracing.ts` creates the Opik client for the project and holds the span-type wrapper.
- `src/env.ts` finds the nearest `.env` by walking up the folders.
- `src/check.ts` reads back what the demo logged.
- `tests/feedback.test.ts` covers the sentence counter, project rendering, prompt registration (including re-runs) and the feedback function with a stubbed OpenAI client and tracking disabled.

---

*built with Opik · inspired by Opik's examples and documentation*
