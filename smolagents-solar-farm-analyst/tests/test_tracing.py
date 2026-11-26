import os

os.environ["OPIK_TRACK_DISABLE"] = "true"

import main
import tracing


def test_endpoint_points_at_local_opik_without_auth_header():
    env = {"OPIK_URL_OVERRIDE": "http://localhost:5173/api/", "OPIK_WORKSPACE": "default"}
    endpoint, headers = tracing.otlp_endpoint_and_headers(env)
    assert endpoint == "http://localhost:5173/api/v1/private/otel"
    assert headers == "Comet-Workspace=default,projectName=smolagents-solar-farm-analyst"


def test_api_key_becomes_authorization_header():
    _, headers = tracing.otlp_endpoint_and_headers({"OPIK_API_KEY": "k"})
    assert headers.startswith("Authorization=k,")


def test_agent_builds_with_a_stub_key_and_pandas_allowed(monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "stub")
    agent = main.build_agent()
    assert "pandas" in agent.additional_authorized_imports


def test_traced_agent_run_works_with_tracking_disabled_and_a_stub_model():
    from opentelemetry.sdk.trace.export.in_memory_span_exporter import InMemorySpanExporter
    from openinference.instrumentation.smolagents import SmolagentsInstrumentor
    from smolagents import ChatMessage, CodeAgent, Model

    class StubModel(Model):
        def generate(self, messages, **kwargs):
            return ChatMessage(
                role="assistant",
                content='Thought: done\n<code>\nfinal_answer("B2")\n</code>',
            )

    exporter = InMemorySpanExporter()
    tracing.setup_tracing(exporter)
    try:
        answer = CodeAgent(tools=[], model=StubModel(model_id="stub")).run("which array?")
    finally:
        SmolagentsInstrumentor().uninstrument()
    assert answer == "B2"
    assert any(s.name == "CodeAgent.run" for s in exporter.get_finished_spans())
