import { ChatOpenAI } from "@langchain/openai";
import { BaseMetric, z, type EvaluationScoreResult } from "opik";

export const JUDGE_MODEL = "gpt-4o-mini";

const inputSchema = z.object({
  input: z.string(),
  context: z.array(z.string()),
  expected_output: z.string(),
});

type ContextPrecisionInput = z.infer<typeof inputSchema>;

export type Judge = (prompt: string) => Promise<string>;

export function buildJudgePrompt(input: ContextPrecisionInput): string {
  const passages = input.context.map((text, i) => `[${i + 1}]\n${text}`).join("\n\n");
  return (
    "You grade a retrieval step. For each numbered passage, decide whether it contains " +
    "information that helps produce the reference answer to the question.\n\n" +
    `Question: ${input.input}\nReference answer: ${input.expected_output}\n\nPassages:\n${passages}\n\n` +
    `Reply with JSON only: {"relevant": [true or false for each of the ${input.context.length} passages, in order]}`
  );
}

export function parseRelevance(reply: string, expected: number): boolean[] {
  const match = reply.match(/\{[\s\S]*\}/);
  if (!match) throw new Error(`Judge did not return JSON: ${reply}`);
  const parsed = JSON.parse(match[0]) as { relevant?: unknown };
  if (!Array.isArray(parsed.relevant) || parsed.relevant.length !== expected) {
    throw new Error(`Judge returned ${JSON.stringify(parsed.relevant)} for ${expected} passages`);
  }
  return parsed.relevant.map(Boolean);
}

export function precisionOf(relevant: boolean[]): number {
  if (relevant.length === 0) return 0;
  return relevant.filter(Boolean).length / relevant.length;
}

export function openAiJudge(): Judge {
  const model = new ChatOpenAI({ model: JUDGE_MODEL, temperature: 0 });
  return async (prompt) => String((await model.invoke([["user", prompt]])).content);
}

// The TypeScript SDK ships Hallucination but no ContextPrecision, so this is a custom
// BaseMetric. evaluate() runs it per dataset item and stores the result as a feedback score
// named "context_precision" on that item's row in the experiment.
export class ContextPrecision extends BaseMetric {
  readonly validationSchema = inputSchema;

  constructor(private readonly judge: Judge = openAiJudge()) {
    super("context_precision", true);
  }

  async score(input: ContextPrecisionInput): Promise<EvaluationScoreResult> {
    const reply = await this.judge(buildJudgePrompt(input));
    const relevant = parseRelevance(reply, input.context.length);
    return {
      name: this.name,
      value: precisionOf(relevant),
      reason: `${relevant.filter(Boolean).length} of ${relevant.length} retrieved passages were relevant`,
    };
  }
}
