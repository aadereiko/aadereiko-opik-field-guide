const QUOTE_TAG = /<quote>([\s\S]*?)<\/quote>/g;

export function extractQuotes(answer: string): string[] {
  return [...answer.matchAll(QUOTE_TAG)].map((m) => (m[1] ?? "").trim()).filter(Boolean);
}

const squash = (s: string) => s.replace(/\s+/g, " ").trim();

export function findMissingQuotes(quotes: string[], context: string): string[] {
  const haystack = squash(context);
  return quotes.filter((q) => !haystack.includes(squash(q)));
}
