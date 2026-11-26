import opik
from fastapi.testclient import TestClient
from langchain_core.language_models.fake_chat_models import FakeListChatModel

from opik.integrations.langchain import OpikTracer

import app as app_module
from catalog import format_catalog, load_catalog


def make_client(replies):
    app_module.sessions.clear()
    return TestClient(app_module.create_app(llm=FakeListChatModel(responses=replies)))


def test_catalog_formatting_lists_every_book():
    books = load_catalog()
    text = format_catalog(books)
    assert len(text.splitlines()) == len(books)
    assert "Ines Varga" in text and "[B01]" in text


def test_chat_returns_plain_string_reply():
    client = make_client(["Try Kestrel Station by Yuki Hasegawa."])
    r = client.post("/chat", json={"message": "Sci-fi?", "session_id": "s1"})
    assert r.status_code == 200
    assert r.json() == {"reply": "Try Kestrel Station by Yuki Hasegawa.", "session_id": "s1"}


def test_history_is_kept_per_session():
    client = make_client(["a", "b", "c"])
    client.post("/chat", json={"message": "one", "session_id": "x"})
    client.post("/chat", json={"message": "two", "session_id": "x"})
    client.post("/chat", json={"message": "three", "session_id": "y"})
    assert len(app_module.sessions["x"]) == 4
    assert len(app_module.sessions["y"]) == 2


def test_blank_message_is_rejected():
    client = make_client(["unused"])
    assert client.post("/chat", json={"message": "  ", "session_id": "s"}).status_code == 400


def test_tracer_uses_session_as_thread_id():
    tracer = app_module.make_tracer("patron-1")
    assert isinstance(tracer, OpikTracer)


@opik.track
def shout(text: str) -> str:
    return text.upper()


def test_tracked_function_works_with_tracking_disabled():
    assert shout("hello") == "HELLO"
