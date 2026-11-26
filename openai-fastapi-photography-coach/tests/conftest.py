import pytest


class FakeChunk:
    def __init__(self, text):
        delta = type("Delta", (), {"content": text})()
        self.choices = [type("Choice", (), {"delta": delta})()]


class FakeStream:
    def __init__(self, pieces):
        self.pieces = pieces

    def __aiter__(self):
        return self._iterate()

    async def _iterate(self):
        for piece in self.pieces:
            yield FakeChunk(piece)


class FakeClient:
    def __init__(self, pieces):
        self.calls = []
        completions = type("Completions", (), {"create": self._create})()
        self.chat = type("Chat", (), {"completions": completions})()
        self.pieces = pieces

    async def _create(self, **kwargs):
        self.calls.append(kwargs)
        return FakeStream(self.pieces)


@pytest.fixture
def fake_client(monkeypatch):
    from coach import chat

    client = FakeClient(["Try ", "f/8 ", "at sunset."])
    monkeypatch.setattr(chat, "get_client", lambda: client)
    chat.histories.clear()
    return client
