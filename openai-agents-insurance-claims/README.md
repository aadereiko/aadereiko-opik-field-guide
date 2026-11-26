# openai-agents-insurance-claims

An insurance claim intake desk built from three agents. Opik shows who handled what.

When a claims bot gives a wrong answer, the reply alone does not say which agent is to blame. This app has a triage agent that hands home and auto claims to specialists. The specialists call tools to look up a policy, estimate a payout and file a claim. Every run becomes a trace in Opik that shows the handoff and each tool call with its arguments.

## What you'll build

- An **Intake Triage Agent** that only routes.
- A **Home Claims Agent** and an **Auto Claims Agent**, each with `lookup_policy`, `estimate_payout` and `file_claim`.
- Fictional policies in `data/policies.json`. No outside API is needed, only `OPENAI_API_KEY`.
- Four scripted conversations (two multi-turn, two single-turn) using `gpt-4o-mini`.

## See it in Opik

Open the `openai-agents-insurance-claims` project. The run adds 6 traces named `Claim intake`. Open one and expand it. You see a handoff span (`Intake Triage Agent -> Home Claims Agent` in its metadata), then the specialist's agent span with `llm` and `tool` children. Tool spans show the arguments the model chose.

Open the **Threads** tab. The 6 traces fall into 4 threads, one per conversation. Turns of one claim share a thread because they run inside `trace(..., group_id=...)`.

Run `uv run python verify.py` to print the same facts from the SDK.

## Run it yourself

1. Put `OPENAI_API_KEY` in the repo-root `.env` (see `.env.example`). For a local Opik also set `OPIK_URL_OVERRIDE` and `OPIK_WORKSPACE`.
2. `uv sync`
3. `uv run main.py`
4. `uv run python verify.py`

## Poke around

- Change the policy id in `kitchen-leak` to `HO-5120` and see which tool result the specialist relies on to say no.
- Remove a handoff from `triage_agent.handoffs` and see the route break in the trace.
- Add a `Renters Agent` and watch a new handoff target appear with no tracing change.

## How it's put together

- `main.py`: agents, tracing setup, scripted conversations.
- `tools.py`: the three tools and their plain-Python logic.
- `data/policies.json`: fictional policies.
- `verify.py`: reads the project back through the SDK.
- `tests/`: offline tests for the tools and a stubbed agent run with tracking disabled.

*built with Opik · inspired by Opik's examples and documentation*
