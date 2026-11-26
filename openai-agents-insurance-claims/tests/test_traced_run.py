import os

os.environ["OPIK_TRACK_DISABLE"] = "true"

from agents import Agent, Runner, trace
from agents.items import ModelResponse
from agents.models.interface import Model
from agents.usage import Usage
from openai.types.responses import ResponseOutputMessage, ResponseOutputText

import main


class StubModel(Model):
    async def get_response(self, *args, **kwargs):
        message = ResponseOutputMessage(
            id="msg_1",
            type="message",
            role="assistant",
            status="completed",
            content=[ResponseOutputText(type="output_text", text="stub reply", annotations=[])],
        )
        return ModelResponse(output=[message], usage=Usage(), response_id=None)

    def stream_response(self, *args, **kwargs):
        raise NotImplementedError


def test_run_inside_trace_with_opik_processor_and_tracking_disabled():
    agent = Agent(name="Stub", instructions="x", model=StubModel())
    with trace(workflow_name="Claim intake", group_id="thread-1"):
        result = Runner.run_sync(agent, "hello")
    assert result.final_output == "stub reply"


def test_agents_are_wired_for_handoffs():
    names = {a.name for a in main.triage_agent.handoffs}
    assert names == {"Home Claims Agent", "Auto Claims Agent"}


def test_every_demo_conversation_names_a_policy_in_its_first_turn():
    for turns in main.DEMO_CONVERSATIONS.values():
        assert "HO-" in turns[0] or "AU-" in turns[0]
