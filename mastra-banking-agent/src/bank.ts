export type Account = { id: string; holder: string; type: "checking" | "savings"; balanceCents: number };
export type Transaction = {
  id: string;
  accountId: string;
  date: string;
  merchant: string;
  category: "groceries" | "dining" | "transport" | "salary" | "utilities" | "travel";
  amountCents: number;
};
export type Card = { last4: string; accountId: string; status: "active" | "frozen"; frozenReason?: string };

export const accounts: Account[] = [
  { id: "CHK-2210", holder: "Ines Varga", type: "checking", balanceCents: 184_233 },
  { id: "SAV-9981", holder: "Ines Varga", type: "savings", balanceCents: 1_250_000 },
];

export const transactions: Transaction[] = [
  { id: "T-501", accountId: "CHK-2210", date: "2026-11-24", merchant: "Fernhill Market", category: "groceries", amountCents: -6_480 },
  { id: "T-502", accountId: "CHK-2210", date: "2026-11-23", merchant: "Kestrel Air", category: "travel", amountCents: -48_900 },
  { id: "T-503", accountId: "CHK-2210", date: "2026-11-22", merchant: "Noodle Lantern", category: "dining", amountCents: -2_350 },
  { id: "T-504", accountId: "CHK-2210", date: "2026-11-20", merchant: "Northgate Metro", category: "transport", amountCents: -1_800 },
  { id: "T-505", accountId: "CHK-2210", date: "2026-11-15", merchant: "Halden Robotics Payroll", category: "salary", amountCents: 312_000 },
  { id: "T-506", accountId: "CHK-2210", date: "2026-11-12", merchant: "Brightwater Utilities", category: "utilities", amountCents: -9_410 },
  { id: "T-507", accountId: "CHK-2210", date: "2026-11-10", merchant: "Kestrel Air", category: "travel", amountCents: -48_900 },
  { id: "T-601", accountId: "SAV-9981", date: "2026-11-01", merchant: "Interest", category: "salary", amountCents: 2_083 },
];

export const cards: Card[] = [
  { last4: "4417", accountId: "CHK-2210", status: "active" },
  { last4: "0952", accountId: "CHK-2210", status: "active" },
];

export const formatMoney = (cents: number): string =>
  `${cents < 0 ? "-" : ""}$${(Math.abs(cents) / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;

export function getBalance(accountId: string) {
  const account = accounts.find((a) => a.id === accountId);
  if (!account) return { error: `No account ${accountId}` };
  return { accountId, type: account.type, balance: formatMoney(account.balanceCents), balanceCents: account.balanceCents };
}

export function listTransactions(accountId: string, limit = 5, category?: Transaction["category"]) {
  if (!accounts.some((a) => a.id === accountId)) return { error: `No account ${accountId}` };
  const rows = transactions
    .filter((t) => t.accountId === accountId && (!category || t.category === category))
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, limit)
    .map((t) => ({ id: t.id, date: t.date, merchant: t.merchant, category: t.category, amount: formatMoney(t.amountCents) }));
  return { accountId, count: rows.length, transactions: rows };
}

export function freezeCard(last4: string, reason: string) {
  const card = cards.find((c) => c.last4 === last4);
  if (!card) return { error: `No card ending in ${last4}` };
  if (card.status === "frozen") return { last4, status: "frozen", note: "Card was already frozen" };
  card.status = "frozen";
  card.frozenReason = reason;
  return { last4, status: card.status, reason };
}
