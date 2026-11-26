import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import { search, type Section } from "./corpus.js";

export const MAX_SUBQUESTIONS = 4;
export const SECTIONS_PER_PASS = 3;

export const PLANNER_PROMPT =
  "You are the planner for a beekeeping research team. Split the question into 3 or 4 short, " +
  "self-contained sub-questions that can each be answered from hive inspection logs. " +
  'Reply with JSON only: {"subquestions": ["...", "..."]}.';

export const RESEARCHER_PROMPT =
  "You are a beekeeping researcher. Answer the sub-question using only the log excerpts below. " +
  "Name the hives involved and quote the numbers. If the excerpts do not say, reply 'Not in the logs.' " +
  "Two sentences at most.";

export const WRITER_PROMPT =
  "You are the writer for a hive-health report. Using only the findings below, write a short report " +
  "with a one-line verdict, a bullet per hive that needs attention, and a recommended next action. " +
  "Keep it under 180 words.";

export interface ChatModel {
  invoke(messages: [string, string][]): Promise<{ content: unknown }>;
}

export const GraphState = Annotation.Root({
  question: Annotation<string>(),
  subquestions: Annotation<string[]>(),
  findings: Annotation<string[]>({ reducer: (a, b) => a.concat(b), default: () => [] }),
  report: Annotation<string>(),
});

export function parseSubquestions(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw) as { subquestions?: unknown };
    if (Array.isArray(parsed.subquestions)) {
      return parsed.subquestions
        .filter((q): q is string => typeof q === "string" && q.trim().length > 0)
        .slice(0, MAX_SUBQUESTIONS);
    }
  } catch {
    // fall through to line parsing
  }
  return raw
    .split("\n")
    .map((line) => line.replace(/^\s*(?:[-*]|\d+[.)])\s*/, "").trim())
    .filter((line) => line.endsWith("?"))
    .slice(0, MAX_SUBQUESTIONS);
}

export function formatFindings(subquestions: string[], findings: string[]): string {
  return subquestions.map((q, i) => `Q${i + 1}: ${q}\nFinding: ${findings[i] ?? "n/a"}`).join("\n\n");
}

export function nextStep(state: { subquestions: string[]; findings: string[] }): "researcher" | "writer" {
  return state.findings.length < state.subquestions.length ? "researcher" : "writer";
}

export function buildGraph(deps: {
  sections: Section[];
  planner: ChatModel;
  researcher: ChatModel;
  writer: ChatModel;
}) {
  // Node names become span names in Opik, so each agent shows up under its own name.
  const planner = async (state: typeof GraphState.State) => {
    const reply = await deps.planner.invoke([
      ["system", PLANNER_PROMPT],
      ["user", state.question],
    ]);
    return { subquestions: parseSubquestions(String(reply.content)), findings: [] };
  };

  const researcher = async (state: typeof GraphState.State) => {
    const subquestion = state.subquestions[state.findings.length] ?? state.question;
    const excerpts = search(subquestion, deps.sections, SECTIONS_PER_PASS)
      .map((s) => s.text)
      .join("\n\n---\n\n");
    const reply = await deps.researcher.invoke([
      ["system", `${RESEARCHER_PROMPT}\n\n${excerpts}`],
      ["user", subquestion],
    ]);
    return { findings: [String(reply.content)] };
  };

  const writer = async (state: typeof GraphState.State) => {
    const reply = await deps.writer.invoke([
      ["system", WRITER_PROMPT],
      ["user", `${state.question}\n\n${formatFindings(state.subquestions, state.findings)}`],
    ]);
    return { report: String(reply.content) };
  };

  return new StateGraph(GraphState)
    .addNode("planner", planner)
    .addNode("researcher", researcher)
    .addNode("writer", writer)
    .addEdge(START, "planner")
    .addConditionalEdges("planner", nextStep, ["researcher", "writer"])
    .addConditionalEdges("researcher", nextStep, ["researcher", "writer"])
    .addEdge("writer", END)
    .compile();
}
