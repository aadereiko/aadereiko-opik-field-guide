import { VoltAgentObservability } from "@voltagent/core";
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-base";
import type { ReadableSpan, SpanExporter } from "@opentelemetry/sdk-trace-base";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";

export const PROJECT_NAME = "voltagent-hair-salon-assistant";

type Attributes = Record<string, unknown>;

// VoltAgent writes llm.model / llm.usage.* / input, which Opik's OTel ingestion does not read.
// Opik reads gen_ai.*: without the copies the spans still arrive, but with no usage, no cost and no tool typing.
export function mapVoltAgentAttributes(attrs: Attributes): void {
  if (attrs["span.type"] === "llm") {
    if (attrs["llm.model"]) attrs["gen_ai.request.model"] = attrs["llm.model"];
    // Opik prices a span only when it knows the provider; VoltAgent never sets one.
    attrs["gen_ai.provider.name"] = "openai";
    for (const key of ["prompt_tokens", "completion_tokens", "total_tokens"]) {
      const value = attrs[`llm.usage.${key}`];
      if (value !== undefined) attrs[`gen_ai.usage.${key}`] = value;
    }
  } else if (attrs["span.type"] === "tool") {
    // gen_ai.tool.call.arguments is what makes Opik type the span "tool" and show the arguments as its input.
    attrs["gen_ai.tool.call.arguments"] = attrs["input"] ?? "{}";
    delete attrs["input"];
    delete attrs["tool.parameters"];
  }
}

class GenAIAttributeMapper implements SpanExporter {
  constructor(private readonly inner: SpanExporter) {}

  export(spans: ReadableSpan[], done: Parameters<SpanExporter["export"]>[1]): void {
    // The mapping runs here, on the finished spans, so no agent or tool code needs to know about Opik.
    for (const span of spans) mapVoltAgentAttributes(span.attributes as Attributes);
    this.inner.export(spans, done);
  }

  shutdown(): Promise<void> {
    return this.inner.shutdown();
  }

  forceFlush(): Promise<void> {
    return this.inner.forceFlush?.() ?? Promise.resolve();
  }
}

export function createObservability() {
  const base = (process.env.OPIK_URL_OVERRIDE ?? "http://localhost:5173/api/").replace(/\/+$/, "");
  const otlp = new OTLPTraceExporter({
    url: `${base}/v1/private/otel/v1/traces`,
    headers: {
      "Comet-Workspace": process.env.OPIK_WORKSPACE ?? "default",
      // projectName header decides which Opik project the traces land in.
      projectName: process.env.OPIK_PROJECT_NAME ?? PROJECT_NAME,
      ...(process.env.OPIK_API_KEY ? { Authorization: process.env.OPIK_API_KEY } : {}),
    },
  });
  const exporter = process.env.SKIP_GENAI_MAPPING ? otlp : new GenAIAttributeMapper(otlp);
  // The batch processor ships finished spans to Opik in groups; observability.shutdown() must run before exit or the last spans are lost.
  return new VoltAgentObservability({
    serviceName: PROJECT_NAME,
    spanProcessors: [new BatchSpanProcessor(exporter)],
  });
}
