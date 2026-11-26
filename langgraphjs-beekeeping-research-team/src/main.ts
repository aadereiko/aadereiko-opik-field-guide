import { PROJECT_NAME } from "./env.js";
import { ChatOpenAI } from "@langchain/openai";
import { OpikCallbackHandler } from "opik-langchain";
import { loadSections } from "./corpus.js";
import { buildGraph } from "./graph.js";

export const QUESTION =
  "Which of our six hives need attention this month, and what should we do about each one?";

async function main() {
  const sections = loadSections();
  const plain = new ChatOpenAI({ model: "gpt-4o-mini", temperature: 0 });
  const planner = new ChatOpenAI({
    model: "gpt-4o-mini",
    temperature: 0,
    modelKwargs: { response_format: { type: "json_object" } },
  });
  const graph = buildGraph({ sections, planner, researcher: plain, writer: plain });

  // LangGraph.js runs on LangChain.js callbacks, so the LangChain handler traces it:
  // one trace per invoke, with each node and its ChatOpenAI call nested as spans.
  const opikHandler = new OpikCallbackHandler({ projectName: PROJECT_NAME });
  const result = await graph.invoke({ question: QUESTION }, { callbacks: [opikHandler] });

  console.log(`Sub-questions:\n${result.subquestions.map((q, i) => `  ${i + 1}. ${q}`).join("\n")}\n`);
  console.log(`Report:\n${result.report}\n`);

  // Without this flush the process can exit before the batched trace is sent.
  await opikHandler.flushAsync();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
