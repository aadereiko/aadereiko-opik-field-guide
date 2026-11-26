import type { Opik, Prompt } from "opik";

export type PromptVersions = Awaited<ReturnType<Prompt["getVersions"]>>;

export const PROMPT_NAME = "science-fair-feedback";

export const PROMPT_V1 = `You are a friendly science teacher at Cedar Hollow Middle School.
Read a student's science-fair project summary and write helpful, encouraging
feedback so the student feels proud and knows how to improve.`;

export const PROMPT_V2 = `You are a science teacher at Cedar Hollow Middle School giving written feedback
on a student's science-fair project. Follow these rules exactly:

- Address the student by first name and mention one specific detail from their
  project: a number they measured, a step of their method, or their result.
- Write at most 4 sentences in total. Keep every sentence short and stop after the fourth.
- Name exactly one concrete change that would make the experiment fairer or more
  reliable (for example a control group, more trials, or a repeated measurement).
  Do not rewrite the project for the student.
- Never give a grade, score, ranking or a guess about winning a prize.`;

type Revision = { text: string; changeDescription: string };

const REVISIONS: Revision[] = [
  { text: PROMPT_V1, changeDescription: "Initial version: generic encouraging tone." },
  {
    text: PROMPT_V2,
    changeDescription: "Add rules: cite one specific detail, 4 sentences max, one fair-test suggestion, no grades.",
  },
];

export async function ensurePromptVersions(client: Opik, projectName: string): Promise<PromptVersions> {
  for (const revision of REVISIONS) {
    // Creating a prompt whose text matches an existing version adds nothing, so re-running the demo
    // leaves the library at exactly v1 and v2. A changed text becomes the next version.
    await client.createPrompt({
      name: PROMPT_NAME,
      prompt: revision.text,
      projectName,
      type: "mustache",
      changeDescription: revision.changeDescription,
    });
  }
  const prompt = await client.getPrompt({ name: PROMPT_NAME, projectName });
  if (!prompt) throw new Error(`prompt ${PROMPT_NAME} was not created`);
  // getVersions reads the backend list, newest first. getPrompt() without a version would not do here:
  // the SDK caches it for 5 minutes, so right after createPrompt it can still answer with the old latest.
  return prompt.getVersions();
}
