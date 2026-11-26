import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { freezeCard, getBalance, listTransactions } from "./bank.ts";

export const getBalanceTool = createTool({
  id: "get_balance",
  description: "Get the current balance of one account.",
  inputSchema: z.object({ account_id: z.string().describe("Account id such as CHK-2210") }),
  execute: async ({ account_id }) => getBalance(account_id),
});

export const listTransactionsTool = createTool({
  id: "list_transactions",
  description: "List recent transactions on an account, newest first, optionally filtered by category.",
  inputSchema: z.object({
    account_id: z.string(),
    limit: z.number().int().min(1).max(10).optional(),
    category: z.enum(["groceries", "dining", "transport", "salary", "utilities", "travel"]).optional(),
  }),
  execute: async ({ account_id, limit, category }) => listTransactions(account_id, limit, category),
});

export const freezeCardTool = createTool({
  id: "freeze_card",
  description: "Freeze a debit card so it cannot be used. Needs the last four digits and a short reason.",
  inputSchema: z.object({ last4: z.string().length(4), reason: z.string() }),
  execute: async ({ last4, reason }) => freezeCard(last4, reason),
});
