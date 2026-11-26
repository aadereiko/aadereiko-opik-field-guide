from dotenv import find_dotenv, load_dotenv

load_dotenv(find_dotenv(usecwd=True))

import opik  # noqa: E402

from coach.rule import RULE_NAME, ensure_rule  # noqa: E402

PROJECT = "openai-fastapi-photography-coach"

if __name__ == "__main__":
    client = opik.Opik(project_name=PROJECT)
    rule_id = ensure_rule(client, PROJECT)
    print(f"online rule '{RULE_NAME}' ready on project '{PROJECT}' ({rule_id})")
