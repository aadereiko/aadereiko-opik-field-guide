import type OpenAI from "openai";
import { describe, expect, it } from "vitest";
import { buildUserMessage, makeAnswerer } from "../src/qa.js";

function stubClient(reply: string) {
  const calls: unknown[] = [];
  const client = {
    chat: {
      completions: {
        create: async (params: unknown) => {
          calls.push(params);
          return { choices: [{ message: { content: reply } }] };
        },
      },
    },
  };
  return { client: client as unknown as OpenAI, calls };
}

describe("makeAnswerer", () => {
  it("runs the traced function with tracking disabled and reports a faithful quote", async () => {
    const { client } = stubClient("Every 4 weeks. <quote>Descale the kettle every 4 weeks in hard-water areas.</quote>");
    const answer = await makeAnswerer(client)("How often should I descale the Kettlewick KW-200?");
    expect(answer.quotes).toHaveLength(1);
    expect(answer.missingQuotes).toEqual([]);
  });

  it("reports a quote that is not in the retrieved excerpts", async () => {
    const { client } = stubClient("<quote>Descale every week.</quote>");
    const answer = await makeAnswerer(client)("How often should I descale the Kettlewick KW-200?");
    expect(answer.missingQuotes).toEqual(["Descale every week."]);
  });

  it("sends the excerpts and question to the model", async () => {
    const { client, calls } = stubClient("The manuals do not cover this.");
    await makeAnswerer(client, "loose")("Does the Aeroloft AF-5 come with a recipe app?");
    const params = calls[0] as { messages: { role: string; content: string }[] };
    expect(params.messages[1]?.content).toContain("Question: Does the Aeroloft AF-5 come with a recipe app?");
    expect(params.messages[0]?.content).not.toContain("character-for-character");
  });

  it("puts excerpts before the question", () => {
    expect(buildUserMessage("Q?", "CTX")).toBe("Manual excerpts:\n\nCTX\n\nQuestion: Q?");
  });
});
