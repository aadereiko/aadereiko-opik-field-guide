import { describe, expect, it } from "vitest";
import { track } from "opik";
import { OpikCallbackHandler } from "opik-langchain";
import { buildGraph, formatContext, SYSTEM_PROMPT } from "../src/graph.js";
import type { IndexedChunk } from "../src/corpus.js";

const index: IndexedChunk[] = [
  { id: "cool", text: "Cooling: wait 45 minutes", vector: [1, 0] },
  { id: "loan", text: "Loans: 21 days", vector: [0, 1] },
  { id: "red", text: "Red light only", vector: [0.7, 0.7] },
];

function stubDeps() {
  const prompts: [string, string][][] = [];
  return {
    prompts,
    deps: {
      index,
      embedder: { embedQuery: async () => [0, 1] },
      llm: {
        invoke: async (messages: [string, string][]) => {
          prompts.push(messages);
          return { content: "21 days" };
        },
      },
    },
  };
}

describe("two-node graph", () => {
  it("retrieves the nearest sections and answers from them", async () => {
    const { deps, prompts } = stubDeps();
    const result = await buildGraph({ ...deps, k: 2 }).invoke({ question: "How long is a loan?" });
    expect(result.context).toEqual(["Loans: 21 days", "Red light only"]);
    expect(result.answer).toBe("21 days");
    expect(prompts[0]?.[0]?.[1]).toBe(`${SYSTEM_PROMPT}\n\n${formatContext(result.context)}`);
  });

  it("runs with tracking disabled and a tracked function around it", async () => {
    const { deps } = stubDeps();
    const app = buildGraph({ ...deps, k: 1 });
    const ask = track({ name: "ask" }, async (question: string) => {
      const handler = new OpikCallbackHandler({ projectName: "unit-tests" });
      return app.invoke({ question }, { callbacks: [handler] });
    });
    const result = await ask("How long is a loan?");
    expect(result.answer).toBe("21 days");
  });
});
