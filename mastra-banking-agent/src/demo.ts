import { config } from "dotenv";
import { fileURLToPath } from "node:url";

config({
  path: [
    fileURLToPath(new URL("../.env", import.meta.url)),
    fileURLToPath(new URL("../../.env", import.meta.url)),
  ],
  quiet: true,
});

if (!process.env.OPENAI_API_KEY) {
  console.error("Missing OPENAI_API_KEY. Copy .env.example to .env and fill it in.");
  process.exit(1);
}

const { mastra } = await import("./mastra.ts");

const REQUESTS = [
  "How much money is in my checking account right now?",
  "What did I spend on travel lately, and what is my balance after that?",
  "I lost my card ending 4417. Please freeze it right away.",
  "Freeze my card ending 1234 too, just in case.",
];

const agent = mastra.getAgent("bankingAgent");

for (const [i, request] of REQUESTS.entries()) {
  console.log(`\n=== Request ${i + 1} ===`);
  console.log(`Customer: ${request}`);
  const result = await agent.generate(request, { maxSteps: 6 });
  console.log(`Agent:    ${result.text}`);
}
