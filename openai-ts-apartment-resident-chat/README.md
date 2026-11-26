# openai-ts-apartment-resident-chat

*A tiny TypeScript chat assistant for apartment residents, and the three things Opik shows about it: conversations, cost per turn, and who was happy.*

![TypeScript](https://img.shields.io/badge/typescript-strict-3178C6?style=flat&logo=typescript&logoColor=white)
![Node](https://img.shields.io/badge/node-20%2B-339933?style=flat&logo=nodedotjs&logoColor=white)
![opik-openai](https://img.shields.io/badge/opik--openai-2.3.4-2f54eb?style=flat)

Residents of a building do not ask one question. They ask three in a row, and each answer depends on the one before. If you log every model call as its own row, you can no longer tell which chat a message belonged to, what that chat cost, or whether the person walked away satisfied.

This example is "Lark", the assistant for Larkspur Court, a made-up 48-unit building. Lark answers questions about laundry, parking, packages and quiet hours from a short handbook in `data/handbook.md`. Every message is traced with the official `opik-openai` wrapper, every conversation gets a thread id, and a satisfaction score is added after the run.

## What you'll build

- `ResidentBot`: keeps the message history, so "can I still start a wash?" is understood as a follow-up to "what time does the laundry close?".
- One Opik trace per resident message, with a `threadId` equal to the conversation id. Inside it, `trackOpenAI` records the model call.
- A scripted demo with two conversations of three questions each (`laundry-and-quiet-hours` and `parking-and-packages`), plus an interactive mode.
- A `resident-satisfaction` feedback score logged on the last reply of each conversation after the run finishes.
- A few offline tests that need no API key and no Opik server.

## See it in Opik

Open the `openai-ts-apartment-resident-chat` project in your Opik workspace.

**Traces tab.** Six rows named `answer-resident-question`, with the question as input and Lark's reply as output. Open any row and you will find one child span called `lark-reply`, typed `llm`, with the model (`gpt-4o-mini-2024-07-18`), the token counts and an estimated cost. In one verified run the first conversation went 676, 719 and 781 tokens, and the second went 712, 774 and 827. The count climbs every turn because each call re-sends the system prompt (the handbook) plus the whole chat so far. The cost column follows: about $0.00011 for the first laundry question and about $0.00014 for the last parking one. The whole run came to under $0.001.

**Threads tab.** Two threads, `laundry-and-quiet-hours` and `parking-and-packages`, each with 6 messages (3 questions and 3 replies) and a total cost per thread (about $0.00035 and $0.00040 in the verified run). Click one to read the chat top to bottom.

**Feedback scores.** Add the `resident-satisfaction` column in the Traces tab. Two rows have a value: `1` on the last laundry reply and `0` on the last parking reply, with the reason text visible on hover. These ratings are scripted in `src/script.ts` to stand in for a thumbs-up or thumbs-down button. In a real product you would log them from the button handler with the same call.

## Run it yourself

1. Put `OPENAI_API_KEY` in a `.env` file. The app walks up from this folder until it finds one, so a repo-root `.env` works too. Copy `.env.example` if you want a template.
2. Point the SDK at your Opik server. For a local server:
   ```bash
   export OPIK_URL_OVERRIDE=http://localhost:5173/api/
   export OPIK_WORKSPACE=default
   ```
   (Or put those two lines in the same `.env`. For Opik Cloud, set `OPIK_API_KEY` and `OPIK_WORKSPACE` instead.)
3. `npm install`
4. `npm run demo`
5. Open the project in Opik and check the Traces and Threads tabs.

Run the tests with `npm test`. To prove they never touch Opik, run them with tracking switched off and the key unset: `env -u OPENAI_API_KEY OPIK_TRACK_DISABLE=true npm test`. `OPIK_TRACK_DISABLE=true` is the TypeScript SDK's switch for turning tracing into a no-op.

## Poke around

- `npm run dev` starts an interactive chat. Each session gets its own thread id, so it shows up as a new thread while you type.
- Ask something the handbook does not cover ("is there a rooftop pool?"). Does Lark point you to the front desk, or make something up? Find that trace and read the full prompt it received.
- In `src/script.ts`, flip a rating and rerun. Sort the Traces tab by `resident-satisfaction` to find the unhappy chats first.
- Change `MODEL` in `src/bot.ts` to `gpt-4.1-mini` and compare the cost column with the first run.

## Gotchas we hit

**`npm install` fails with `ERESOLVE ... peer opik@"^1.8.61" from opik-openai@2.3.4`.**
`opik-openai@2.3.4` still declares a peer dependency on the old 1.x `opik` package, while the current SDK is 2.x. The two work together; npm just refuses the pairing. Add an override to `package.json`:
```json
"overrides": { "opik-openai": { "opik": "$opik" } }
```

**Spans from `opik-openai` show up as type `general`, not `llm`.**
Usage, model and cost are filled in, but the span carries the generic type, so it does not get the LLM badge and LLM-only filters miss it. The wrapper accepts a `parent` trace and calls `parent.span(...)` on it, so `src/tracing.ts` hands it a proxy whose `span()` sets the type to `llm`:
```ts
parent: withLlmSpans(trace)
```
Spans are `llm` in the verified run. If a later `opik-openai` release sets the type itself, the proxy becomes a harmless no-op you can delete.

**`searchSpans({ traceId })` returns every span in the project, not just that trace's.**
When checking a run from a script, the `traceId` option did not narrow the result in SDK 2.3.4: each of the six traces appeared to have six spans. Use a filter string instead:
```ts
client.searchSpans({ projectName, filterString: `trace_id = "${trace.id}"` })
```

## How it's put together

- `src/bot.ts` - system prompt, `ResidentBot` with its memory, and the traced model call.
- `src/tracing.ts` - the Opik client pinned to this project.
- `src/script.ts` - the two scripted conversations, their simulated ratings and the helper that turns them into feedback scores.
- `src/demo.ts` - entry point: loads `.env`, runs the scripted chats or the interactive one, logs ratings, flushes.
- `src/env.ts` - finds the nearest `.env` above this folder.
- `data/handbook.md` - the fictional Larkspur Court handbook Lark answers from.
- `tests/bot.test.ts` - offline tests with a stubbed OpenAI client and tracking disabled.

---

*built with Opik · inspired by Opik's examples and documentation*
