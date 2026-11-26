import os

PROJECT_NAME = "smolagents-solar-farm-analyst"
DEFAULT_OPIK_URL = "https://www.comet.com/opik/api/"


def otlp_endpoint_and_headers(env: dict[str, str]) -> tuple[str, str]:
    base = env.get("OPIK_URL_OVERRIDE", DEFAULT_OPIK_URL).rstrip("/")
    headers = [
        f"Comet-Workspace={env.get('OPIK_WORKSPACE', 'default')}",
        f"projectName={PROJECT_NAME}",
    ]
    if env.get("OPIK_API_KEY"):
        headers.insert(0, f"Authorization={env['OPIK_API_KEY']}")
    return f"{base}/v1/private/otel", ",".join(headers)


# The OpenInference spans carry the model name but no provider, so Opik cannot price them. This wrapper adds gen_ai.system on LLM spans at export time, which is what turns token usage into total_estimated_cost.
class ProviderTaggingExporter:
    def __init__(self, inner):
        self._inner = inner

    def export(self, spans):
        return self._inner.export([tag_provider(s) for s in spans])

    def shutdown(self):
        self._inner.shutdown()

    def force_flush(self, timeout_millis=30000):
        return self._inner.force_flush(timeout_millis)


def tag_provider(span):
    from opentelemetry.sdk.trace import ReadableSpan

    attrs = dict(span.attributes or {})
    if "llm.model_name" not in attrs or "gen_ai.system" in attrs:
        return span
    attrs["gen_ai.system"] = "openai"
    return ReadableSpan(
        name=span.name,
        context=span.context,
        parent=span.parent,
        resource=span.resource,
        attributes=attrs,
        events=span.events,
        links=span.links,
        kind=span.kind,
        status=span.status,
        start_time=span.start_time,
        end_time=span.end_time,
        instrumentation_scope=span.instrumentation_scope,
    )


def setup_tracing(exporter=None):
    from openinference.instrumentation.smolagents import SmolagentsInstrumentor
    from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
    from opentelemetry.sdk.trace import TracerProvider
    from opentelemetry.sdk.trace.export import SimpleSpanProcessor

    endpoint, headers = otlp_endpoint_and_headers(dict(os.environ))
    os.environ["OTEL_EXPORTER_OTLP_ENDPOINT"] = endpoint.removesuffix("/v1/traces")
    os.environ["OTEL_EXPORTER_OTLP_HEADERS"] = headers

    provider = TracerProvider()
    # Opik's OTLP endpoint receives these spans; the project comes from the projectName header, so every trace lands in one named project.
    provider.add_span_processor(SimpleSpanProcessor(ProviderTaggingExporter(exporter or OTLPSpanExporter())))
    # The instrumentor turns each agent run into a trace and each step, model call and tool/code execution into a span, with the generated code and logs as attributes.
    SmolagentsInstrumentor().instrument(tracer_provider=provider)
    return provider
