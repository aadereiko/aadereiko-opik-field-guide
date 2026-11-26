import os
from pathlib import Path

from dotenv import find_dotenv, load_dotenv

PROJECT_NAME = "openai-vision-nutrition-labels"
MODEL = "gpt-4o-mini"
ROOT = Path(__file__).resolve().parent.parent
LABELS_DIR = ROOT / "labels"


def load_env() -> None:
    load_dotenv(find_dotenv(usecwd=True))
    load_dotenv(ROOT / ".env")
    os.environ.pop("OPENAI_BASE_URL", None)
    # Opik reads this variable when it creates traces, so every trace lands in one project.
    os.environ["OPIK_PROJECT_NAME"] = PROJECT_NAME
