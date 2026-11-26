import OpenAI from "openai";
import { loadEnv } from "./env.js";
import { answerQuestion } from "./qa.js";
import { QUESTIONS } from "./questions.js";

loadEnv();

const client = new OpenAI();
for (const question of QUESTIONS) {
  const answer = await answerQuestion(client, question);
  const verdict = answer.missingQuotes.length === 0 ? "ok" : "QUOTE NOT IN MANUAL";
  console.log(`Q: ${question}\nA: ${answer.text}\n[${answer.quotes.length} quotes, ${verdict}]\n`);
}
