# langgraphjs-beekeeping-research-team

*Ask one question about six hives, let three agents answer it, and read the whole conversation as a single Opik trace.*

![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?style=flat&logo=typescript&logoColor=white)
![LangGraph.js](https://img.shields.io/badge/LangGraph.js-1.x-1C3C3C?style=flat)
[![Opik](https://img.shields.io/badge/Opik-2.3.4-2f54eb?style=flat)](https://github.com/comet-ml/opik)

A report written by several agents has one big problem: when a line in it is wrong, you cannot tell which agent wrote it. Was the plan off? Did one research pass read the wrong log entry? Did the writer garble a correct finding? The final text does not say.

This project is a small beekeeping research team built with LangGraph.js (the JavaScript version of LangGraph, a library that wires LLM calls into a graph of steps). It answers "Which of our six hives need attention this month?" from offline inspection logs, and it shows how Opik turns the whole run into one trace you can open step by step, with a cost for each agent.

## What you'll build

A graph with three agents and one real loop:

```
planner --> researcher --+
              ^          |  sub-questions left? go again
              +----------+  all answered? --> writer --> report
```

- **planner** asks `gpt-4o-mini` to split the question into three or four sub-questions and returns them as JSON.
- **researcher** answers one sub-question per pass. It searches `data/` (five fictional markdown files: two apiary inspection logs, varroa mite counts, feeding records, weather notes) with a tiny keyword search that favours rare words, then asks the model to answer from the top three sections only.
- **writer** turns all findings into a short hive-health report.

A conditional edge sends control back to the researcher until every sub-question has a finding. There is no vector database and no web access.

Tracing works through the LangChain.js callback handler from `opik-langchain`. Opik's docs list LangChain.js but do not name LangGraph.js; it works because LangGraph.js runs on LangChain.js callbacks. You pass the handler in the config of `graph.invoke`, and every node and model call is reported to it.

## See it in Opik

Open the local Opik UI, workspace `default`, project `langgraphjs-beekeeping-research-team`. After one run there is exactly one trace, named `LangGraph`, with 18 spans.

Expand it. The top span is `LangGraph`. Under it you see `planner` once, `researcher` four times (one per loop pass), and `writer` once. Each of those has a `ChatOpenAI` span of type `llm` directly under it. Next to them sit five `RunnableLambda` spans (LangChain's wrapper around a function), one under `planner` and one under each `researcher`. They are the conditional-edge routing calls, and their output is the loop decision: `researcher` four times, then `writer` after the last pass. The writer has none, because it is the end of the path. Only the six `ChatOpenAI` spans carry token usage and cost; the node spans are type `general`.

Click a `researcher` span and its input is the sub-question, its output the finding. In my run the planner returned four sub-questions (stores, disease and pests, population and queen issues, actions), so the loop ran four times.

Cost per agent is the sum of the `ChatOpenAI` spans under each node. In the verified run:

| agent | llm spans | tokens | cost |
|---|---|---|---|
| planner | 1 | 140 | $0.000047 |
| researcher | 4 | 1,076 | $0.000201 |
| writer | 1 | 376 | $0.000121 |

That is about $0.00037 and 1,592 tokens for the whole team. The researcher is the biggest line because it runs once per sub-question. If the planner asks for one more sub-question, you buy one more researcher pass. Your numbers will differ a little, since the model's wording changes between runs.

`npm run inspect` reads these spans back through the SDK and prints the same table.

## Run it yourself

1. `cd langgraphjs-beekeeping-research-team && npm install`
2. Put `OPENAI_API_KEY` in a `.env` file here or in a parent folder (the app walks up until it finds one). Copy `.env.example` if you want the Opik settings too. For a local Opik, set `OPIK_URL_OVERRIDE=http://localhost:5173/api/` and `OPIK_WORKSPACE=default`.
3. `npm run demo` runs the team once and prints the sub-questions and the report.
4. `npm run inspect` prints every span with its type, tokens and cost, then the cost per agent.
5. `npm test` runs the offline tests. They need no key and no Opik: `env -u OPENAI_API_KEY OPIK_TRACK_DISABLE=true npm test`.

## Poke around

- Change the question in `src/main.ts` to something the logs cannot answer, such as honey yield per hive, and watch the researchers reply "Not in the logs."
- Change `SECTIONS_PER_PASS` in `src/graph.ts` from 3 to 1 and compare each researcher span's input size and cost.
- Ask the planner for exactly two sub-questions in `PLANNER_PROMPT`. The loop shortens and the researcher line in the cost table drops.
- Give the writer a bigger model than the others and see its cost rise while the rest stay flat.

## Gotchas we hit

**TypeScript error `Type 'string' is not assignable to type 'undefined'` on `tags`.**
In `opik-langchain@2.3.4` the handler option `tags` is typed as `[]`, an empty tuple, so no tag can be passed. Skip it and tag the run another way; this project simply leaves tags out.

**`npm install` fails with `ERESOLVE` on `opik`.**
`opik-langchain` lists an older `opik` as a peer dependency. Pin both packages to the same version and add an override in `package.json`:
```json
"overrides": { "opik-langchain": { "opik": "2.3.4" } }
```

**`searchSpans({ traceId })` returns spans from other traces.**
The `traceId` filter was ignored in this SDK version. Filter with a query string instead: `filterString: 'trace_id = "<id>"'`.

**No agent-graph panel data on the trace.**
The trace metadata from this handler holds only `providers` and `ls_integration`, with no graph structure, so expect the span tree rather than a graph drawing.

## How it's put together

- `src/graph.ts` the three agents, the loop condition, prompts and the JSON parser for the plan.
- `src/corpus.ts` splits the logs into sections and ranks them by rare-word match.
- `src/main.ts` builds the models and the graph, attaches the Opik handler, runs once, flushes.
- `src/inspect.ts` reads the trace back and sums tokens and cost per agent.
- `src/env.ts` finds and loads the nearest `.env` before Opik is created and holds the project name.
- `data/` five fictional hive logs.
- `tests/corpus.test.ts` section splitting and search.
- `tests/graph.test.ts` plan parsing, loop condition, a full stubbed graph run, and a traced call with tracking disabled.

*built with Opik · inspired by Opik's examples and documentation*
