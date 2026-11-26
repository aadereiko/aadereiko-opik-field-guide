<div align="center">

# Marlowe Ridge: the solar analyst that shows its pandas

**`smolagents-solar-farm-analyst`**

*An agent that answers by running code leaves its whole method in the trace. Read the code, not just the number.*

![Python](https://img.shields.io/badge/python-3.12%2B-3776AB?style=flat&logo=python&logoColor=white)
![smolagents](https://img.shields.io/badge/smolagents-CodeAgent-FFD21E?style=flat)
![Opik](https://img.shields.io/badge/Opik-OpenTelemetry-2f54eb?style=flat)

</div>

---

Ask a normal chatbot a question about your data and it may make something up. Ask a *code agent* and it does
something sneakier: it writes a little pandas script, runs it, and reports the result with total confidence. If the
script measured the wrong thing, the answer is still a clean, precise number. You can't tell by looking at it.

This example puts a smolagents `CodeAgent` in front of a CSV of daily output from a fictional 2.8 MW solar farm,
Marlowe Ridge. Two real events are hidden in the data. Array B2 got dirty on 20 May and lost about 28% of its output
from then on. The whole farm went dark on 14 May during a storm. You ask three questions, the agent writes and runs
code, and Opik keeps every piece of that work so you can check it.

## What you'll build

- `data/output_2025.csv`: 546 rows, 91 days times 6 arrays, columns `date, array_id, capacity_kw,
  irradiance_kwh_m2, energy_kwh`. It is committed, and `make_data.py` regenerates it byte for byte.
- `main.py`: a `CodeAgent` on `gpt-4o-mini` that may import only `pandas` and asks three questions: which array
  underperforms, when the farm had zero output, and what the monthly MWh totals are.
- `tracing.py`: sends the agent's OpenTelemetry spans to the Opik server named in `OPIK_URL_OVERRIDE`.
- `verify.py`: after the run, pulls the traces back out of Opik, lists the generated code and the execution logs,
  and grades each final answer against numbers computed straight from the CSV.

## See it in Opik

Open the `smolagents-solar-farm-analyst` project. There is one trace per question, each named `CodeAgent.run`.
Click one and expand the tree:

- Each `Step N` span is one think, code, observe cycle. Its **output** is the execution log: whatever the generated
  code printed, for example `B2 0.163...` for the underperforming-array question.
- Under each step is an `OpenAIModel.generate` span of type `llm`. Its **output** contains the model's thought and
  the exact `<code>` block it wrote, for example `data.groupby(data['date'].dt.month)['energy_kwh'].sum() / 1000`.
  Its usage shows prompt and completion tokens, and the prompt tokens grow step by step as observations pile up.
- The last step is a `FinalAnswerTool` span carrying the sentence that becomes the trace output.

Run `uv run python verify.py` to see the same thing as text. In the verified run the three questions took 2, 4 and
2 model calls (5,549, 11,339 and 5,421 tokens), costing $0.00105, $0.00194 and $0.00102 as shown in each `llm`
span's cost. Two answers matched the CSV (14 May with 3,620.40 kWh the day before; 88.52, 96.26 and 83.36 MWh for
April, May and June). **The first answer was wrong**, and that is the point: the agent said array A1 was 100%
below the median. Open the `llm` span before it and the code explains why. It computed one performance value per
*row* and took `idxmin()`, so it picked the storm-day row where output was zero, instead of averaging per array.
The correct answer is B2, about 13% below. The number looked precise; the trace shows the method was wrong.
`verify.py` marks that trace `answer_correct=False`. Models are not deterministic, so another run may get all three
right or miss a different one.

## Run it yourself

1. Put `OPENAI_API_KEY` in a `.env` file in this folder or any parent folder (see `.env.example`). To send traces
   to a local Opik, also set `OPIK_URL_OVERRIDE=http://localhost:5173/api/` and `OPIK_WORKSPACE=default`. For Comet
   Cloud set `OPIK_API_KEY` and `OPIK_WORKSPACE` instead and leave the override out.
2. `uv sync`
3. `uv run python main.py` (about 45 seconds, about 0.4 cents in total)
4. `uv run python verify.py` to read the traces back and grade the answers.
5. `uv run pytest` for the offline tests.

## Poke around

- Change the CSV: edit `SOILED_ARRAY` in `make_data.py`, run `python make_data.py`, and see whether the agent now blames
  the new array.
- Remove `"pandas"` from `additional_authorized_imports` in `main.py` and look at the step spans to see how the
  agent copes when `import pandas` is blocked.
- Add a fourth question to `QUESTIONS` in `farm.py` and add a matching branch to `checks.grade`.
- Run the agent several times. The same question sometimes takes two steps and sometimes three. Compare the code
  in the `llm` spans between runs.

## Gotchas we hit

- **Symptom:** the `llm` spans show model and token usage, but cost is empty and `total_estimated_cost` is `None`.
  **Cause:** OpenInference sends `llm.model_name` but no provider, and Opik needs a provider to look up a price.
  **Fix:** add `gen_ai.system="openai"` to LLM spans on their way out. `tracing.py` does this with a thin exporter
  wrapper (`ProviderTaggingExporter`), because finished spans are read-only. After it, each `OpenAIModel.generate`
  span shows provider `openai` and a cost.
- **Symptom:** summing usage or cost over every `llm` span counts the tokens twice. **Cause:** the `CodeAgent.run`
  span is also typed `llm` and carries the whole run's total usage, but has no model. **Fix:** filter to spans that
  have a `model`, as `verify.py` does.

## How it's put together

- `main.py`: loads `.env`, builds the agent, asks the questions, flushes the exporter.
- `tracing.py`: OTLP endpoint and headers for Opik, plus the instrumentor setup.
- `farm.py`: the briefing, the questions, and the small pandas helpers that give ground truth.
- `checks.py`: pulls code blocks out of model output and grades answers.
- `verify.py`: reads the project back from Opik and prints what is in the spans.
- `make_data.py`: deterministic generator for the CSV.
- `tests/`: offline tests for the checks and the tracing setup, including a traced agent run with a stub model.

*built with Opik · inspired by Opik's examples and documentation*
