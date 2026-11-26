# langchain-fastapi-library-books-chat

*A library chat bot where every patron's visit reads as one clean transcript in Opik.*

![Python](https://img.shields.io/badge/python-3.12%2B-3776AB?style=flat&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115%2B-009688?style=flat&logo=fastapi&logoColor=white)
![Opik](https://img.shields.io/badge/opik-2.3.4-2f54eb?style=flat)

A chat box on a website sends one HTTP request per message. If you only log requests, a patron who asks three questions leaves three unrelated entries, and "the bot forgot what I said" becomes hard to investigate. This example is a small FastAPI backend for the (fictional) Marlowe Street Public Library. It recommends books from a 12-title catalog and traces every turn with Opik so that each patron's visit is one **thread**.

## What you'll build

- `POST /chat` takes `{message, session_id}` and returns `{reply}`.
- Behind it is a LangChain chain: load this session's history, fill a prompt that contains the catalog, call `gpt-4o-mini`, parse to a string.
- The chain takes a plain string and returns a plain string. That keeps the root run's input and output as the actual chat text, which is what Opik's Threads view shows for each turn.
- The only Opik code is an `OpikTracer` passed as a LangChain callback, with `thread_id` set to the patron's `session_id`.
- `main.py` starts the server on port 7100 and plays two scripted patrons, three questions each, then flushes.

## See it in Opik

Open the `langchain-fastapi-library-books-chat` project (workspace `default`).

- **Traces tab:** 6 traces, all named `library-chat-turn`. The root input is the patron's message and the root output is the bot's reply, each wrapped as `{"input": ...}` / `{"output": ...}`.
- **Open one trace:** four child spans. `load-session-history` (general), `ChatPromptTemplate` (tool), `ChatOpenAI` (llm) and `StrOutputParser` (general). The `ChatOpenAI` span carries token usage (for example 743 prompt and 53 completion tokens on the first turn) and an estimated cost of about $0.00014. Prompt tokens grow each turn because the whole history is sent again.
- **Threads tab:** 2 threads, `patron-mystery-fan` and `patron-weekend-reader`, with 3 turns each. Each shows 6 messages (3 questions, 3 answers); click one to read the conversation top to bottom.
- Look at the last question of `patron-weekend-reader` (a pizza oven). The catalog has no such book, and the bot points to the bread-oven guide rather than inventing a title. Open the trace to see the catalog in the prompt that made this possible.

## Run it yourself

1. Put `OPENAI_API_KEY`, `OPIK_URL_OVERRIDE` and `OPIK_WORKSPACE` in a `.env` (copy `.env.example`; a `.env` in any parent folder also works, the app walks up to find it).
2. `uv sync`
3. `uv run main.py` (about 20 seconds, well under a cent of model cost).
4. Open the project in Opik and check the Threads tab.
5. To use the page yourself: `uv run uvicorn app:get_app --factory --port 7100` and open http://localhost:7100. Each browser tab gets a new `session_id`, so each tab is its own thread.

Tests: `env -u OPENAI_API_KEY OPIK_TRACK_DISABLE=true uv run pytest`. `OPIK_TRACK_DISABLE=true` turns Opik tracking off.

## Poke around

- Remove `thread_id=` from `make_tracer` and rerun: the Threads tab stays empty and you are back to loose traces.
- Add a book to `data/catalog.json` and ask for it. Compare the prompt token count on the `ChatOpenAI` span before and after.
- Change the model to `gpt-4.1-mini` in `create_app` and compare cost per turn.
- Make the chain return the whole prompt dict instead of a string and see how the Threads view changes.

## Gotchas we hit

- **Symptom:** the root trace input shows `{"input": "..."}` rather than the bare text. **Cause:** `OpikTracer` wraps a string root input/output in a dict. **Fix:** nothing needed; keep the root chain string-in, string-out so the dict holds exactly the chat text. Passing a dict with many keys would put all of them in the transcript.
- **Symptom:** the last turns are missing from Opik after a short script. **Cause:** traces are sent in the background. **Fix:** call `opik.flush_tracker()` before the process exits, as `main.py` does.

## How it's put together

- `app.py`: FastAPI app, the LangChain chain, per-session history, and the `OpikTracer` factory.
- `catalog.py` and `data/catalog.json`: the fictional catalog and how it is formatted into the prompt.
- `main.py`: runs the server and two scripted patrons, then flushes.
- `static/index.html`: a minimal chat page with one session id per tab.
- `tests/test_app.py`: offline tests with a fake model, including a `@opik.track` function called with tracking disabled.

---

*built with Opik · inspired by Opik's examples and documentation*
