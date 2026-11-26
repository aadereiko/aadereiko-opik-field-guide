import asyncio

from fastapi.testclient import TestClient

from coach.app import app
from coach.chat import histories, stream_reply
from coach.prompts import MAX_HISTORY_MESSAGES, SYSTEM_PROMPT, build_messages
from coach.rule import JUDGE_PROMPT, RULE_NAME, rule_request


def test_build_messages_puts_system_first_and_user_last():
    messages = build_messages([], "How do I blur the background?")
    assert messages[0] == {"role": "system", "content": SYSTEM_PROMPT}
    assert messages[-1] == {"role": "user", "content": "How do I blur the background?"}


def test_build_messages_trims_old_history():
    history = [{"role": "user", "content": str(i)} for i in range(40)]
    messages = build_messages(history, "latest")
    assert len(messages) == MAX_HISTORY_MESSAGES + 2
    assert messages[1]["content"] == str(40 - MAX_HISTORY_MESSAGES)


def test_traced_stream_reply_runs_with_tracking_disabled(fake_client):
    async def collect():
        return [piece async for piece in stream_reply("c1", "Which aperture at sunset?")]

    pieces = asyncio.run(collect())
    assert "".join(pieces) == "Try f/8 at sunset."
    assert histories["c1"][-1] == {"role": "assistant", "content": "Try f/8 at sunset."}


def test_chat_endpoint_streams_and_keeps_history(fake_client):
    http = TestClient(app)
    first = http.post("/chat", json={"conversation_id": "c2", "message": "hi"})
    assert first.text == "Try f/8 at sunset."
    http.post("/chat", json={"conversation_id": "c2", "message": "and ISO?"})
    sent = fake_client.calls[-1]["messages"]
    assert [m["role"] for m in sent] == ["system", "user", "assistant", "user"]
    assert fake_client.calls[-1]["stream"] is True


def test_rule_request_maps_trace_fields_to_judge_variables():
    request = rule_request("project-123")
    assert request.name == RULE_NAME
    assert request.project_ids == ["project-123"]
    assert request.code.variables == {"question": "input.message", "answer": "output.reply"}
    assert "{{question}}" in JUDGE_PROMPT and "{{answer}}" in JUDGE_PROMPT
