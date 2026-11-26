<div align="center">

# Lumen, a Streaming Photography Coach

**`openai-fastapi-photography-coach`**

*A FastAPI chat that streams advice token by token, and still leaves one clean Opik trace per turn.*

![Python](https://img.shields.io/badge/python-3.12%2B-3776AB?style=flat&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/fastapi-streaming-009688?style=flat&logo=fastapi&logoColor=white)
![OpenAI](https://img.shields.io/badge/openai-gpt--4o--mini-412991?style=flat&logo=openai&logoColor=white)
![Opik](https://img.shields.io/badge/opik-2.3.4-2f54eb?style=flat)

</div>

---

A streamed answer is awkward to log. Your handler returns before the model has finished, the text arrives in dozens of small pieces, and the chat as a whole is a series of separate HTTP calls. Plain request logs give you none of the three things you want later: the full reply, what it cost, and which calls belonged to the same conversation.

This example is Lumen, a small coach for amateur photographers. Ask it about silhouettes, prime lenses or window light and it answers in a stream. Opik records each turn as one trace, groups turns into threads, and an online rule grades every reply while you watch.

## What you'll build

- `POST /chat` takes `{conversation_id, message}` and streams a `gpt-4o-mini` reply as plain text. The server keeps each conversation's history in memory.
- The OpenAI client is wrapped with `track_openai`, and the streaming function carries `@track`, so a turn becomes a `coach-turn` trace with an `llm` span inside it.
- The conversation id is set as the trace's `thread_id`.
- `setup_rule.py` creates an online evaluation rule, `on_topic_coaching`, with an LLM judge that scores each reply 0 or 1.
- `demo.py` starts the server on port 7090 and plays three scripted conversations of two turns each, so you get real traffic with no typing.

```
demo.py -> POST /chat -> stream_reply (@track: coach-turn trace, thread_id)
                           └-> AsyncOpenAI (track_openai: llm span, usage, cost) -> tokens streamed back
Opik server: new trace -> on_topic_coaching rule -> judge -> feedback score on the trace
```

## See it in Opik

Open the `openai-fastapi-photography-coach` project at http://localhost:5173 (or your own Opik).

**Traces tab.** After one demo run there are 12 traces. Six are named `coach-turn`, one per chat turn. The other six are the judge's own runs (`prepare_evaluation`, with an `llm_call` inside), because the rule logs its work to the same project. Click a `coach-turn`: the input is the user message, the output is the full reply text, even though it left the server in pieces. The nested `chat_completion_stream` span is typed `llm`, names the model (`gpt-4o-mini-2024-07-18`) and shows token counts and an estimated cost. In my run the six turns cost between about $0.00008 and $0.00012 each. The second turn of a conversation sends more prompt tokens than the first, since it carries the history: 357 tokens against 215 for the silhouette chat.

**Threads tab.** Three threads appear, named `sunset-silhouettes`, `first-prime-lens` and `off-topic-detour`, two turns each. Open one to read the exchange as a conversation instead of two unrelated traces.

**Feedback scores.** Each `coach-turn` trace carries an `on_topic_coaching` score. In my run all six scored 1.0, including the lasagna request in `off-topic-detour`. That is correct: the rule counts a polite refusal that steers back to photography as on-topic, and Lumen did exactly that. The scores arrive a few seconds after the trace, because the judge runs on the server.

**Automation rules.** The project's online evaluation page lists `on_topic_coaching` as enabled with a sampling rate of 1.0, judged by `gpt-4o-mini`.

## Run it yourself

Prerequisite: the rule's judge runs on the Opik server, not in your app, so an OpenAI key must be stored in Opik (Configuration, AI Providers) before you send traffic. This is separate from the key your app reads from `.env`.

1. Put your key in a `.env` (this folder or any parent): `cp .env.example .env`. Point Opik at your instance if it is not your default, for example `OPIK_URL_OVERRIDE=http://localhost:5173/api/` and `OPIK_WORKSPACE=default`.
2. `uv sync`
3. `uv run python setup_rule.py` creates, or updates, the online rule. Do this before sending traffic, so the rule is in place when the traces arrive.
4. `uv run python demo.py` runs the three conversations, prints the streamed replies and exits (about 20 seconds, well under a cent).
5. `uv run python verify.py` waits for the scores and prints one line per turn: thread, score, span types, cost, tokens.
6. Optional: `uv run uvicorn coach.app:app --port 7090`, then `curl -N -X POST localhost:7090/chat -H 'content-type: application/json' -d '{"conversation_id":"mine","message":"How do I shoot stars?"}'`.

Tests run offline: `env -u OPENAI_API_KEY OPIK_TRACK_DISABLE=true uv run pytest`.

## Poke around

- Add a fourth conversation to `data/conversations.json` that tries to bait the coach into off-topic work (a travel itinerary, say) and see whether any reply scores 0.
- Make the judge stricter in `coach/rule.py`, rerun `setup_rule.py`, and note that the same rule is updated in place instead of duplicated.
- Raise `MAX_HISTORY_MESSAGES` in `coach/prompts.py` and compare prompt tokens on the second turns.
- Remove `stream_options` or the `@track` decorator and see what is missing from the trace tree.

## Gotchas we hit

**Trace counts look doubled.** The project shows 12 traces for 6 chat turns. The online rule's judge runs are logged as ordinary traces (`prepare_evaluation` with an `llm_call` span) in the same project. Filter by name when counting or analysing: `[t for t in traces if t.name == "coach-turn"]`, as `verify.py` does.

**`openai.OpenAIError: Missing credentials. Please pass an `api_key`, `workload_identity`, `admin_api_key`, or set the `OPENAI_API_KEY` or `OPENAI_ADMIN_KEY` environment variable.` when importing the app offline.** `AsyncOpenAI()` raises as soon as it is built without a key (openai 2.54.0). The client is created lazily in `get_client()`, so importing `coach.chat` works offline and tests swap in a fake.

## How it's put together

- `coach/app.py` loads `.env`, sets the Opik project name, defines `/chat` and flushes Opik on shutdown.
- `coach/chat.py` streams the reply, keeps history, and holds the Opik wrapper, decorator and thread id.
- `coach/prompts.py` has the system prompt, model name and history trimming.
- `coach/rule.py` builds and idempotently creates the online evaluation rule.
- `setup_rule.py` runs that for the project. `demo.py` plays the scripted chats. `verify.py` reads the results back.
- `data/conversations.json` is the scripted traffic.
- `tests/` covers message building, the traced stream with tracking disabled, the endpoint, and the rule definition.

---

*built with Opik · inspired by Opik's examples and documentation*
