import { loadEnv } from "./env.ts";

loadEnv();
delete process.env.OPENAI_BASE_URL;

const realWarn = console.warn.bind(console);
console.warn = (...args: unknown[]) => {
  if (typeof args[0] === "string" && args[0].includes("System messages in the prompt")) return;
  realWarn(...args);
};

if (!process.env.OPENAI_API_KEY) {
  console.error("Missing OPENAI_API_KEY. Copy .env.example to .env and fill it in.");
  process.exit(1);
}

const { VoltAgent } = await import("@voltagent/core");
const { createFrontDeskAgent } = await import("./agent.ts");

const frontDesk = createFrontDeskAgent();
new VoltAgent({ agents: { frontDesk } });

const REQUESTS = [
  "How long does a balayage take and what does it cost?",
  "I'd like a balayage on December 2nd with whoever is free in the morning. I'm Dana Whitfield.",
  "Can Tomas do my men's cut on 2026-12-01 at 09:00? Name is Leo Marsh.",
];

for (const [i, request] of REQUESTS.entries()) {
  console.log(`\n=== Request ${i + 1} ===`);
  console.log(`Customer:  ${request}`);
  const result = await frontDesk.generateText(request);
  console.log(`Assistant: ${result.text}`);
}

process.exit(0);
