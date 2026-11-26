# openai-agents-insurance-claims

![Python 3.12+](https://img.shields.io/badge/python-3.12%2B-3776AB?style=flat&logo=python&logoColor=white)
![openai-agents](https://img.shields.io/badge/openai--agents-0.22%2B-412991?style=flat)
![Opik 2.3.4](https://img.shields.io/badge/Opik-2.3.4-2f54eb?style=flat)

A home and auto insurance claim desk made of three agents, where Opik shows who handled what and what each tool was asked.

When a claims bot gives a wrong payout, the reply alone does not say whether triage misrouted the customer, the specialist guessed an input, or a tool returned something odd. Here a triage agent hands each claim to a home or auto specialist. The specialists look up the policy, estimate a payout and file the claim. Opik records every step as a tree and groups the turns of one claim into a thread.

## What you'll build

- **Intake Triage Agent**: reads the first message and hands off. It never answers claims.
- **Home Claims Agent** and **Auto Claims Agent**: both have `lookup_policy`, `estimate_payout` and `file_claim`.
- Four fictional policies in `data/policies.json`. One is lapsed (`AU-3317`) and one does not cover storms (`HO-5120`). Only `OPENAI_API_KEY` is needed.
- Four scripted conversations on `gpt-4o-mini`: `kitchen-leak` and `fender-bender` (two turns each), `lapsed-policy` and `storm-roof` (one turn each).

Tracing is one line: `set_trace_processors([OpikTracingProcessor()])`. Each turn runs inside `trace(workflow_name="Claim intake", group_id=...)`.

## See it in Opik

Open the project `openai-agents-insurance-claims`. After one run it holds 6 traces, all named `Claim intake`.

Open the first `kitchen-leak` trace and expand it. Under the root `Task` you see the `Intake Triage Agent` span with one `llm` child, then a span called `Handoff`. Click it and read the metadata: `from_agent: Intake Triage Agent`, `to_agent: Home Claims Agent`. Next comes the `Home Claims Agent` span. Its child is a `tool` span `lookup_policy` whose input is `{"policy_id":"HO-4471"}`. This trace has 3 `llm` spans, 1 `tool` span and 966 tokens.

Now open the second `kitchen-leak` trace. There is no handoff, because the specialist continues. It has two `tool` spans: `estimate_payout` with `repair_hours=12, parts_cost_usd=1800`, then `file_claim`. Those arguments are exactly what the customer said. The payout in the reply is $2,960: 12 h x $180 + $1,800 - $1,000 deductible.

Open the **Threads** tab. You see 4 threads (`kitchen-leak-...`, `fender-bender-...`, `lapsed-policy-...`, `storm-roof-...`). The first two hold 2 traces each. A whole run costs about $0.0012 in Opik's cost column.

`uv run python verify.py` prints these same facts from the SDK, including `file_claim` calls per thread (1 for each of the two filed claims).

## Run it yourself

1. Put `OPENAI_API_KEY` in the repo-root `.env` (template: `.env.example`). The app finds it by walking up from the folder. For a local Opik also set `OPIK_URL_OVERRIDE` and `OPIK_WORKSPACE`.
2. `uv sync`
3. `uv run main.py` (about 35 seconds)
4. `uv run python verify.py`
5. `uv run pytest` runs offline tests. Use `env -u OPENAI_API_KEY OPIK_TRACK_DISABLE=true uv run pytest` to see them pass with no key and tracking off.

## Poke around

- Edit the first `lapsed-policy` message to use `HO-4471`. Compare the tool spans with the original run.
- Remove `auto_agent` from `triage_agent.handoffs` and read the `Handoff` metadata for an auto claim.
- Weaken the "never guess" sentence in the specialist instructions and look at the `estimate_payout` arguments in the first turn.
- Add a `Renters Claims Agent`. A new handoff target shows up with no tracing change.

## Gotchas we hit

**The specialist invents repair hours and files twice.** Symptom: on the first message, before the customer gave any numbers, the trace had `estimate_payout(repair_hours=4, parts_cost_usd=500)` and a `file_claim` call. The next turn filed a second claim. Cause: the instructions said to estimate "when the customer gives" numbers, and the model filled the gaps. Fix: tell the model to ask and never guess, file only on an explicit request, and make the tool idempotent:

```python
key = (policy_id.upper(), damage_type.lower())
if key in FILED_CLAIMS:
    return {**FILED_CLAIMS[key], "status": "already_filed"}
```

**Turn 2 has no tool spans and a wrong payout.** Symptom: the second trace of a thread showed 1 `llm` span and no tools, and the reply said $800. Cause: every turn restarted at `triage_agent` with the full history, so triage answered on its own. Fix: resume from the last agent.

```python
current_agent = result.last_agent
result = Runner.run_sync(current_agent, conversation_input)
```

**Tool inputs look like a string.** Symptom: a tool span's input is `{"input": "{\"policy_id\":...}"}`. Cause: the Agents SDK records the raw JSON the model sent. Parse it with `json.loads(span.input["input"])`, as `verify.py` does.

## How it's put together

- `main.py`: agents, the Opik tracing processor, thread grouping and the scripted demo.
- `tools.py`: tool logic as plain functions plus the `@function_tool` wrappers.
- `data/policies.json`: fictional policies.
- `verify.py`: reads the project back via the SDK and prints threads, handoffs and tool arguments.
- `tests/test_tools.py`: payout, coverage, lapsed policy and duplicate filing.
- `tests/test_traced_run.py`: a stubbed-model agent run with the Opik processor installed and tracking disabled.

*built with Opik · inspired by Opik's examples and documentation*
