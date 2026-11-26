import { describe, expect, it } from "vitest";
import type OpenAI from "openai";
import { Opik } from "opik";
import { createFeedbacker } from "../src/feedback.js";
import { describeProject, FAIR_PROJECTS } from "../src/projects.js";
import { ensurePromptVersions, PROMPT_NAME, PROMPT_V1, PROMPT_V2 } from "../src/prompts.js";
import { countSentences, FEEDBACK_ASSERTIONS } from "../src/rules.js";

type Stored = { prompt: string; version: string };

function fakeLibrary(initial: string[] = []) {
  const stored: Stored[] = initial.map((prompt, i) => ({ prompt, version: `v${i + 1}` }));
  let creates = 0;
  const handle = () => ({
    version: stored.at(-1)?.version,
    prompt: stored.at(-1)?.prompt ?? "",
    getVersions: async () => [...stored].reverse(),
  });
  const client = {
    getPrompt: async () => (stored.length ? handle() : null),
    createPrompt: async (options: { prompt: string }) => {
      creates += 1;
      if (!stored.some((entry) => entry.prompt === options.prompt)) {
        stored.push({ prompt: options.prompt, version: `v${stored.length + 1}` });
      }
      return handle();
    },
  } as unknown as Opik;
  return { client, stored, creates: () => creates };
}

function stubOpenAI(reply: string) {
  const systems: string[] = [];
  const client = {
    chat: {
      completions: {
        create: async (params: { messages: { role: string; content: string }[] }) => {
          systems.push(params.messages[0]?.content ?? "");
          return { id: "stub", model: "gpt-4o-mini", choices: [{ message: { role: "assistant", content: reply } }] };
        },
      },
    },
  } as unknown as OpenAI;
  return { client, systems };
}

describe("rules", () => {
  it("counts sentences and ignores list markers and blank lines", () => {
    expect(countSentences("One. Two! Three?")).toBe(3);
    expect(countSentences("Hi Marisol!\n\nYour result is neat. Try more trials.")).toBe(3);
    expect(countSentences("")).toBe(0);
  });

  it("keeps the assertion list in step with what prompt v2 promises", () => {
    expect(FEEDBACK_ASSERTIONS).toHaveLength(4);
    expect(PROMPT_V2).toContain("4 sentences");
    expect(PROMPT_V1).not.toContain("4 sentences");
  });
});

describe("project data", () => {
  it("renders the student, title and summary for the model", () => {
    const text = describeProject(FAIR_PROJECTS[0]!);
    expect(text).toContain("Marisol");
    expect(text).toContain("bean sprouts");
  });
});

describe("ensurePromptVersions", () => {
  it("creates v1 and v2 on an empty library", async () => {
    const lib = fakeLibrary();
    const versions = await ensurePromptVersions(lib.client, "p");
    expect(lib.creates()).toBe(2);
    expect(versions.map((v) => v.version)).toEqual(["v2", "v1"]);
  });

  it("keeps exactly two versions when run again", async () => {
    const lib = fakeLibrary();
    await ensurePromptVersions(lib.client, "p");
    const versions = await ensurePromptVersions(lib.client, "p");
    expect(versions).toHaveLength(2);
  });

  it("adds only the missing version", async () => {
    const lib = fakeLibrary([PROMPT_V1]);
    const versions = await ensurePromptVersions(lib.client, "p");
    expect(versions.map((v) => v.version)).toEqual(["v2", "v1"]);
    expect(lib.stored.at(-1)?.prompt).toBe(PROMPT_V2);
  });
});

describe("feedbacker with tracking disabled", () => {
  it("fetches the prompt by name, sends it as the system message and returns the reply", async () => {
    const lib = fakeLibrary([PROMPT_V1, PROMPT_V2]);
    const openai = stubOpenAI("Marisol, nice 14 cm result. Add a white-light group.");
    const asked: unknown[] = [];
    const opik = {
      getPrompt: async (options: { name: string; version?: string }) => {
        asked.push(options);
        return { name: options.name, version: options.version, prompt: PROMPT_V2 };
      },
    } as unknown as Opik;
    const feedbackFor = createFeedbacker(openai.client, opik);
    const reply = await feedbackFor(FAIR_PROJECTS[0]!, "v2");
    expect(reply).toContain("14 cm");
    expect(openai.systems[0]).toBe(PROMPT_V2);
    expect(asked[0]).toMatchObject({ name: PROMPT_NAME, version: "v2" });
    expect(lib.creates()).toBe(0);
  });

  it("fails loudly when the library has no such prompt version", async () => {
    const opik = { getPrompt: async () => null } as unknown as Opik;
    const feedbackFor = createFeedbacker(stubOpenAI("x").client, opik);
    await expect(feedbackFor(FAIR_PROJECTS[0]!, "v9")).rejects.toThrow(/not found/);
  });
});
