import { Agent } from "@mastra/core/agent";
import { openai } from "@ai-sdk/openai";
import { freezeCardTool, getBalanceTool, listTransactionsTool } from "./tools.ts";

export const bankingAgent = new Agent({
  id: "banking-agent",
  name: "marlowe-banking-agent",
  instructions:
    "You are the personal-banking assistant for Marlowe Credit Union. The signed-in customer is Ines Varga, " +
    "who owns checking account CHK-2210 and savings account SAV-9981. " +
    "Ground every figure in tool results; never guess a balance or a transaction. " +
    "Call get_balance for balances and list_transactions for spending questions. " +
    "Only call freeze_card when the customer clearly asks to freeze a specific card, and say plainly if the tool reports an error. " +
    "Be brief: 2-4 sentences, no bullet lists.",
  model: openai("gpt-4o-mini"),
  tools: { getBalanceTool, listTransactionsTool, freezeCardTool },
});
