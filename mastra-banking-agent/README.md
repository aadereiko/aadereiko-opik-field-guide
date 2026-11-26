# mastra-banking-agent

*A Mastra banking assistant whose balance lookups, transaction searches and card freezes show up in Opik as real tool spans.*

![Node](https://img.shields.io/badge/node-22.13%2B-339933?style=flat&logo=node.js&logoColor=white)
![Mastra](https://img.shields.io/badge/%40mastra%2Fcore-1.86-0b0b0b?style=flat)
![Opik](https://img.shields.io/badge/Opik-OTLP%20ingestion-2f54eb?style=flat)

A banking agent has two jobs that are easy to get wrong in different ways: say the right numbers, and only touch the card when asked. When a customer says "you froze the wrong card" or "my balance was off", the chat log cannot tell you whether the model picked the wrong tool, sent the wrong arguments, or misread a correct result. This example builds a small agent for a fictional credit union and sends every run to Opik, so each request becomes a tree you can read step by step.

## What you'll build

One Mastra `Agent` on `gpt-4o-mini` for Marlowe Credit Union, signed in as the made-up customer Ines Varga. It has three tools over in-memory data (nothing but the model call leaves your machine):

- `get_balance` returns the balance of one account.
- `list_transactions` returns recent transactions, newest first, with an optional category filter.
- `freeze_card` freezes a debit card by its last four digits. An unknown card returns an error object instead of throwing, so the model has to report the failure honestly.

Tracing is configuration only. `src/mastra.ts` adds Mastra's `Observability` layer with an `OtelExporter` pointed at Opik's OpenTelemetry endpoint. The agent, tools and bank data never mention Opik.

`npm run demo` plays four customer requests: a balance check, a two-tool question (travel spending plus balance), a real card freeze, and a freeze of a card that does not exist.

## See it in Opik

Open the `mastra-banking-agent` project in the local Opik (`http://localhost:5173`, workspace `default`). One demo run leaves **4 traces**, all named `invoke_agent marlowe-banking-agent`, with 15 to 18 spans each (63 spans, 8 `llm`, 5 `tool`, every `llm` span with token usage and a non-zero estimated cost).

Open the travel-spending trace (the one with 18 spans). Expand it and you will see this loop:

- an `agent_step` span, holding a `chat gpt-4o-mini` span of type **llm** (about 340 prompt tokens, a few dozen completion tokens, an estimated cost near $0.00009);
- two spans of type **tool**, `execute_tool listTransactionsTool` and `execute_tool getBalanceTool`. The first shows the arguments the model chose (`account_id: CHK-2210`, `limit: 5`, `category: travel`) and the transactions that came back; the second shows the balance object;
- a second `agent_step` with another `chat gpt-4o-mini` call that writes the final answer from those results.

Now open the trace for "Freeze my card ending 1234". Its `execute_tool freezeCardTool` span has output `{"error":"No card ending in 1234"}`, and the agent's reply says it could not find the card. Compare it with the trace for card 4417, where the same span returns `{"status":"frozen","reason":"Lost card"}`. That pair is the quickest way to see what a grounded answer and a tool failure look like.

Two honest limits: the trace-level **Output** column is empty (the answer sits in the root `invoke_agent` span's input attributes, as `mastra.agent_run.output`), and Mastra's bookkeeping spans (`agent_step`, `model_chunk`, `processor_run`, ...) all arrive as type **general**; only the model call is `llm` and only tool runs are `tool`.

## Run it yourself

1. Make sure `OPENAI_API_KEY` is set in a `.env` here or in a parent folder. For a local Opik also set `OPIK_URL_OVERRIDE=http://localhost:5173/api/` and `OPIK_WORKSPACE=default`. For Opik Cloud, set `OPIK_API_KEY` and `OPIK_WORKSPACE` and leave the URL unset.
2. `npm install`
3. `npm run demo` (about 40 seconds, well under one cent)
4. Open the `mastra-banking-agent` project in Opik and click the newest trace.

Tests need no keys and no Opik: `npm test`. The tracing lives only in the Mastra exporter, so there is no SDK switch to turn off; the tests call the tools directly and never build the `Mastra` instance.

## Poke around

- Change the second request to ask about savings (`SAV-9981`) and watch the model switch `account_id` in the tool span.
- Ask for something no tool covers ("transfer $50 to Sam") and see which spans appear, and whether any tool span does.
- Lower `maxSteps` in `src/demo.ts` and compare how many `agent_step` spans each trace has.
- Remove the "only call freeze_card when the customer clearly asks" line from the instructions, then ask "I think my card might be stolen". Check whether a `freezeCardTool` span appears.

## Gotchas we hit

**`Export failed ... OTLPExporterError: Bad Request`, and the Opik project never appears.** Cause: Opik's OTLP endpoint does not accept the JSON encoding (`protocol: "http/json"`). Mastra swallows the error, so the demo still exits 0. Fix: use protobuf and install the matching exporter, pinned to the version Mastra expects:

```ts
custom: { endpoints: { traces: `${opikBase}/v1/private/otel/v1/traces` }, protocol: "http/protobuf", headers }
```
```
npm install @opentelemetry/exporter-trace-otlp-proto@0.223.2
```

**`Log export FAILED: 1 logs, error: Not Found`.** Cause: with the `endpoint:` form Mastra also exports logs to `.../v1/logs`, which Opik does not serve. Fix: pass `endpoints: { traces: ... }` only, as above.

**`ERESOLVE could not resolve` when adding the exporter package.** Cause: an unpinned `npm install @opentelemetry/exporter-trace-otlp-proto` pulls a newer release whose `@opentelemetry/api` peer is too new for Mastra. Fix: pin `0.223.2`.

**The trace Output column is empty.** Cause: Mastra's OTel attributes put the final text on the input-side attributes of the root span, which Opik does not map to output. The tool and LLM spans are unaffected. Fix: read the answer from the root span, or add your own mapping.

## How it's put together

- `src/bank.ts`: fictional accounts, transactions and cards, plus the plain functions that read and change them.
- `src/tools.ts`: wraps those functions as Mastra tools with Zod input schemas.
- `src/agent.ts`: the agent's instructions, model and tool list.
- `src/mastra.ts`: the Mastra instance and the Opik OTLP exporter (the only file that knows about tracing).
- `src/demo.ts`: loads `.env`, runs the four requests, then shuts Mastra down so the exporter flushes.
- `tests/bank.test.ts`: offline checks for the bank logic and for the tools run as plain functions.
- `.env.example`: the one key the agent needs.

---

*built with Opik · inspired by Opik's examples and documentation*
