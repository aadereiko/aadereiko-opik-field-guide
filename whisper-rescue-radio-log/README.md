# whisper-rescue-radio-log

*Mountain rescue radio calls in, incident log entries out, with the audio one click from every trace.*

![Python](https://img.shields.io/badge/python-3.12%2B-3776AB?style=flat&logo=python&logoColor=white)
![Opik](https://img.shields.io/badge/Opik-2.3.4-2f54eb?style=flat)
![OpenAI](https://img.shields.io/badge/OpenAI-TTS%20%2B%20Whisper-412991?style=flat)

A search-and-rescue base logs what field teams say on the radio: who called, where they are, whether anyone is hurt, whether a helicopter is needed, and when they will call again. When a log line is wrong, the audio is already gone. All you have left is a transcript Whisper made and a structured entry a model made from it. Which one broke? Nobody can tell without hearing the call.

This example keeps the evidence. Every radio call becomes one Opik trace with the MP3 attached and playable. A test suite then checks the log entries with an LLM judge, and an execution policy absorbs the judge's own flakiness.

## What you'll build

A pipeline of three steps, one trace per call: voice the call, transcribe it, extract log fields.

- The calls are fictional. Two exchanges live in `calls.py`, each turn tagged with a TTS voice. `gpt-4o-mini-tts` speaks them, and the turns are joined into one MP3 in `data/`.
- `whisper-1` turns the MP3 back into text. It adds no speaker labels.
- `gpt-4o-mini` reads the transcript and fills a fixed set of fields: team callsign, six-digit grid reference, status, injuries, helicopter needed, minutes until the next report.
- `logbook.py` validates the reply in plain code. It rejects "Base" as a team, rejects unknown statuses, and turns "511-064" or "472189" into "511 064".
- `suite.py` is an Opik test suite with three plain-language assertions, judged by an LLM, run 3 times per item.

## See it in Opik

Open the `whisper-rescue-radio-log` project. The Traces tab shows a trace named `log-radio-call` for each call. Open one and press play on the audio attachment at the trace level: that is the call as the pipeline heard it. Below it is the span tree: `synthesize-audio` (the TTS turns as `llm` spans with the TTS model and characters priced as usage), `transcribe`, and `extract-entry` with a `chat_completion_create` `llm` span showing tokens and cost. The `transcribe` span is a plain `general` span: its output is the Whisper transcript, but Whisper calls are not wrapped by `track_openai`, so it carries no usage or cost.

Then open Test suites and pick `radio-log-field-suite`. Each row is one transcript run through the extractor, with a pass or fail per assertion and the judge's reason beside it. Each item is run three times and passes when two runs pass.

## Run it yourself

1. `cp .env.example .env` and fill in `OPENAI_API_KEY`. The repo-root `.env` also works, since the app looks upward for one.
2. Have an Opik server reachable. Local Opik: set `OPIK_URL_OVERRIDE=http://localhost:5173/api/` and `OPIK_WORKSPACE=default`.
3. `uv sync`
4. `uv run main.py` synthesizes the audio on first run, transcribes both calls and prints the log entries.
5. `uv run suite.py` runs the test suite.
6. `env -u OPENAI_API_KEY OPIK_TRACK_DISABLE=true uv run pytest` runs the offline tests.

## Poke around

- Delete `data/` and run `main.py` again. The `synthesize-audio` span returns to the trace; with cached audio it is skipped.
- Compare the `transcribe` output with the script in `calls.py`. Whisper turns "Alder One" into "Alder 1" and "bivvy" into "bivy".
- Add a fourth assertion to `suite.py` and run it again. Then notice that the suite still holds the old list (see Gotchas).
- Change `runs_per_item` to 1 and run the suite a few times. Compare how steady the verdict is.

## Gotchas we hit

**Symptom:** you edit `ASSERTIONS` in `suite.py`, but the judge's reasons still talk about the old wording.
**Cause:** `get_or_create_test_suite` returns the suite already saved under that name; it does not update its assertions.
**Fix:** delete it first, `client.delete_test_suite("radio-log-field-suite", project_name="whisper-rescue-radio-log")`, or pick a new name.

**Symptom:** the judge fails every item on "grid", although the grid is right (`511 064` against the spoken `511-064`).
**Cause:** the judge compares text literally and ignores a request to be lenient about spacing.
**Fix:** do not give formatting to a judge. `normalize_grid` fixes it in code, and the suite leaves `grid` out.

## How it's put together

- `main.py`: the traced pipeline (TTS, Whisper, extraction) and the audio attachment.
- `calls.py`: the two fictional radio exchanges and their voices.
- `logbook.py`: the extraction prompt, the log entry type and its validation.
- `suite.py`: the Opik test suite and its execution policy.
- `tests/`: offline tests for the parser and a traced function with tracking disabled.

---

*built with Opik · inspired by Opik's examples and documentation*
