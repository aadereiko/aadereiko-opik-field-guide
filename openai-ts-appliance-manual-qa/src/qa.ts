import OpenAI from "openai";
import { PROJECT_DIR } from "./env.js";
import { formatContext, loadSections, retrieve, type Section } from "./manuals.js";
import { extractQuotes, findMissingQuotes } from "./quotes.js";
import { join } from "node:path";

export const MODEL = "gpt-4o-mini";

export const SYSTEM_PROMPT = `You answer questions about home appliances using only the manual excerpts provided.
Rules:
1. Wrap every excerpt that supports your answer in <quote></quote> tags, copied character-for-character from the excerpts. Never reword inside a quote.
2. Write one or two plain sentences around the quotes. Do not state facts that you cannot back with a quote.
3. If the excerpts do not cover the question, say "The manuals do not cover this." and do not use any quote tags.`;

export interface Answer {
  question: string;
  context: string;
  sections: Section[];
  text: string;
  quotes: string[];
  missingQuotes: string[];
}

export const SECTIONS = loadSections(join(PROJECT_DIR, "data", "manuals"));

export function buildUserMessage(question: string, context: string): string {
  return `Manual excerpts:\n\n${context}\n\nQuestion: ${question}`;
}

export async function answerQuestion(client: OpenAI, question: string): Promise<Answer> {
  const sections = retrieve(question, SECTIONS);
  const context = sections.length > 0 ? formatContext(sections) : "(no matching excerpts)";
  const completion = await client.chat.completions.create({
    model: MODEL,
    temperature: 0,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: buildUserMessage(question, context) },
    ],
  });
  const text = completion.choices[0]?.message.content ?? "";
  const quotes = extractQuotes(text);
  const missingQuotes = findMissingQuotes(quotes, context);
  return { question, context, sections, text, quotes, missingQuotes };
}
