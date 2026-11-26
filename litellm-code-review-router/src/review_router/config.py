import os
from pathlib import Path

from dotenv import find_dotenv, load_dotenv

PROJECT_NAME = "litellm-code-review-router"

MODELS = [
    "openai/gpt-4o-mini",
    "openai/gpt-4.1-mini",
    "openai/gpt-4.1",
]

DIFFS_DIR = Path(__file__).resolve().parents[2] / "data" / "diffs"


def load_environment() -> None:
    load_dotenv(find_dotenv(usecwd=True))
    os.environ["OPIK_PROJECT_NAME"] = PROJECT_NAME
