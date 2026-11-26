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


def setup_tracing():
    from openinference.instrumentation.smolagents import SmolagentsInstrumentor
    from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
    from opentelemetry.sdk.trace import TracerProvider
    from opentelemetry.sdk.trace.export import SimpleSpanProcessor

    endpoint, headers = otlp_endpoint_and_headers(dict(os.environ))
    os.environ["OTEL_EXPORTER_OTLP_ENDPOINT"] = endpoint.removesuffix("/v1/traces")
    os.environ["OTEL_EXPORTER_OTLP_HEADERS"] = headers

    provider = TracerProvider()
    # Opik's OTLP endpoint receives these spans; the project comes from the projectName header, so every trace lands in one named project.
    provider.add_span_processor(SimpleSpanProcessor(OTLPSpanExporter()))
    # The instrumentor turns each agent run into a trace and each step, model call and tool/code execution into a span, with the generated code and logs as attributes.
    SmolagentsInstrumentor().instrument(tracer_provider=provider)
    return provider
