import { Opik, TestSuite, type TestSuiteItem } from "opik";
import { OPIK_PROJECT } from "./env.js";
import { QUESTIONS } from "./questions.js";

export const SUITE_NAME = "manual-qa-citations";
export const JUDGE_MODEL = "gpt-4.1-mini";

// The judge only ever sees two fields, "input" and "output". The task puts the manual excerpts in
// "input" so that the first assertion can be checked against them.
export const GLOBAL_ASSERTIONS = [
  "If the output has text wrapped in <quote></quote> tags, every such text appears character for character in the manual excerpts in the input. Curly quotation marks, changed punctuation, or added or dropped words inside the tags count as a mismatch. An output with no quote tags passes this check.",
  "Every fact the output states about an appliance is backed by text inside <quote></quote> tags that supports it. Facts written outside quote tags with no quote behind them fail. An output that only says the manuals do not cover the question passes this check.",
  "The output answers the question in the input, or says plainly that the manuals do not cover it.",
];

const ITEM_ASSERTIONS: Record<number, string[]> = {
  0: ["The answer says the kettle should be descaled every 4 weeks."],
  1: ["The answer tells the reader not to use table salt and to use coarse dishwasher salt."],
  2: ["The answer says 200 C and 18 minutes."],
  3: ["The answer says that F4 means a leak was detected."],
  5: ["The output says the manuals do not cover this and contains no <quote> tags."],
};

export const SUITE_ITEMS: TestSuiteItem[] = QUESTIONS.map((question, i) => ({
  data: { question },
  assertions: ITEM_ASSERTIONS[i] ?? [],
}));

export async function ensureSuite(client: Opik): Promise<TestSuite> {
  // A test suite is a dataset whose items carry plain-English assertions. Opik runs each assertion
  // through an LLM judge and records a pass or fail per item. runsPerItem 3 with passThreshold 2
  // absorbs judge noise: an item passes when 2 of its 3 runs pass every assertion.
  const suite = await TestSuite.getOrCreate(client, {
    name: SUITE_NAME,
    projectName: OPIK_PROJECT,
    description: "Appliance manual answers must quote the manual verbatim",
    globalAssertions: GLOBAL_ASSERTIONS,
    globalExecutionPolicy: { runsPerItem: 3, passThreshold: 2 },
  });
  await suite.updateTestSettings({
    globalAssertions: GLOBAL_ASSERTIONS,
    globalExecutionPolicy: { runsPerItem: 3, passThreshold: 2 },
  });
  if ((await suite.getItems(1)).length === 0) {
    await suite.insert(SUITE_ITEMS);
  }
  return suite;
}
