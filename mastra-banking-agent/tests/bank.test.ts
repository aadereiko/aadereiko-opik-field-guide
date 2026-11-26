import { describe, expect, it } from "vitest";
import { formatMoney, freezeCard, getBalance, listTransactions } from "../src/bank.ts";
import { freezeCardTool, getBalanceTool, listTransactionsTool } from "../src/tools.ts";

describe("bank logic", () => {
  it("formats cents as dollars", () => {
    expect(formatMoney(184_233)).toBe("$1,842.33");
    expect(formatMoney(-6_480)).toBe("-$64.80");
  });

  it("reports an unknown account as an error object, not a throw", () => {
    expect(getBalance("CHK-0000")).toEqual({ error: "No account CHK-0000" });
  });

  it("lists transactions newest first and honours limit and category", () => {
    const latest = listTransactions("CHK-2210", 2);
    expect(latest).toMatchObject({ count: 2 });
    expect((latest as any).transactions[0].id).toBe("T-501");

    const travel = listTransactions("CHK-2210", 10, "travel") as any;
    expect(travel.transactions.map((t: any) => t.merchant)).toEqual(["Kestrel Air", "Kestrel Air"]);
  });

  it("freezes a card once, then says it was already frozen", () => {
    expect(freezeCard("0952", "Lost")).toMatchObject({ status: "frozen", reason: "Lost" });
    expect(freezeCard("0952", "Lost")).toMatchObject({ note: "Card was already frozen" });
  });

  it("returns an error for a card that does not exist", () => {
    expect(freezeCard("1234", "test")).toEqual({ error: "No card ending in 1234" });
  });
});

describe("tools run as plain functions with no tracing configured", () => {
  const ctx = {} as never;

  it("get_balance", async () => {
    const out = await getBalanceTool.execute!({ account_id: "SAV-9981" }, ctx);
    expect(out).toMatchObject({ balance: "$12,500.00" });
  });

  it("list_transactions", async () => {
    const out = (await listTransactionsTool.execute!({ account_id: "CHK-2210", category: "salary" }, ctx)) as any;
    expect(out.transactions).toHaveLength(1);
  });

  it("freeze_card surfaces tool errors to the model", async () => {
    const out = await freezeCardTool.execute!({ last4: "9999", reason: "x" }, ctx);
    expect(out).toEqual({ error: "No card ending in 9999" });
  });
});
