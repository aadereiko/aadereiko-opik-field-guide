import type OpenAI from "openai";
import { trackOpenAI } from "opik-openai";
import { getTrackContext, OpikSpanType, track, type Opik } from "opik";
import { PROMPT_NAME } from "./prompts.js";
import { describeProject, type FairProject } from "./projects.js";
import { PROJECT_NAME, withLlmSpans } from "./tracing.js";

export const MODEL = "gpt-4o-mini";

export type Feedbacker = (project: FairProject, version?: string) => Promise<string>;

export function createFeedbacker(client: OpenAI, opik: Opik): Feedbacker {
  // track opens a span (and a root trace when called on its own) named "teacher-feedback" with the
  // arguments as input and the returned text as output. Inside an evaluation run it nests under that
  // item's task trace instead of creating a stray one.
  const writeFeedback = track(
    { name: "teacher-feedback", projectName: PROJECT_NAME, type: OpikSpanType.General },
    async (project: FairProject, version?: string): Promise<string> => {
      // getPrompt pulls the system prompt from the library at run time. Inside a tracked function the SDK
      // also writes the prompt reference into this span's metadata, so the trace says which version ran.
      const prompt = await opik.getPrompt({ name: PROMPT_NAME, version });
      if (!prompt) throw new Error(`prompt ${PROMPT_NAME} ${version ?? "(latest)"} not found`);

      const context = getTrackContext();
      // trackOpenAI wraps the client: the completion becomes an llm span under the current span,
      // with model, token usage and estimated cost filled in. With tracking disabled there is no
      // context, so the plain client is used and nothing is sent to Opik.
      const tracked = context
        ? trackOpenAI(client, { client: opik, parent: withLlmSpans(context.span), generationName: "write-feedback" })
        : client;
      const completion = await tracked.chat.completions.create({
        model: MODEL,
        temperature: 0.3,
        messages: [
          { role: "system", content: prompt.prompt },
          { role: "user", content: describeProject(project) },
        ],
      });
      return completion.choices[0]?.message?.content?.trim() ?? "";
    },
  );
  return writeFeedback as Feedbacker;
}
