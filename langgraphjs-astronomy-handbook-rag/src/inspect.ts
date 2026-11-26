import { DATASET_NAME } from "./dataset.js";
import { PROJECT_NAME } from "./env.js";
import { Opik } from "opik";

const client = new Opik({ projectName: PROJECT_NAME });
const traces = await client.searchTraces({ projectName: PROJECT_NAME, truncate: true, maxResults: 1000 });
const graphTraces = traces.filter((t) => t.name === "LangGraph");
const evalTraces = traces.filter((t) => t.name === "evaluation_task");
const experimentTagged = graphTraces.filter((t) => t.tags?.some((tag) => tag.startsWith("experiment:")));
console.log(
  `project ${PROJECT_NAME}: ${traces.length} traces = ${graphTraces.length} graph traces ` +
    `(${experimentTagged.length} tagged by experiment) + ${evalTraces.length} evaluation_task traces`,
);

const sample = graphTraces[0];
if (sample) {
  const spans = await client.searchSpans({ projectName: PROJECT_NAME, filterString: `trace_id = "${sample.id}"` });
  console.log(`sample graph trace spans: ${spans.map((s) => `${s.name}(${s.type})`).join(", ")}`);
}

let llmSpans = 0;
let withUsage = 0;
let withCost = 0;
for (const trace of graphTraces) {
  const spans = await client.searchSpans({ projectName: PROJECT_NAME, filterString: `trace_id = "${trace.id}"` });
  for (const span of spans.filter((s) => s.type === "llm")) {
    llmSpans++;
    if (span.usage?.total_tokens) withUsage++;
    if (span.totalEstimatedCost) withCost++;
  }
}
console.log(`graph llm spans: ${llmSpans}, with token usage: ${withUsage}, with cost: ${withCost}`);

const scores = new Map<string, number[]>();
for (const trace of evalTraces) {
  for (const score of trace.feedbackScores ?? []) scores.set(score.name, [...(scores.get(score.name) ?? []), score.value]);
}
for (const [name, values] of scores) {
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  console.log(`feedback score ${name}: ${values.length} items, mean ${mean.toFixed(4)}`);
}

const dataset = await client.getDataset(DATASET_NAME);
console.log(`dataset ${DATASET_NAME}: ${(await dataset.getItems()).length} items`);
const experiments = await client.api.experiments.findExperiments({ size: 100 });
for (const e of experiments.content ?? []) {
  if (e.name?.startsWith("handbook-rag")) console.log(`experiment ${e.name}: ${e.traceCount} items`);
}
await client.flush();
