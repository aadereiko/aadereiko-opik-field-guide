# beeai-aquarium-care-agent

*A BeeAI ReAct agent that answers fish-tank questions with three tools, and the OpenInference spans that let you watch every thought, tool call and model call in Opik.*

![Node](https://img.shields.io/badge/node-20%2B-339933?style=flat&logo=node.js&logoColor=white)
![BeeAI](https://img.shields.io/badge/beeai--framework-0.1.13-f5c518?style=flat)
![Opik](https://img.shields.io/badge/Opik-OTLP%20ingestion-2f54eb?style=flat)

## The problem

A ReAct agent plans out loud: think, call a tool, read the result, think again, answer. `agent.run()` hides all of that and hands you one string. When a customer asks "how much salt for my 150 L tank?" and the answer says 15 g, you cannot tell from the string whether the agent called the dosing tool and misread it, or never called it and guessed.

This example is the tank-care desk at Reefside Aquatics, a made-up fish shop. BeeAI emits OpenInference spans, the OpenTelemetry flavour used for LLM apps, and Opik accepts plain OTLP. So the whole loop shows up in Opik with no Opik SDK in the app.

## What you'll build

- A `ReActAgent` on `gpt-4o-mini` with three tools over an offline species table (six fish):
  - `check_water_parameters`: compares test-kit numbers with what a species needs, and flags ammonia or nitrite at 0.5 ppm or more as dangerous.
  - `check_compatibility`: tests two species and a tank size for temperature, pH, temperament, fin-nipping, salt vs fresh and minimum volume.
  - `compute_dose`: works out millilitres of conditioner, detoxifier or fertiliser, or grams of salt, for a tank volume.
- `src/instrumentation.ts`: an OpenTelemetry `NodeSDK`, BeeAI's OpenInference instrumentation and an OTLP exporter pointed at Opik.
- `npm run demo`, which asks three questions: a water test with a bad ammonia reading, a betta-with-tiger-barbs pairing, and a conditioner-plus-salt dose.

The tools are plain functions in `src/aquarium.ts`, so you can test them without a model.

## See it in Opik

Open `http://localhost:5173` (or your Opik Cloud workspace), pick the **beeai-aquarium-care-agent** project and open **Traces**. You get one trace per question, each named `beeai-framework-main`. In my run they had 41, 25 and 41 spans.

Open the water-test trace and expand it. The root span holds the whole prompt and the final answer. Under it are `iteration-1`, `iteration-2`, `iteration-3`: one per ReAct turn.

- In iteration 1 the model call (`backend.openai.chat.*`, type `llm`) decides to call `check_water_parameters`. The `tool.dynamic.checkWaterParameters.start` span input shows the arguments, `{'species': 'neon_tetra', 'ammoniaPpm': 0.5, ...}`, and `.success` shows what came back: status `dangerous`.
- Iteration 2 calls `computeDose` with `ammonia_detoxifier` and `tankLiters: 60`.
- Iteration 3 is the model writing the answer.

The compatibility trace is shorter (two iterations): one `checkCompatibility` call with `betta`, `tiger_barb`, `60`, then the answer.

Where to look for numbers: `backend.openai.chat.success-N` spans carry `usage` (the 25-span trace showed 1277 and 1383 tokens) and, because of the provider tagging described below, a cost of about $0.00022 each and model `gpt-4o-mini`. The trace row adds the figures up. A whole run costs well under a cent.

Two honest details. The OpenInference spans are all type `general` except the model calls (`llm`); there are no `tool`-typed spans, so find tools by the `tool.dynamic.*` names. And BeeAI emits one span per event (`agent.react.update-4`, `partialUpdate-65`, ...), so the tree is noisy; the `iteration-N` spans are the useful skeleton.

For the salt question, check how many `computeDose` spans exist. In two of my three runs the agent called the tool only for the conditioner and then wrote "15 g" of salt on its own (the tool would have said 300 g). In another run it called the tool for the salt too. The trace shows which case you got.

## Run it yourself

1. `npm install`
2. Put `OPENAI_API_KEY` in a `.env` in this folder or any parent folder (the app walks up until it finds one). For Opik Cloud also add `OPIK_API_KEY` and `OPIK_WORKSPACE`; for a self-hosted Opik set `OPIK_URL_OVERRIDE=http://localhost:5173/api/` and no key.
3. `npm run demo` (about 15 seconds)
4. Open the project in Opik and click the newest trace.

Offline tests, no key and no Opik: `npm test`.

## Poke around

- Ask about an oscar and a guppy in a 100 L tank and read the `check_compatibility` output span: the reasons list is exactly what the model had to work with.
- Set `maxIterations` to 1 in `src/agent.ts`. The trace stops after one turn, before the tool result can be used.
- Change the dosing rate in `src/aquarium.ts` and rerun. The `success` span shows the new number, and so does the answer. If the answer keeps the old number, you caught the model answering from memory.
- Ask something no tool covers (feeding schedule) and see that the trace has no tool spans at all.

## Gotchas we hit

1. **`Cannot find package '@ai-sdk/openai'` at start-up.** `beeai-framework` lists its model adapters as optional peers, so npm does not install the OpenAI one. Add it: `npm install @ai-sdk/openai@^1`.
2. **Token usage lands, but `total_estimated_cost` is null.** The BeeAI `success` spans have token counts and no provider or model, and Opik only prices tokens when it has both. `instrumentation.ts` wraps the OTLP exporter and sets `llm.provider`, `gen_ai.system` and `llm.model_name` on every LLM span before export. With that, cost appeared (about $0.00023 per call).
3. **Usage is missing on some intermediate model calls.** In the 41-span traces, only the last `backend.openai.chat.success-3` span had usage and cost; calls 1 and 2 had none. The trace total therefore understates the real token use on multi-tool questions. Treat the dollar figures as a lower bound.
4. **`npm install opik` fails with ERESOLVE.** The Opik npm package pulls in AI SDK versions that conflict with `beeai-framework`'s peers. This example does not need it, because OTLP is plain HTTP. To query Opik from a script, use the Python SDK instead.

## How it's put together

- `src/aquarium.ts`: the species table and the three pure functions (water check, compatibility, dosing).
- `src/tools.ts`: wraps those functions as BeeAI `DynamicTool`s with zod input schemas.
- `src/agent.ts`: the shop instructions and the `ReActAgent`.
- `src/model.ts`: the model name, shared by the agent and the exporter.
- `src/instrumentation.ts`: OTel `NodeSDK`, OpenInference BeeAI instrumentation, provider-tagging OTLP exporter.
- `src/env.ts`: finds the nearest `.env` above the folder.
- `src/demo.ts`: loads env, starts tracing, asks the three questions, flushes.
- `tests/aquarium.test.ts`: vitest checks for the three functions plus two tool calls that run with no model and no tracing.

*built with Opik · inspired by Opik's examples and documentation*
