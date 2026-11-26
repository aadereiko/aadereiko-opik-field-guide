import { loadNearestEnv } from "./env.js";

loadNearestEnv();

const { default: OpenAI } = await import("openai");
const { runTests, setGlobalClient } = await import("opik");
const { createFeedbacker, MODEL } = await import("./feedback.js");
const { FAIR_PROJECTS } = await import("./projects.js");
const { ensurePromptVersions, PROMPT_NAME } = await import("./prompts.js");
const { FEEDBACK_ASSERTIONS, countSentences } = await import("./rules.js");
const { createOpik, PROJECT_NAME } = await import("./tracing.js");

const JUDGE_MODEL = "gpt-4o-mini";
const SUITE_NAME = "science-fair-feedback-suite";

const opik = createOpik();
// track() sends spans through the global client, so it must be the one bound to this project.
setGlobalClient(opik);
const feedbackFor = createFeedbacker(new OpenAI(), opik);

const versions = await ensurePromptVersions(opik, PROJECT_NAME);
console.log(`Prompt library: ${PROMPT_NAME} has ${versions.length} versions`);
for (const version of versions) console.log(`  ${version.getVersionInfo()}`);
const [newest, oldest] = versions;
// compareTo prints a coloured unified diff of the two versions; the Opik UI shows the same diff on the prompt page.
if (newest && oldest) newest.compareTo(oldest);

const first = FAIR_PROJECTS[0]!;
for (const version of ["v1", "v2"]) {
  const sample = await feedbackFor(first, version);
  console.log(`\nSample for ${first.student} with ${version} (${countSentences(sample)} sentences):\n${sample}`);
}
console.log();

const suite = await opik.getOrCreateTestSuite({
  name: SUITE_NAME,
  projectName: PROJECT_NAME,
  globalAssertions: FEEDBACK_ASSERTIONS,
  globalExecutionPolicy: { runsPerItem: 1, passThreshold: 1 },
});
await suite.insert(FAIR_PROJECTS.map((project) => ({ data: { project_id: project.id } })));

const byId = new Map(FAIR_PROJECTS.map((project) => [project.id, project]));
const results: Record<string, { passRate: number | undefined; passed: number; total: number; url?: string }> = {};

for (const version of ["v1", "v2"]) {
  const prompt = await opik.getPrompt({ name: PROMPT_NAME, version });
  if (!prompt) throw new Error(`missing ${PROMPT_NAME} ${version}`);
  const result = await runTests({
    testSuite: suite,
    experimentName: `${PROMPT_NAME}-${version}`,
    experimentConfig: { prompt_version: version, model: MODEL },
    prompts: [prompt],
    model: JUDGE_MODEL,
    task: async (item) => {
      const project = byId.get(String(item.project_id));
      if (!project) throw new Error(`unknown project ${String(item.project_id)}`);
      return { input: { project_id: project.id }, output: { feedback: await feedbackFor(project, version) } };
    },
    taskThreads: 5,
  });
  results[version] = {
    passRate: result.passRate,
    passed: result.itemsPassed,
    total: result.itemsTotal,
    url: result.experimentUrl,
  };
}

console.log("=== Prompt version comparison ===");
for (const [version, r] of Object.entries(results)) {
  console.log(`${PROMPT_NAME} ${version}: ${((r.passRate ?? 0) * 100).toFixed(0)}% pass rate (${r.passed}/${r.total} items passed)`);
}
if (results.v2?.url) console.log(`\nView the runs: ${results.v2.url}`);

await opik.flush();
