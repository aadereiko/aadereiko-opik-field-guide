import { PROJECT_NAME } from "./env.js";
import { OpikCallbackHandler } from "opik-langchain";
import { Opik } from "opik";
import { runExperiment } from "./evaluate.js";
import { createApp } from "./rag.js";

const QUESTIONS = [
  "How long should I let a reflector cool down before observing?",
  "How many telescopes can I borrow and for how long?",
  "What brightness of torch is allowed on the field?",
  "Does the society run a trip to see the total solar eclipse?",
];

async function main() {
  const app = await createApp();
  for (const question of QUESTIONS) {
    // LangGraph.js runs on LangChain.js callbacks, so the LangChain handler traces it:
    // one trace per invoke, with each node and the ChatOpenAI call nested as spans.
    const opikHandler = new OpikCallbackHandler({ projectName: PROJECT_NAME });
    const result = await app.invoke({ question }, { callbacks: [opikHandler] });
    console.log(`Q: ${question}\nA: ${result.answer}\n`);
    // Without this flush the process can exit before the batched trace is sent.
    await opikHandler.flushAsync();
  }

  const client = new Opik({ projectName: PROJECT_NAME });
  const k = Number(process.env.RETRIEVE_K ?? 3);
  const result = await runExperiment(client, k);
  console.log(`Experiment ${result.experimentName} (${result.experimentId})`);
  // Dataset rows, experiment items and scores are batched; flush before the process exits.
  await client.flush();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
