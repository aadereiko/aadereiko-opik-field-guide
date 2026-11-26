import { PROJECT_NAME } from "./env.js";
import { Hallucination, Opik, evaluate } from "opik";
import { OpikCallbackHandler } from "opik-langchain";
import { DATASET_ITEMS, DATASET_NAME, type QAItem } from "./dataset.js";
import { JUDGE_MODEL, ContextPrecision } from "./metrics.js";
import { createApp } from "./rag.js";
import { RETRIEVE_K } from "./graph.js";

export async function runExperiment(client: Opik, k: number = RETRIEVE_K) {
  const app = await createApp(k);

  // The dataset is stored in Opik; insert() skips items that already exist, so re-runs
  // don't duplicate rows.
  const dataset = await client.getOrCreateDataset<QAItem>(DATASET_NAME);
  await dataset.insert(DATASET_ITEMS);

  const task = async (item: QAItem) => {
    const handler = new OpikCallbackHandler({ projectName: PROJECT_NAME, client });
    const result = await app.invoke({ question: item.question }, { callbacks: [handler] });
    return { output: result.answer, context: result.context };
  };

  // evaluate() runs the task over every dataset item, scores each result, and records one
  // experiment in Opik. experimentConfig shows up on the experiment so runs can be compared.
  return evaluate<QAItem>({
    dataset,
    task,
    scoringMetrics: [new Hallucination({ model: JUDGE_MODEL }), new ContextPrecision()],
    scoringKeyMapping: { input: "question" },
    experimentName: `handbook-rag-k${k}`,
    experimentConfig: { retrieve_k: k, generator: "gpt-4o-mini", judge: JUDGE_MODEL },
    client,
    projectName: PROJECT_NAME,
    taskThreads: 4,
  });
}
