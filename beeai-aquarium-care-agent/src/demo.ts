import { loadEnv } from "./env.ts";

loadEnv();

if (!process.env.OPENAI_API_KEY) {
  console.error("Missing OPENAI_API_KEY. Copy .env.example to .env and fill it in.");
  process.exit(1);
}
delete process.env.OPENAI_BASE_URL;

const { answerQuestion } = await import("./agent.ts");

const QUESTIONS = [
  "My 60 L tank has 6 neon tetras. Test kit says temperature 26 C, pH 6.4, ammonia 0.5 ppm, nitrite 0, nitrate 20 ppm. Is everything okay?",
  "Can I put a betta in the same 60 L tank as tiger barbs?",
  "I need to treat my 150 L tank with water conditioner and also add aquarium salt. How much of each?",
];

for (const [i, question] of QUESTIONS.entries()) {
  console.log(`\n=== Question ${i + 1} ===`);
  console.log(`Customer: ${question}`);
  console.log(`Answer:\n${await answerQuestion(question)}`);
}
