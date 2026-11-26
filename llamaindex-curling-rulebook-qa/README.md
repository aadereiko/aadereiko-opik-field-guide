# llamaindex-curling-rulebook-qa

*Ask a curling league's rulebook a question and see which rule answered it, and which rule your answer missed.*

![Python](https://img.shields.io/badge/python-3.12%2B-3776AB?style=flat&logo=python&logoColor=white)
![LlamaIndex](https://img.shields.io/badge/llama--index-0.14%2B-6a4c93?style=flat)
![Opik](https://img.shields.io/badge/opik-2.3.4-2f54eb?style=flat)

Rulebooks are a good test for retrieval-augmented answers. The facts are small and exact: 38 minutes of thinking time, a 15-minute grace period, a $50 protest deposit. A wrong figure is easy to spot, but only if you can see what the model was shown. This example answers questions about a made-up league, the Frostbite Valley Curling League, and uses Opik to trace each answer and to check the answers rule by rule.

## What you'll build

- `rulebook/corpus.py` writes three rulebook PDFs (bylaws, rules of play, scheduling and conduct) with reportlab. Every rule has an id such as `G-3.4`.
- `rulebook/engine.py` indexes the PDFs with LlamaIndex and wraps each answer in one traced function.
- `rulebook/suite.py` builds an Opik test suite with one item per rule, each with plain-English assertions, and runs it with `opik.run_tests`.
- `main.py` asks three demo questions, then runs the suite.

## See it in Opik

Open the `llamaindex-curling-rulebook-qa` project at http://localhost:5173 (or your own Opik). After one run it holds 12 traces:

- 3 traces named `rulebook_answer`, one per demo question. Open one: under it sits `query`, which contains `retrieve` (with an `embedding` span) and `synthesize` (with `chunking`, `templating`, and an `llm` span). The `retrieve` output shows the three rule excerpts the model was given. The `llm` span has the prompt, the completion, about 950 tokens and a cost near $0.00016.
- 8 traces named `evaluation_task`, one per suite item. Each contains the same retrieval and synthesis tree under `rulebook_answer`, plus the judge's `llm_judge` span.
- 1 `index_construction` trace for building the vector index.

Next open the test suite `curling-rulebook-rules` and its latest run. Each row is a rule id (`B-2.3`, `G-5.2`, `O-5.3` ...). In the verified run, 7 of 8 rules passed. `O-5.3` failed: the answer had the right deadline and deposit, but it did not name the rule, so the global assertion "The answer names the rule it relies on" failed. That is the point of rule-level items: the failing row tells you which part of the rulebook to look at, and the trace behind it shows whether retrieval or the model was at fault.

The judge is an LLM, so a borderline answer can pass in one run and fail in the next (an earlier run of this example failed `G-5.2` before the wording of one assertion was fixed).

## Run it yourself

1. Put `OPENAI_API_KEY` in a `.env` file in this folder or any parent folder (see `.env.example`). Point the Opik SDK at your instance with `opik configure`, or set `OPIK_URL_OVERRIDE` and `OPIK_WORKSPACE` in the same `.env`.
2. `uv sync`
3. `uv run main.py`
4. Open the `llamaindex-curling-rulebook-qa` project in Opik.

The PDFs are generated into `pdfs/` on first run. A full run takes about 1.5 minutes and costs a few cents.

## Poke around

- Change `TOP_K` in `rulebook/settings.py` from 3 to 1 and re-run. See which rule rows start failing.
- Edit a number in `rulebook/corpus.py` (thinking time to 40 minutes), delete `pdfs/`, re-run, and watch the `G-7.2` row fail on the old number.
- Add a rule to the corpus and a matching entry to `RULE_CASES` in `rulebook/suite.py`.
- Open the "sweeping noise" demo trace. No rule covers it, so check that the answer admits that.

## Gotchas we hit

**`ValueError: No files found in .../pdfs.`** The PDFs exist, but `SimpleDirectoryReader(input_dir)` skips any path that has a hidden (dot-prefixed) folder above it, such as `~/.cache/project/pdfs`. Fix: pass the files explicitly, `SimpleDirectoryReader(input_files=[...])`.

## How it's put together

- `main.py`: loads settings, builds the engine, asks demo questions, runs the suite, flushes.
- `rulebook/settings.py`: project name, model, top-k, `.env` loading.
- `rulebook/corpus.py`: the rule text and the PDF generator.
- `rulebook/engine.py`: tracing handler, index and query engine, the traced answer function.
- `rulebook/suite.py`: the rule cases, global assertions, suite creation, run and summary.
- `tests/test_rulebook.py`: offline tests for the corpus, the suite data, the prompt and a traced call with tracking disabled. Run `env -u OPENAI_API_KEY OPIK_TRACK_DISABLE=true uv run pytest`.

---

*built with Opik · inspired by Opik's examples and documentation*
