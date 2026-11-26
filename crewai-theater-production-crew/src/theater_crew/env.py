from pathlib import Path

from dotenv import find_dotenv, load_dotenv


def load_env() -> None:
    found = find_dotenv(usecwd=True) or find_dotenv(filename=".env", raise_error_if_not_found=False)
    if not found:
        here = Path(__file__).resolve()
        for parent in here.parents:
            if (parent / ".env").exists():
                found = str(parent / ".env")
                break
    if found:
        load_dotenv(found)
