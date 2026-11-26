import { PROJECT_NAME } from "./env.js";
import { Opik } from "opik";

interface SpanRow {
  name?: string;
  type?: string;
  parentSpanId?: string;
  id: string;
  totalEstimatedCost?: number;
  usage?: Record<string, number>;
}

async function main() {
  const client = new Opik({ projectName: PROJECT_NAME });
  const traces = await client.searchTraces({ projectName: PROJECT_NAME, maxResults: 50 });
  console.log(`project=${PROJECT_NAME} traces=${traces.length}`);
  for (const trace of traces) {
    const traceId = trace.id;
    const spans = (await client.searchSpans({
      projectName: PROJECT_NAME,
      // The traceId option is ignored by searchSpans in 2.3.4, so filter by query string.
      filterString: `trace_id = "${traceId}"`,
      maxResults: 200,
    })) as unknown as SpanRow[];
    console.log(`trace ${traceId} name=${trace.name} spans=${spans.length}`);
    const byId = new Map(spans.map((s) => [s.id, s]));
    const agentOf = (span: SpanRow): string => {
      let cur: SpanRow | undefined = span;
      const chain: string[] = [];
      while (cur) {
        chain.push(cur.name ?? "?");
        cur = cur.parentSpanId ? byId.get(cur.parentSpanId) : undefined;
      }
      return ["planner", "researcher", "writer"].find((n) => chain.includes(n)) ?? "other";
    };
    const perAgent = new Map<string, { llmSpans: number; tokens: number; cost: number }>();
    for (const span of spans) {
      console.log(
        `  ${span.type ?? "?"}\t${span.name}\ttokens=${span.usage?.total_tokens ?? "-"}\tcost=${span.totalEstimatedCost ?? "-"}`,
      );
      // Only the ChatOpenAI spans (type llm) carry usage and cost; node spans are general.
      if (span.type !== "llm") continue;
      const row = perAgent.get(agentOf(span)) ?? { llmSpans: 0, tokens: 0, cost: 0 };
      row.llmSpans += 1;
      row.tokens += span.usage?.total_tokens ?? 0;
      row.cost += span.totalEstimatedCost ?? 0;
      perAgent.set(agentOf(span), row);
    }
    for (const [agent, row] of perAgent) {
      console.log(`  agent=${agent} llm_spans=${row.llmSpans} tokens=${row.tokens} cost=$${row.cost.toFixed(6)}`);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
