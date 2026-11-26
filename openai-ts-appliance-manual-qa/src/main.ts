import { flushAll } from "opik";
import OpenAI from "openai";
import "./env.js";
import { makeAnswerer } from "./qa.js";
import { QUESTIONS } from "./questions.js";

const answerQuestion = makeAnswerer(new OpenAI());
for (const question of QUESTIONS) {
  const answer = await answerQuestion(question);
  const verdict = answer.missingQuotes.length === 0 ? "ok" : "QUOTE NOT IN MANUAL";
  console.log(`Q: ${question}\nA: ${answer.text}\n[${answer.quotes.length} quotes, ${verdict}]\n`);
}
// Traces are sent in batches in the background; without a flush the process can exit before they upload.
await flushAll();
