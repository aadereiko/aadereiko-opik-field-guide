import { Opik, flushAll, runTests } from "opik";
import OpenAI from "openai";
import { OPIK_PROJECT } from "./env.js";
import { MODEL, PROMPTS, buildUserMessage, makeAnswerer, type PromptVariant } from "./qa.js";
import { JUDGE_MODEL, ensureSuite } from "./suite.js";

const variant = (process.env.PROMPT_VARIANT ?? "strict") as PromptVariant;
if (!(variant in PROMPTS)) throw new Error(`PROMPT_VARIANT must be one of: ${Object.keys(PROMPTS).join(", ")}`);

const client = new Opik({ projectName: OPIK_PROJECT });
const suite = await ensureSuite(client);
const answerQuestion = makeAnswerer(new OpenAI(), variant);

// runTests runs the task on every suite item, sends each output to the judge with the suite's
// assertions, and logs the whole thing as one experiment you can open under the suite's runs.
const result = await runTests({
  testSuite: suite,
  model: JUDGE_MODEL,
  experimentName: `manual-qa-${variant}-prompt`,
  experimentConfig: { answerModel: MODEL, judgeModel: JUDGE_MODEL, promptVariant: variant },
  task: async (item) => {
    const question = String(item.question);
    const answer = await answerQuestion(question);
    return { input: buildUserMessage(question, answer.context), output: answer.text };
  },
});

const questions = new Map((await suite.getItems()).map((i) => [i.id, String(i.data.question)]));
for (const [id, item] of result.itemResults) {
  console.log(`${item.passed ? "PASS" : "FAIL"}  ${questions.get(id)}  (${item.runsPassed}/${item.runsTotal} runs passed)`);
  if (item.passed) continue;
  const failed = item.testResults.flatMap((r) => r.scoreResults).filter((s) => s.value !== 1);
  for (const s of new Map(failed.map((s) => [s.name, s])).values()) {
    console.log(`      - ${s.name}\n        ${s.reason ?? ""}`);
  }
}
console.log(`\n${result.itemsPassed}/${result.itemsTotal} items passed (pass rate ${result.passRate})`);
console.log(`experiment: ${result.experimentName}\n${result.experimentUrl ?? ""}`);

await flushAll();
