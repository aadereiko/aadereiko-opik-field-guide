import { Mastra } from "@mastra/core/mastra";
import { Observability } from "@mastra/observability";
import { OtelExporter } from "@mastra/otel-exporter";
import { bankingAgent } from "./agent.ts";

const PROJECT = "mastra-banking-agent";
const opikBase = (process.env.OPIK_URL_OVERRIDE ?? "https://www.comet.com/opik/api").replace(/\/+$/, "");

const headers: Record<string, string> = {
  "Comet-Workspace": process.env.OPIK_WORKSPACE ?? "default",
  projectName: PROJECT,
};
// Self-hosted Opik needs no Authorization header; Opik Cloud does.
if (process.env.OPIK_API_KEY) headers.Authorization = process.env.OPIK_API_KEY;

export const mastra = new Mastra({
  agents: { bankingAgent },
  observability: new Observability({
    configs: {
      default: {
        serviceName: PROJECT,
        // Mastra records agent runs, LLM calls and tool runs as OTel spans; this exporter posts them to
        // Opik's OTLP endpoint. The projectName header picks the Opik project the traces land in.
        // Protobuf, because Opik rejects OTLP JSON with 400; traces only, because Opik has no OTLP logs endpoint.
        exporters: [
          new OtelExporter({
            provider: {
              custom: { endpoints: { traces: `${opikBase}/v1/private/otel/v1/traces` }, protocol: "http/protobuf", headers },
            },
          }),
        ],
      },
    },
  }),
});
