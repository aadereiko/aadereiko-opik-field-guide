import { describe, expect, it } from "vitest";
import { track } from "opik";
import { OpikCallbackHandler } from "opik-langchain";
import { loadSections } from "../src/corpus.js";
import { buildGraph, formatFindings, nextStep, parseSubquestions } from "../src/graph.js";

describe("parseSubquestions", () => {
  it("reads JSON and caps at four", () => {
    const raw = JSON.stringify({ subquestions: ["a?", "b?", "c?", "d?", "e?"] });
    expect(parseSubquestions(raw)).toEqual(["a?", "b?", "c?", "d?"]);
  });

  it("falls back to numbered lines", () => {
    expect(parseSubquestions("1. First?\n2) Second?\nnot a question")).toEqual(["First?", "Second?"]);
  });
});

describe("nextStep", () => {
  it("loops until every sub-question has a finding", () => {
    expect(nextStep({ subquestions: ["a", "b"], findings: ["x"] })).toBe("researcher");
    expect(nextStep({ subquestions: ["a", "b"], findings: ["x", "y"] })).toBe("writer");
  });
});

describe("formatFindings", () => {
  it("pairs each sub-question with its finding", () => {
    expect(formatFindings(["q?"], ["f"])).toBe("Q1: q?\nFinding: f");
  });
});

describe("buildGraph", () => {
  const stub = (reply: string, seen: string[] = []) => ({
    invoke: async (messages: [string, string][]) => {
      seen.push(messages[1]?.[1] ?? "");
      return { content: reply };
    },
  });

  it("runs planner, one researcher pass per sub-question, then writer", async () => {
    const researcherSeen: string[] = [];
    const graph = buildGraph({
      sections: loadSections(),
      planner: stub(JSON.stringify({ subquestions: ["Which hives have varroa?", "Which hives are queenless?", "Who needs feeding?"] })),
      researcher: stub("finding", researcherSeen),
      writer: stub("final report"),
    });
    const result = await graph.invoke({ question: "state of the hives?" });
    expect(researcherSeen).toHaveLength(3);
    expect(result.findings).toHaveLength(3);
    expect(result.report).toBe("final report");
  });

  it("runs with tracing tracked and a handler attached while tracking is disabled", async () => {
    const graph = buildGraph({
      sections: loadSections(),
      planner: stub(JSON.stringify({ subquestions: ["one?"] })),
      researcher: stub("f"),
      writer: stub("r"),
    });
    const traced = track({ name: "run-team" }, async (question: string) => {
      const handler = new OpikCallbackHandler({ projectName: "unit-test" });
      return (await graph.invoke({ question }, { callbacks: [handler] })).report;
    });
    expect(await traced("q?")).toBe("r");
  });
});
