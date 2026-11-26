<div align="center">

# Facts Panel, Meet Trace

**`openai-vision-nutrition-labels`**

*Typed nutrition numbers from label pictures, with the picture saved next to every answer.*

![Python](https://img.shields.io/badge/python-3.12%2B-3776AB?style=flat&logo=python&logoColor=white)
![OpenAI](https://img.shields.io/badge/model-gpt--4o--mini-412991?style=flat&logo=openai&logoColor=white)
[![Opik](https://img.shields.io/badge/Opik-2.3.4-2f54eb?style=flat)](https://github.com/comet-ml/opik)
[![uv](https://img.shields.io/badge/setup-uv-DE5FE9?style=flat&logo=uv&logoColor=white)](https://docs.astral.sh/uv/)

</div>

---

When a vision model says a granola serving has 12 g of sugar, the number alone tells you nothing. You need the label it looked at. A base64 string in a span input does not help, and a file path on someone else's laptop does not either. This example reads nutrition-facts panels with `gpt-4o-mini`, returns a typed result (a pydantic model), and puts the exact PNG on the Opik trace. A small test suite then checks every reading against the values printed on the label.

## What you'll build

A Python package called `nutrilabel` with a CLI of the same name.

- `nutrilabel generate` draws six fictional labels with Pillow. Each one is a different layout on purpose: a classic panel with a %DV column, a panel that says "about 6 servings", a two-column panel (per serving and per container) where the model must pick the right column, a tilted and blurry "phone photo", a horizontal grid with no %DV column, and a near-zero cold brew label.
- `nutrilabel extract granola` reads one label and prints nine typed fields: product name, serving size, servings per container, calories, fat, sodium, carbs, sugars, protein.
- `nutrilabel run` reads all six labels as an Opik test suite. An LLM judge grades each reading against plain-language assertions that hold the expected values.

Each reading also gets a local sanity check (`macro_consistency`): calories must be within 25% of 4 x carbs + 4 x protein + 9 x fat, and sugars cannot exceed carbs. The result is stored on the trace as a feedback score.

## See it in Opik

Open the `openai-vision-nutrition-labels` project at `http://localhost:5173` (workspace `default`) after `nutrilabel run`. You will see 6 traces, all named `evaluation_task`. That is the wrapper `run_tests` creates for each suite item. Open one, for example the `granola.png` trace:

- The span tree has `extraction_task`, then `extract_nutrition_label` (type `general`, the `@opik.track` function), then `chat_completion_create` (type `llm`). Next to them sit the judge spans (`llm_judge`, `metrics_calculation`, and a `completion` llm span for the judge call).
- The `chat_completion_create` span has about 25.9k prompt tokens and a cost near $0.0024 for a 520x640 label. The wide 760x330 oat-drink label is cheaper at about 14.6k tokens. Image size drives cost.
- The Attachments tab holds `granola.png`, the exact image the model saw. Metadata shows `label_file: granola.png`.
- In the traces table the feedback column `macro_consistency` is 1.0 for all six.

Under Test suites you will find `openai-vision-nutrition-labels` with six items and three global assertions. The experiment `label-reader-gpt-4o-mini` has one row per label. In the verified run all six passed (6/6). The model read every number correctly, including the per-serving column of the two-column label and the tilted photo. It returned product names in capitals, exactly as printed, and the assertions say "any capitalisation". Judge runs can vary, so your pass rate may differ.

The earlier version of this suite did fail, but for a different reason than you might expect. See the first gotcha below.

## Run it yourself

1. Put `OPENAI_API_KEY` in the repo-root `.env` (see `.env.example` for the Opik lines). The app walks up from the current folder to find it.
2. `uv sync`
3. `uv run nutrilabel generate`
4. `uv run nutrilabel extract granola`
5. `uv run nutrilabel run`
6. Open the project and the test suite as described above.

Offline tests, no keys needed:

```
env -u OPENAI_API_KEY OPIK_TRACK_DISABLE=true uv run pytest
```

`OPIK_TRACK_DISABLE=true` turns Opik tracking into a no-op, so tests never talk to a server.

## Poke around

- Change `"detail": "high"` to `"low"` in `nutrilabel/extract.py` and run again. The prompt tokens drop sharply. See which labels start to fail, probably the tilted one first.
- Make the photo label meaner: raise the blur or the rotation in `photo()` in `nutrilabel/render.py`, then `uv run nutrilabel generate --force`.
- Add a seventh product to `nutrilabel/catalog.py` and its expected text to `EXPECTED_TEXT` in `nutrilabel/suite.py`. Tests will tell you if you forgot.
- Filter the traces table by `macro_consistency = 0` after you break a number in a label on purpose.

## Gotchas we hit

**An assertion fails although every number is right.** Symptom: granola and almond-cups failed in the first run with judge reasons like "product name may not be verifiably read from the label". The assertion said "values are read from the label, never invented". Cause: the judge only sees the task's text output, not the image, so it cannot check where a value came from. Fix: only write assertions the output can prove, such as "the product name is a real name, not a placeholder", and put the expected values in the per-item assertions.

**You edited an assertion and nothing changed.** Symptom: the old assertion text still appears in the judge reasons. Cause: `get_or_create_test_suite` returns the saved suite and ignores new global assertions. Fix: delete the suite first, with its project: `client.delete_test_suite("openai-vision-nutrition-labels", project_name="openai-vision-nutrition-labels")`. Without `project_name` the call returns `404 Dataset not found`. Delete the old experiment too if you want a clean comparison.

## How it's put together

- `nutrilabel/config.py`: project name, model, and `.env` loading (done before any Opik client exists).
- `nutrilabel/schema.py`: the pydantic result model, the strict JSON schema sent to the API, the macro sanity check.
- `nutrilabel/catalog.py`: the six fictional products and their true values.
- `nutrilabel/render.py`: draws the label PNGs into `labels/` (git-ignored, regenerated when missing).
- `nutrilabel/extract.py`: the traced vision call, the image attachment, the feedback score.
- `nutrilabel/suite.py`: the test suite items, assertions and `run_suite`.
- `nutrilabel/cli.py`: the `generate`, `extract` and `run` commands.
- `tests/`: offline tests for the schema, renderer, a stubbed extraction call with tracking disabled, and suite coverage.

---

*built with Opik · inspired by Opik's examples and documentation*
