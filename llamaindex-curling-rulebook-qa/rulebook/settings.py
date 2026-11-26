import os
import pathlib

import dotenv

PROJECT_NAME = "llamaindex-curling-rulebook-qa"
PDF_DIR = pathlib.Path(__file__).resolve().parent.parent / "pdfs"
MODEL = "gpt-4o-mini"
TOP_K = 3


def configure_environment() -> None:
    # The Opik project is read from this variable when the first trace is created,
    # so it must be set before the handler is installed or traces go to "Default Project".
    os.environ["OPIK_PROJECT_NAME"] = PROJECT_NAME
    dotenv.load_dotenv(dotenv.find_dotenv(usecwd=True))
