import json
from types import SimpleNamespace

from nutrilabel import extract
from nutrilabel.catalog import BY_SLUG
from nutrilabel.render import generate_all, path_for
from nutrilabel.suite import EXPECTED_TEXT, build_items


class FakeClient:
    def __init__(self, payload):
        self.calls = []
        message = SimpleNamespace(content=json.dumps(payload))
        self.chat = SimpleNamespace(completions=SimpleNamespace(create=self._create))
        self._response = SimpleNamespace(choices=[SimpleNamespace(message=message)])

    def _create(self, **kwargs):
        self.calls.append(kwargs)
        return self._response


def test_traced_extract_runs_with_tracking_disabled(tmp_path, monkeypatch):
    generate_all(tmp_path)
    truth = BY_SLUG["granola"].truth
    fake = FakeClient(truth.model_dump())
    monkeypatch.setattr(extract, "get_client", lambda: fake)

    facts = extract.extract_facts(path_for("granola", tmp_path))

    assert facts == truth
    content = fake.calls[0]["messages"][1]["content"]
    assert content[1]["image_url"]["url"].startswith("data:image/png;base64,")
    assert fake.calls[0]["response_format"]["json_schema"]["strict"] is True


def test_every_sample_has_assertions_in_the_suite():
    items = build_items()
    assert {i["data"]["label"] for i in items} == set(EXPECTED_TEXT)
    assert all(len(i["assertions"]) >= 2 for i in items)
