# Opik Field Guide

Twenty-one small apps that each answer one practical question about running LLM code: *what did the model actually see, what did it cost, and did it get better?* Every app is traced with [Opik](https://github.com/comet-ml/opik), the open-source LLM observability and evaluation platform. Each one is small enough to read in one sitting.

Each folder is a complete project with its own fictional data, a README that says exactly what to open in Opik, offline tests, and a short list of the gotchas we hit while building it. Python apps use [uv](https://docs.astral.sh/uv/); TypeScript apps use npm; one app is a no-code n8n workflow in Docker.

## The examples

### Conversations and threads

| Example | Stack | What you'll see in Opik |
|---|---|---|
| [openai-ts-apartment-resident-chat](openai-ts-apartment-resident-chat) | TypeScript · OpenAI + `opik-openai` | Each resident conversation as a thread, cost per turn, and a satisfaction score logged after the chat |
| [langchain-fastapi-library-books-chat](langchain-fastapi-library-books-chat) | Python · LangChain + FastAPI | A library patron's visit as one thread that reads like a transcript |
| [openai-fastapi-photography-coach](openai-fastapi-photography-coach) | Python · FastAPI + streaming OpenAI | Streamed replies as spans, threads, and a live LLM-judge rule scoring every reply on the server |

### Agents and tool calls

| Example | Stack | What you'll see in Opik |
|---|---|---|
| [openai-agents-insurance-claims](openai-agents-insurance-claims) | Python · OpenAI Agents SDK | A triage agent handing claims to specialists, every tool call with its arguments, turns grouped into threads |
| [crewai-theater-production-crew](crewai-theater-production-crew) | Python · CrewAI | One trace per crew run, with token usage and dollar cost per agent |
| [langgraphjs-beekeeping-research-team](langgraphjs-beekeeping-research-team) | TypeScript · LangGraph.js + `opik-langchain` | A planner, a looping researcher and a writer in one deep trace, including the routing decision on each loop pass |
| [mastra-banking-agent](mastra-banking-agent) | TypeScript · Mastra over OpenTelemetry | An agent loop with real `execute_tool` spans for balance, transaction and card-freeze tools |
| [voltagent-hair-salon-assistant](voltagent-hair-salon-assistant) | TypeScript · VoltAgent over OpenTelemetry | Mapping framework attributes to `gen_ai.*` so token usage and cost show up |
| [beeai-aquarium-care-agent](beeai-aquarium-care-agent) | TypeScript · BeeAI over OpenInference | ReAct iterations, model calls and tool calls from auto-instrumentation |
| [smolagents-solar-farm-analyst](smolagents-solar-farm-analyst) | Python · smolagents over OpenInference | The pandas code the agent wrote and the logs it got back, step by step |

### Evaluation and test suites

| Example | Stack | What you'll see in Opik |
|---|---|---|
| [openai-ts-appliance-manual-qa](openai-ts-appliance-manual-qa) | TypeScript · OpenAI + `opik-openai` | A test suite with plain-English assertions that checks the answers quote the manual (5 of 6 pass; the failure is kept on purpose) |
| [langgraphjs-astronomy-handbook-rag](langgraphjs-astronomy-handbook-rag) | TypeScript · LangGraph.js + `opik-langchain` | Retrieve and generate spans, plus an experiment scored for hallucination and context precision |
| [llamaindex-curling-rulebook-qa](llamaindex-curling-rulebook-qa) | Python · LlamaIndex | Retrieval and synthesis spans over PDFs, and a suite with one item per rule |
| [whisper-rescue-radio-log](whisper-rescue-radio-log) | Python · OpenAI TTS + Whisper | A playable MP3 on every trace, and a judged suite that runs each item three times to tame judge noise |
| [openai-vision-nutrition-labels](openai-vision-nutrition-labels) | Python · OpenAI vision | Label images attached to their traces, typed field extraction, and a suite with feedback scores |

### Prompts, models and optimization

| Example | Stack | What you'll see in Opik |
|---|---|---|
| [opik-ts-science-fair-feedback-prompts](opik-ts-science-fair-feedback-prompts) | TypeScript · Opik SDK | Two prompt versions in the prompt library, and the same suite going from 0/5 to 5/5 |
| [openai-ts-rpg-portrait-studio](openai-ts-rpg-portrait-studio) | TypeScript · OpenAI images + `opik-openai` | Generated PNGs attached to their traces, tagged with the prompt version that made them |
| [litellm-code-review-router](litellm-code-review-router) | Python · LiteLLM | The same review prompts sent to three models, with cost and latency side by side |
| [optimizer-instrument-family-classifier](optimizer-instrument-family-classifier) | Python · Opik Agent Optimizer | A score for every optimization trial, and the winning prompt saved as a new version |
| [dspy-harbor-tide-qa](dspy-harbor-tide-qa) | Python · DSPy | One suite run twice: the plain program passes 0/8, the compiled one 8/8 |

### No code

| Example | Stack | What you'll see in Opik |
|---|---|---|
| [n8n-makerspace-booking-review](n8n-makerspace-booking-review) | n8n in Docker · `n8n-observability` | Every workflow execution as a trace, with the model's input and verdict on its node's span, without adding a node |

## Running an example

1. **Start Opik.** The examples were built against a local self-hosted Opik ([setup guide](https://www.comet.com/docs/opik/self-host/local_deployment)), which serves its UI at `http://localhost:5173` and needs no API key. They also work with Opik Cloud.
2. **Create the shared `.env`.** Copy `.env.example` to `.env` at the repo root and fill in `OPENAI_API_KEY`. Every example looks for this file by walking up from its own folder, so one `.env` serves all of them. It is git-ignored.
3. **Pick a folder and follow its README.** Most come down to `uv sync && uv run main.py` (Python) or `npm install && npm run demo` (TypeScript); each README gives the exact command that was run.
4. **Open the project in Opik.** Every example logs to a project with the same name as its folder.

You need Python 3.12+ with uv, Node.js 20+, and Docker for the n8n example. A full run of any example costs well under a dollar in OpenAI calls; most cost under a cent.

## What's in each folder

- `README.md`: what the app does, **See it in Opik** (which project, trace and span to open, with the numbers from a real run), **Run it yourself**, **Poke around** (experiments to try), **Gotchas** and a file-by-file map.
- `.env.example`: only the variables that example reads.
- Fictional data in `data/` or `docs/` (or generated at run time), so nothing depends on outside services except the model.
- Offline tests (`uv run pytest` or `npm test`) that pass with no API keys and Opik tracking turned off.
- A short commit history for most examples: the plain app first, then the commits that add tracing and evaluation. `git log -- <folder>` shows the exact diff that makes an app observable.

## License

[Apache 2.0](LICENSE).

---

*Inspired by Opik's examples and documentation · [Opik on GitHub](https://github.com/comet-ml/opik) · [Opik docs](https://www.comet.com/docs/opik/)*
