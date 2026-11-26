import OpenAI from "openai";
import { createInterface } from "node:readline/promises";
import { loadNearestEnv } from "./env.js";
import { ResidentBot, loadHandbook } from "./bot.js";

loadNearestEnv();

export type Conversation = { id: string; resident: string; questions: string[] };

export const CONVERSATIONS: Conversation[] = [
  {
    id: "laundry-and-quiet-hours",
    resident: "unit-3B",
    questions: [
      "What time does the laundry room close?",
      "I start a night shift and get home at 21:30. Can I still start a wash?",
      "And if I run the dryer at 23:00, is that a noise problem?",
    ],
  },
  {
    id: "parking-and-packages",
    resident: "unit-5D",
    questions: [
      "I don't have a garage space. What are my options?",
      "My sister visits for a long weekend. How long can her car stay?",
      "Also a 30 kg treadmill is arriving Thursday. Where should it be delivered?",
    ],
  },
];

async function playScripted(client: OpenAI, handbook: string): Promise<void> {
  for (const convo of CONVERSATIONS) {
    console.log(`\n=== ${convo.id} (${convo.resident}) ===`);
    const bot = new ResidentBot(client, handbook);
    for (const question of convo.questions) {
      const turn = await bot.ask(question);
      console.log(`\nResident: ${question}\nLark: ${turn.reply}  [${turn.totalTokens} tokens]`);
    }
  }
}

async function playInteractive(client: OpenAI, handbook: string): Promise<void> {
  const bot = new ResidentBot(client, handbook);
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
  const handbook = loadHandbook();
  if (process.argv.includes("--interactive")) await playInteractive(client, handbook);
  else await playScripted(client, handbook);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
