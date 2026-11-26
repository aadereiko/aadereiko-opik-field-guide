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
const { createObservability } = await import("./observability.ts");

const frontDesk = createFrontDeskAgent();
const observability = createObservability();
// Handing the Opik-wired observability to VoltAgent is the whole integration: every generateText call becomes one trace.
new VoltAgent({ agents: { frontDesk }, observability });

const REQUESTS = [
  "How long does a balayage take and what does it cost?",
  "Please book me a balayage with Ines on December 2nd at 9:00 in the morning. I'm Dana Whitfield.",
  "Can Tomas do my men's cut on 2026-12-01 at 09:00? Name is Leo Marsh.",
];

for (const [i, request] of REQUESTS.entries()) {
  console.log(`\n=== Request ${i + 1} ===`);
  console.log(`Customer:  ${request}`);
  const result = await frontDesk.generateText(request);
  console.log(`Assistant: ${result.text}`);
}

await observability.shutdown();
console.log('\nDone. Open the "voltagent-hair-salon-assistant" project in Opik.');
process.exit(0);
