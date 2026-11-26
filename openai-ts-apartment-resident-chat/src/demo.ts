import OpenAI from "openai";
import { createInterface } from "node:readline/promises";
import { loadNearestEnv } from "./env.js";
import { ResidentBot, loadHandbook } from "./bot.js";
import { createOpik } from "./tracing.js";
import { CONVERSATIONS, ratingsFor } from "./script.js";
import type { Opik } from "opik";

loadNearestEnv();

async function playScripted(client: OpenAI, opik: Opik, handbook: string): Promise<void> {
  const finalTraceIds = new Map<string, string>();
  for (const convo of CONVERSATIONS) {
    console.log(`\n=== ${convo.id} (${convo.resident}) ===`);
    const bot = new ResidentBot(client, opik, convo.id, handbook);
    for (const question of convo.questions) {
      const turn = await bot.ask(question);
      finalTraceIds.set(convo.id, turn.traceId);
      console.log(`\nResident: ${question}\nLark: ${turn.reply}  [${turn.totalTokens} tokens]`);
    }
  }
  // Feedback scores attach to traces that already exist, so they can be logged after the run.
  // They show up as the "resident-satisfaction" column in the Traces tab, and sort/filter like any metric.
  opik.logTracesFeedbackScores(ratingsFor(CONVERSATIONS, finalTraceIds));
}

async function playInteractive(client: OpenAI, opik: Opik, handbook: string): Promise<void> {
  const bot = new ResidentBot(client, opik, `interactive-${Date.now()}`, handbook);
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  console.log("Chat with Lark. Empty line to quit.");
  for (;;) {
    const question = (await rl.question("\nYou: ")).trim();
    if (!question) break;
    console.log(`Lark: ${(await bot.ask(question)).reply}`);
  }
  rl.close();
}

async function main(): Promise<void> {
  const client = new OpenAI();
  const opik = createOpik();
  const handbook = loadHandbook();
  try {
    if (process.argv.includes("--interactive")) await playInteractive(client, opik, handbook);
    else await playScripted(client, opik, handbook);
  } finally {
    // Traces are sent in batches in the background; a short script exits before the batch goes out unless you flush.
    await opik.flush();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
