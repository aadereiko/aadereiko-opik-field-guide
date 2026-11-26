import { NodeSDK } from "@opentelemetry/sdk-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import type { ReadableSpan } from "@opentelemetry/sdk-trace-base";
import type { ExportResult } from "@opentelemetry/core";
import { MODEL_NAME } from "./model.ts";
import { BeeAIInstrumentation } from "@arizeai/openinference-instrumentation-beeai";
import * as beeaiFramework from "beeai-framework";

export const PROJECT_NAME = "beeai-aquarium-care-agent";

const opikApiBase = (process.env.OPIK_URL_OVERRIDE ?? "https://www.comet.com/opik/api").replace(/\/+$/, "");

// Opik Cloud needs an API key; a self-hosted Opik takes the same request with no Authorization header.
const headers: Record<string, string> = {
  "Comet-Workspace": process.env.OPIK_WORKSPACE ?? "default",
  projectName: PROJECT_NAME,
};
if (process.env.OPIK_API_KEY) headers.Authorization = process.env.OPIK_API_KEY;

const beeAIInstrumentation = new BeeAIInstrumentation();

// The BeeAI "success" LLM spans carry token counts but neither provider nor model, and Opik only prices
// tokens when it has both. Stamping them on every LLM span is what makes total_estimated_cost non-null.
class ProviderTaggingExporter extends OTLPTraceExporter {
  override export(spans: ReadableSpan[], done: (result: ExportResult) => void): void {
    for (const span of spans) {
      if (span.attributes["openinference.span.kind"] === "LLM") {
        const attributes = span.attributes as Record<string, unknown>;
        attributes["gen_ai.system"] = "openai";
        attributes["llm.provider"] = "openai";
        attributes["llm.model_name"] ??= MODEL_NAME;
        attributes["gen_ai.request.model"] ??= MODEL_NAME;
      }
    }
    super.export(spans, done);
  }
}

// The OTLP exporter sends spans to Opik's OpenTelemetry endpoint; the project comes from the projectName header.
const sdk = new NodeSDK({
  traceExporter: new ProviderTaggingExporter({
    url: `${opikApiBase}/v1/private/otel/v1/traces`,
    headers,
  }),
  instrumentations: [beeAIInstrumentation],
});
sdk.start();

// tsx imports beeai-framework before the instrumentation's module hook runs, so without this call no spans are emitted.
beeAIInstrumentation.manuallyInstrument(beeaiFramework);

// Flushes the batch exporter; without it the process exits before the last spans reach Opik.
export async function shutdownTracing(): Promise<void> {
  await sdk.shutdown();
}
