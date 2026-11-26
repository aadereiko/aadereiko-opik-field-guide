import OpenAI from "openai";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const MODEL = "gpt-4o-mini";

export type Message = { role: "system" | "user" | "assistant"; content: string };

export function loadHandbook(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  return readFileSync(join(here, "..", "data", "handbook.md"), "utf8");
}

export function buildSystemPrompt(handbook: string): string {
  return [
    "You are Lark, the chat assistant for residents of Larkspur Court.",
    "Answer only from the handbook below. Keep replies under 80 words.",
    "If the handbook does not cover the question, say so and point the resident to the front desk (ext. 100) instead of guessing.",
    "",
    "HANDBOOK",
    handbook,
  ].join("\n");
}

export type Turn = { reply: string; totalTokens: number };

export class ResidentBot {
  private history: Message[];

  constructor(
    private readonly client: OpenAI,
    handbook: string,
  ) {
    this.history = [{ role: "system", content: buildSystemPrompt(handbook) }];
  }

  get messages(): readonly Message[] {
    return this.history;
  }

  async ask(question: string): Promise<Turn> {
    this.history.push({ role: "user", content: question });
    const completion = await this.client.chat.completions.create({
      model: MODEL,
      messages: this.history,
      temperature: 0.2,
    });
    const reply = completion.choices[0]?.message?.content?.trim() ?? "";
    this.history.push({ role: "assistant", content: reply });
    return { reply, totalTokens: completion.usage?.total_tokens ?? 0 };
  }
}
