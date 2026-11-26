import { loadNearestEnv } from "./env.js";

loadNearestEnv();

const { createOpik, PROJECT_NAME } = await import("./tracing.js");
const { PROMPT_NAME } = await import("./prompts.js");

// Reads back what the demo logged: prompt versions, traces and spans by type, usage and cost, and the suite runs.
const opik = createOpik();

const prompt = await opik.getPrompt({ name: PROMPT_NAME, projectName: PROJECT_NAME });
const versions = prompt ? await prompt.getVersions() : [];
console.log(`prompt ${PROMPT_NAME}: ${versions.length} versions`);
for (const version of versions) console.log(`  ${version.getVersionInfo()}`);

const traces = await opik.searchTraces({ projectName: PROJECT_NAME, maxResults: 200 });
console.log(`traces in ${PROJECT_NAME}: ${traces.length}`);
const byName = new Map<string, number>();
for (const trace of traces) byName.set(trace.name ?? "?", (byName.get(trace.name ?? "?") ?? 0) + 1);
console.log("  by name:", Object.fromEntries(byName));

const spans = await opik.searchSpans({ projectName: PROJECT_NAME, maxResults: 500 });
const shape = new Map<string, number>();
for (const span of spans) {
  const key = `${span.name}/${span.type}`;
  shape.set(key, (shape.get(key) ?? 0) + 1);
}
console.log(`spans: ${spans.length}`, Object.fromEntries(shape));
const llm = spans.filter((span) => span.type === "llm");
const withCost = llm.filter((span) => (span.totalEstimatedCost ?? 0) > 0);
const withUsage = llm.filter((span) => (span.usage?.total_tokens ?? 0) > 0);
console.log(`llm spans: ${llm.length}, with usage: ${withUsage.length}, with cost: ${withCost.length}`);
const sampleSpan = spans.find((span) => span.name === "teacher-feedback");
console.log("sample teacher-feedback metadata:", JSON.stringify(sampleSpan?.metadata));

const experiments = await opik.getTestSuiteExperiments("science-fair-feedback-suite", 20, PROJECT_NAME);
for (const experiment of experiments) {
  const items = await experiment.getItems();
  console.log(`experiment ${experiment.name}: ${items.length} items`);
}
