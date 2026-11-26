import os

from dotenv import find_dotenv, load_dotenv

from harbor_tide_qa import PROJECT_NAME


def load_environment() -> None:
    load_dotenv(find_dotenv(usecwd=True))
    # find_dotenv(usecwd=True) walks up from the working directory, so a repo-root
    # .env is found too. Opik reads OPIK_PROJECT_NAME when the first trace is
    # created, so this must run before any Opik client or callback exists.
    os.environ["OPIK_PROJECT_NAME"] = PROJECT_NAME
