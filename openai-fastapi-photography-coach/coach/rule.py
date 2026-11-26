import opik
from opik.rest_api.types.automation_rule_evaluator_update import (
    AutomationRuleEvaluatorUpdate_LlmAsJudge,
)
from opik.rest_api.types.automation_rule_evaluator_write import (
    AutomationRuleEvaluatorWrite_LlmAsJudge,
)
from opik.rest_api.types.llm_as_judge_code_write import LlmAsJudgeCodeWrite
from opik.rest_api.types.llm_as_judge_message_write import LlmAsJudgeMessageWrite
from opik.rest_api.types.llm_as_judge_model_parameters_write import (
    LlmAsJudgeModelParametersWrite,
)
from opik.rest_api.types.llm_as_judge_output_schema_write import (
    LlmAsJudgeOutputSchemaWrite,
)

RULE_NAME = "on_topic_coaching"
SCORE_NAME = "on_topic_coaching"
JUDGE_MODEL = "gpt-4o-mini"

JUDGE_PROMPT = """You grade a photography coach chatbot.
User message:
{{question}}

Coach reply:
{{answer}}

Score 1 if the reply gives photography advice that fits the question, or politely declines
a non-photography request and points back to photography. Score 0 if it answers an
off-topic request, ignores the question, or gives advice that has nothing to do with it."""


def rule_request(project_id: str) -> AutomationRuleEvaluatorWrite_LlmAsJudge:
    return AutomationRuleEvaluatorWrite_LlmAsJudge(
        name=RULE_NAME,
        project_ids=[project_id],
        sampling_rate=1.0,
        enabled=True,
        action="evaluator",
        code=LlmAsJudgeCodeWrite(
            model=LlmAsJudgeModelParametersWrite(name=JUDGE_MODEL, temperature=0.0),
            messages=[LlmAsJudgeMessageWrite(role="USER", content=JUDGE_PROMPT)],
            variables={"question": "input.message", "answer": "output.reply"},
            schema_=[
                LlmAsJudgeOutputSchemaWrite(
                    name=SCORE_NAME,
                    type="INTEGER",
                    description="1 if the reply is on-topic photography coaching, else 0",
                )
            ],
        ),
    )


def ensure_rule(client: opik.Opik, project_name: str) -> str:
    rules = client.rest_client.automation_rule_evaluators
    # The rule belongs to a project, so the project has to exist before the first trace arrives.
    try:
        project = client.rest_client.projects.retrieve_project(name=project_name)
    except Exception:
        client.rest_client.projects.create_project(name=project_name)
        project = client.rest_client.projects.retrieve_project(name=project_name)
    request = rule_request(project.id)
    # Reuse a rule with the same name so re-runs update it instead of piling up duplicates.
    existing = rules.find_evaluators(project_id=project.id, name=RULE_NAME, size=50).content
    match = next((r for r in existing if r.name == RULE_NAME), None)
    if match is None:
        rules.create_automation_rule_evaluator(request=request)
        match = next(
            r for r in rules.find_evaluators(project_id=project.id, name=RULE_NAME, size=50).content
        )
    else:
        rules.update_automation_rule_evaluator(match.id, request=_as_update(request))
    return match.id


def _as_update(request: AutomationRuleEvaluatorWrite_LlmAsJudge) -> AutomationRuleEvaluatorUpdate_LlmAsJudge:
    return AutomationRuleEvaluatorUpdate_LlmAsJudge(
        **request.model_dump(by_alias=True, exclude_none=True)
    )
