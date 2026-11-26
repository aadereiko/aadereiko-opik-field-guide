import { describe, expect, it } from "vitest";
import type OpenAI from "openai";
import { Opik } from "opik";
import { ResidentBot, buildSystemPrompt, loadHandbook } from "../src/bot.js";
import { CONVERSATIONS, ratingsFor } from "../src/script.js";
import { PROJECT_NAME, withLlmSpans } from "../src/tracing.js";

function stubClient(replies: string[]): { client: OpenAI; seen: number[] } {
  const seen: number[] = [];
  let call = 0;
  const client = {
    chat: {
      completions: {
        create: async (params: { messages: unknown[] }) => {
          seen.push(params.messages.length);
          return {
            id: `stub-${call}`,
            model: "gpt-4o-mini",
            choices: [{ message: { role: "assistant", content: replies[call++] ?? "" } }],
            usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
          };
        },
      },
    },
  } as unknown as OpenAI;
  return { client, seen };
}

const trackingOff = () => new Opik({ projectName: PROJECT_NAME, trackDisable: true });

describe("handbook and prompt", () => {
  it("ships a handbook covering the four topics the assistant is built for", () => {
    const handbook = loadHandbook().toLowerCase();
    for (const topic of ["laundry", "parking", "packages", "quiet hours"]) {
      expect(handbook).toContain(topic);
    }
  });

  it("puts the handbook and the no-guessing rule in the system prompt", () => {
    const prompt = buildSystemPrompt("HANDBOOK-BODY");
    expect(prompt).toContain("HANDBOOK-BODY");
    expect(prompt).toContain("instead of guessing");
  });
});

describe("ResidentBot with tracking disabled", () => {
  it("answers through the traced client and returns reply, tokens and a trace id", async () => {
    const { client } = stubClient(["Laundry closes at 22:00."]);
    const bot = new ResidentBot(client, trackingOff(), "t-1", "handbook");
    const turn = await bot.ask("When does laundry close?");
    expect(turn.reply).toBe("Laundry closes at 22:00.");
    expect(turn.totalTokens).toBe(15);
    expect(turn.traceId).toBeTruthy();
  });

  it("re-sends the whole conversation on every turn", async () => {
    const { client, seen } = stubClient(["a", "b", "c"]);
    const bot = new ResidentBot(client, trackingOff(), "t-2", "handbook");
    await bot.ask("one");
    await bot.ask("two");
    await bot.ask("three");
    expect(seen).toEqual([2, 4, 6]);
    expect(bot.messages.at(-1)).toEqual({ role: "assistant", content: "c" });
  });
});

describe("withLlmSpans", () => {
  it("forces span type llm and leaves other trace members alone", () => {
    const calls: unknown[] = [];
    const fakeTrace = { span: (d: unknown) => calls.push(d), marker: "kept" };
    const wrapped = withLlmSpans(fakeTrace as never) as unknown as typeof fakeTrace;
    wrapped.span({ name: "x", type: "general" } as never);
    expect(calls).toEqual([{ name: "x", type: "llm" }]);
    expect(wrapped.marker).toBe("kept");
  });
});

describe("scripted conversations and ratings", () => {
  it("has three questions per conversation and unique thread ids", () => {
    expect(CONVERSATIONS.every((c) => c.questions.length === 3)).toBe(true);
    expect(new Set(CONVERSATIONS.map((c) => c.id)).size).toBe(CONVERSATIONS.length);
  });

  it("builds one satisfaction score per conversation that has a final trace", () => {
    const ids = new Map([[CONVERSATIONS[0]!.id, "trace-a"]]);
    const scores = ratingsFor(CONVERSATIONS, ids);
    expect(scores).toHaveLength(1);
    expect(scores[0]).toMatchObject({ id: "trace-a", name: "resident-satisfaction", value: 1 });
  });
});
