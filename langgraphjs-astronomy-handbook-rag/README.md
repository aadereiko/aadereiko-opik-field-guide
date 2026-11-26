<div align="center">

# Larkfield Handbook RAG on LangGraph.js

**`langgraphjs-astronomy-handbook-rag`**

*A two-node RAG graph over a made-up stargazing handbook. See each node as a span, then grade the answers.*

![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat&logo=typescript&logoColor=white)
![LangGraph.js](https://img.shields.io/badge/LangGraph.js-1.x-1C3C3C?style=flat)
[![Opik](https://img.shields.io/badge/Opik-2.3.4-2f54eb?style=flat)](https://github.com/comet-ml/opik)
![Node](https://img.shields.io/badge/node-20%2B-339933?style=flat&logo=node.js&logoColor=white)

</div>

---

A RAG answer can go wrong in two separate places. Search can hand the model the wrong passages, or the model can ignore good passages and make something up. From the outside both look like a bad answer. This example builds a small question-answering assistant for the (fictional) Larkfield Astronomical Society observing handbook, and uses Opik to pull those two failures apart.

## What you'll build

A LangGraph.js graph with two nodes:

- **retrieve** embeds the question with `text-embedding-3-small` and picks the 3 most similar handbook sections by cosine similarity (a plain in-memory index, no vector database).
- **generate** asks `gpt-4o-mini` to answer from those sections only, and to say "I don't know" otherwise.

The handbook is four short markdown files in `docs/`: dark-sky basics, telescopes and optics, club sites and loans, and beginner sky targets.

`npm run demo` does two things. It answers four questions and traces each one. Then it uploads an eight-question dataset and runs an Opik experiment that scores every answer with `Hallucination` (from the Opik SDK) and a `ContextPrecision` metric written in this repo.

Tracing goes through the **LangChain.js callback handler** (`opik-langchain`). Opik's docs list LangChain.js, not LangGraph.js by name, but LangGraph.js runs on LangChain.js callbacks, so the handler is simply passed in the graph's invoke config: `app.invoke(input, { callbacks: [handler] })`.

## See it in Opik

Open the `langgraphjs-astronomy-handbook-rag` project at `http://localhost:5173` (workspace `default`). After one run it holds 20 traces: 12 graph traces and 8 `evaluation_task` traces.

**The graph trace.** Open any trace named `LangGraph`. It has four spans: the root `LangGraph` span, and under it `retrieve` and `generate`, with a `ChatOpenAI` span of type `llm` nested inside `generate`. The `retrieve` span's output is the three sections that were fetched. The `ChatOpenAI` span has the full prompt, the completion, `gpt-4o-mini` as the model, token counts (for example 272 tokens for the "I don't know" eclipse question) and an estimated cost of about $0.00005. When an answer is wrong, this is where you look first: wrong sections in `retrieve` means a search problem; right sections but a wrong reply in `ChatOpenAI` means a prompt or model problem. The node spans are type `general`, because LangGraph nodes are plain chains to the handler. Trace input shows up as `{"question": {"value": "..."}}`; the `value` wrapper comes from the handler's handling of LangGraph state channels.

**The experiment.** Open Experiments and pick `handbook-rag-k3` (the config column shows `retrieve_k: 3`). It has 8 rows and two scores:

- `hallucination_metric` averages **0.125**. Seven answers score 0. One row scores 1: the question about returning a telescope two weeks late. The assistant answered "you lose 2 weeks of borrowing rights", which is right (the handbook says 1 week per week overdue), but the judge model decided it was wrong. Open that row's score reason to see it. The score is only as good as the judge, so read reasons before trusting a number.
- `context_precision` averages **0.2917**. Every answerable question scores 0.33, because exactly one of the three retrieved sections was relevant. The eclipse question scores 0 because the handbook says nothing about it, and the assistant correctly said "I don't know", which also earns a hallucination score of 0.

Each experiment row opens an `evaluation_task` trace holding the task and the two metric spans.

**A quick comparison.** Running with `RETRIEVE_K=1` creates `handbook-rag-k1`. In my run it scored context precision **0.875** (seven of eight top hits were relevant) with hallucination **0.0**. Fewer passages means less noise. It also means a question that needs two sections would have only one to work with, which this small dataset does not test.

## Run it yourself

1. Have a running Opik (the defaults point at a local one at `http://localhost:5173/api/`, workspace `default`) and an OpenAI key.
2. Copy `.env.example` to `.env`, or fill in a `.env` in any parent folder. The app walks up from `src/` until it finds one, before creating any Opik client.
3. `npm install`
4. `npm run demo` (about 15 seconds, well under one cent of model calls)
5. `npm run inspect` prints what landed in Opik: trace counts, span shape, usage and cost, mean scores, dataset and experiment.
6. `npm test` runs the offline tests. They need no key. To keep Opik quiet, run `OPIK_TRACK_DISABLE=true npm test`.

## Poke around

- Run `RETRIEVE_K=1 npm run demo` or `RETRIEVE_K=6 npm run demo`, then compare the experiments side by side.
- Add a question to `src/dataset.ts` that needs two sections (for example, what a Household member can borrow and for how long), and watch what `k=1` does to it.
- Edit a number in `docs/club-sites-and-loans.md` and rerun. The answer repeats the planted number with a clean hallucination score, because the metric checks the answer against the retrieved text, not the truth.
- Tighten the wording in `ContextPrecision`'s judge prompt in `src/metrics.ts` and see whether the 0.33 scores move.

## Gotchas we hit

**`npm install` fails with `ERESOLVE ... peer opik@"^1.8.75" from opik-langchain@2.3.4`.** `opik-langchain` declares a peer dependency on an old `opik` range. Pin both to the same version and add an override in `package.json`:

```json
"dependencies": { "opik": "2.3.4", "opik-langchain": "2.3.4" },
"overrides": { "opik-langchain": { "opik": "2.3.4" } }
```

**`ContextPrecision` is not exported from `opik`.** The TypeScript SDK ships `Hallucination` but no context-precision metric. Extend `BaseMetric` yourself (see `src/metrics.ts`): give it a name, a zod `validationSchema`, and a `score()` that returns `{ name, value, reason }`. `evaluate()` then records it like a built-in.

## How it's put together

- `src/main.ts` runs the four traced questions, then the experiment, then flushes.
- `src/env.ts` finds and loads the nearest `.env` and names the Opik project.
- `src/corpus.ts` splits the docs by `##` heading, plus cosine similarity and top-k.
- `src/graph.ts` is the two-node LangGraph graph, with the embedder and chat model injected.
- `src/rag.ts` builds the real OpenAI embedder, the index and the model.
- `src/dataset.ts` holds the eight question and reference-answer pairs.
- `src/metrics.ts` is the custom `ContextPrecision` metric and its judge prompt and parser.
- `src/evaluate.ts` creates the dataset and runs the experiment.
- `src/inspect.ts` reads the project back through the SDK.
- `docs/` is the fictional handbook.
- `tests/` has offline tests for chunking, ranking, the graph with stubbed models (including a traced call with tracking disabled), and the metric.

---

*built with Opik · inspired by Opik's examples and documentation*
