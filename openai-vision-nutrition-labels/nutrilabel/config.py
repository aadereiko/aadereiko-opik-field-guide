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
