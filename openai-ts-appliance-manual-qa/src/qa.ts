import { join } from "node:path";
import { getTrackContext, track } from "opik";
import OpenAI from "openai";
import { trackOpenAI } from "opik-openai";
import { OPIK_PROJECT, PROJECT_DIR } from "./env.js";
import { formatContext, loadSections, retrieve, type Section } from "./manuals.js";
import { extractQuotes, findMissingQuotes } from "./quotes.js";

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

// type "tool" gives retrieval its own span, so you can see which excerpts the model was shown.
const retrieveExcerpts = track(
  { name: "retrieve_manual_sections", type: "tool", projectName: OPIK_PROJECT },
  async (question: string) => {
    const sections = retrieve(question, SECTIONS);
    return { sections, context: sections.length > 0 ? formatContext(sections) : "(no matching excerpts)" };
  },
);

// type "guardrail" marks a check on the model's output; the span's output says which quotes failed.
const checkQuotes = track(
  { name: "verbatim_quote_check", type: "guardrail", projectName: OPIK_PROJECT },
  async (quotes: string[], context: string) => ({
    quotes: quotes.length,
    missingQuotes: findMissingQuotes(quotes, context),
  }),
);

function withTracing(client: OpenAI): OpenAI {
  const parent = getTrackContext()?.span;
  if (!parent) return client;
  // trackOpenAI wraps the client so each completion becomes an llm span with model, token usage and
  // cost. Passing parent nests it under answer_question; without it, every call is a separate trace.
  return trackOpenAI(client, { parent, generationName: "answer_with_quotes" });
}

// track() records every argument as the trace input, so the OpenAI client is captured in a closure
// instead of being passed in: serializing the client object blows past Opik's payload size limit.
export function makeAnswerer(client: OpenAI) {
  // track() makes this the root of the trace: input is the question, output is the Answer.
  return track(
    { name: "answer_question", type: "general", projectName: OPIK_PROJECT },
    async (question: string): Promise<Answer> => {
      const { sections, context } = await retrieveExcerpts(question);
      const completion = await withTracing(client).chat.completions.create({
        model: MODEL,
        temperature: 0,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: buildUserMessage(question, context) },
        ],
      });
      const text = completion.choices[0]?.message.content ?? "";
      const quotes = extractQuotes(text);
      const { missingQuotes } = await checkQuotes(quotes, context);
      return { question, context, sections, text, quotes, missingQuotes };
    },
  );
}
