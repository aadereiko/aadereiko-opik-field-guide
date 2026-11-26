import os
import pathlib

PROJECT_NAME = "optimizer-instrument-family-classifier"
os.environ["OPIK_PROJECT_NAME"] = PROJECT_NAME

import dotenv

# Load the nearest .env above this folder before any Opik client exists, so the
# repo-level file decides which Opik server receives the run.
dotenv.load_dotenv(dotenv.find_dotenv(usecwd=True))
dotenv.load_dotenv(pathlib.Path(__file__).resolve().parent / ".env")

import opik
from opik_optimizer import ChatPrompt, MetaPromptOptimizer

from instruments import INSTRUMENTS
from scoring import family_accuracy

MODEL = "openai/gpt-4o-mini"
DATASET_NAME = "optimizer-instrument-family-classifier-clues"
LIBRARY_PROMPT_NAME = "instrument-family-classifier"
MAX_TRIALS = 6

BASELINE_SYSTEM = """\
You help staff at a school music shop. Each clue describes one instrument.
Decide which family it belongs to: strings, woodwind, brass or percussion.
Answer in a few words."""


def main() -> None:
    # The client talks to whichever server OPIK_URL_OVERRIDE names; every
    # dataset, trial and prompt version below is created through it.
    client = opik.Opik()

    # Optimizer trials are evaluated against an Opik dataset; identical rows are
    # deduplicated, so re-runs reuse it instead of growing it.
    dataset = client.get_or_create_dataset(
        name=DATASET_NAME,
        description="24 fictional instrument descriptions labeled with their family",
    )
    dataset.insert([{"clue": d, "label": label} for d, label in INSTRUMENTS])

    prompt = ChatPrompt(
        name=LIBRARY_PROMPT_NAME,
        system=BASELINE_SYSTEM,
        user="{clue}",
        model=MODEL,
    )

    # Saving the baseline first makes it version 1 in the Prompts library, so the
    # winner lands as version 2 right next to it.
    client.create_chat_prompt(
        name=LIBRARY_PROMPT_NAME,
        messages=[
            {"role": "system", "content": BASELINE_SYSTEM},
            {"role": "user", "content": "{{clue}}"},
        ],
        change_description="Baseline hand-written prompt (pre-optimization)",
        project_name=PROJECT_NAME,
    )

    # MetaPromptOptimizer asks an LLM to read the failures and propose new
    # prompts. Each trial becomes an experiment, grouped under one optimization run.
    optimizer = MetaPromptOptimizer(model=MODEL, prompts_per_round=3, seed=42, verbose=1)
    result = optimizer.optimize_prompt(
        prompt=prompt,
        dataset=dataset,
        metric=family_accuracy,
        n_samples=len(INSTRUMENTS),
        max_trials=MAX_TRIALS,
        project_name=PROJECT_NAME,
    )

    initial = result.initial_score if result.initial_score is not None else 0.0
    best = result.score
    cost = result.llm_cost_total
    print()
    print(f"baseline accuracy : {initial:.3f}")
    print(f"best accuracy     : {best:.3f}  ({best - initial:+.3f})")
    print(f"trials completed  : {result.details.get('trials_completed')}  (budget: {MAX_TRIALS})")
    print(f"total llm cost    : {'$%.4f' % cost if cost is not None else 'unavailable'}")

    # get_run_link() resolves in whichever project the UI last had open, so the run
    # can look empty. This link names the project explicitly.
    info = client.rest_client.optimizations.get_optimization_by_id(result.optimization_id)
    ui_base = client.config.url_override.rstrip("/").removesuffix("/api")
    print(
        f"optimization run  : {ui_base}/{client.config.workspace}/projects/"
        f"{info.project_id}/optimizations/{result.optimization_id}"
    )

    if best > initial:
        messages = result.prompt.get_messages()
        for message in messages:
            message["content"] = message["content"].replace("{clue}", "{{clue}}")
        # A second create_chat_prompt with changed text becomes version 2 of the same
        # prompt; only a real gain is worth a new version.
        client.create_chat_prompt(
            name=LIBRARY_PROMPT_NAME,
            messages=messages,
            change_description=f"MetaPromptOptimizer winner: accuracy {initial:.3f} -> {best:.3f}",
            project_name=PROJECT_NAME,
        )
        print(f"saved winner as a new version of '{LIBRARY_PROMPT_NAME}'")
        print("\nwinning system prompt:\n")
        print(messages[0]["content"])
    else:
        print("no improvement; the library keeps only the baseline")

    # Flush so queued dataset, trace and prompt writes reach Opik before exit.
    opik.flush_tracker()


if __name__ == "__main__":
    main()
