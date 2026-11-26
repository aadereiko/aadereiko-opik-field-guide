import { flushAll } from "opik";
import OpenAI from "openai";
import "./env.js";
import { makeAnswerer } from "./qa.js";

const question = process.argv.slice(2).join(" ");
if (!question) {
  console.error('Usage: npm run ask -- "your question"');
  process.exit(1);
}
const answer = await makeAnswerer(new OpenAI())(question);
console.log(answer.text);
console.log(`\nquotes: ${answer.quotes.length}, not found in manual: ${answer.missingQuotes.length}`);
// Traces are sent in batches in the background; without a flush the process can exit before they upload.
await flushAll();
