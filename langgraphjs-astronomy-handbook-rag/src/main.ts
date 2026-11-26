import "./env.js";
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
    const result = await app.invoke({ question });
    console.log(`Q: ${question}\nA: ${result.answer}\n`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
