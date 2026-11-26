import OpenAI from "openai";
import { loadEnv } from "./env.js";
import { answerQuestion } from "./qa.js";

loadEnv();

const question = process.argv.slice(2).join(" ");
if (!question) {
  console.error('Usage: npm run ask -- "your question"');
  process.exit(1);
}
const answer = await answerQuestion(new OpenAI(), question);
console.log(answer.text);
console.log(`\nquotes: ${answer.quotes.length}, not found in manual: ${answer.missingQuotes.length}`);
