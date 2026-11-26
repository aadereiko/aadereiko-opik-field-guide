import { ReActAgent } from "beeai-framework/agents/react/agent";
import { OpenAIChatModel } from "beeai-framework/adapters/openai/backend/chat";
import { UnconstrainedMemory } from "beeai-framework/memory/unconstrainedMemory";
import { MODEL_NAME } from "./model.ts";
import { ALL_TOOLS } from "./tools.ts";

const CARE_INSTRUCTIONS = `You are the tank-care assistant at Reefside Aquatics, a fictional fish shop.

Answer the customer's question about their aquarium. Rules:
- Never state a safe range, a compatibility verdict or a dose from memory. Use check_water_parameters, check_compatibility and compute_dose, and base your answer on what they return.
- If a customer asks several things, call every tool you need before answering.
- Finish with a short plain-language answer: what is wrong (if anything), what to do, and any warning from the tool notes.`;

export function createCareAgent(): ReActAgent {
  return new ReActAgent({
    llm: new OpenAIChatModel(MODEL_NAME),
    tools: ALL_TOOLS,
    memory: new UnconstrainedMemory(),
  });
}

export async function answerQuestion(question: string): Promise<string> {
  const agent = createCareAgent();
  const response = await agent.run(
    { prompt: `${CARE_INSTRUCTIONS}\n\nCustomer: "${question}"` },
    { execution: { maxRetriesPerStep: 3, totalMaxRetries: 10, maxIterations: 8 } },
  );
  return response.result.text;
}
