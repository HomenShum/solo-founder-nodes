// S13 — content gate for memory: detect held-out gold leaking into a memory write,
// regardless of the caller's self-declared benchmarkSafety label. Shingle overlap + numeric tokens
// (rubric numbers are the most common laundered answer-key). Local, deterministic, no model needed.

export function shingles(text: string, k = 4): Set<string> {
  const toks = text.toLowerCase().match(/[a-z0-9.$%/-]+/g) ?? [];
  const out = new Set<string>();
  for (let i = 0; i + k <= toks.length; i++) out.add(toks.slice(i, i + k).join(" "));
  // numeric tokens alone — gold figures (prices, multiples, dates) leak as answer-keys
  for (const t of toks) if (/\d/.test(t)) out.add("#" + t);
  return out;
}

export function overlap(a: Set<string>, b: Set<string>): number {
  if (a.size === 0) return 0;
  let n = 0;
  for (const s of a) if (b.has(s)) n++;
  return n / a.size;
}

// Build the sealed-gold fingerprint ONCE from the held-out gold corpus — out of the agent's reach.
export function sealGold(goldTexts: string[], k = 4): Set<string> {
  const out = new Set<string>();
  for (const t of goldTexts) for (const s of shingles(t, k)) out.add(s);
  return out;
}

// Returns a reject reason if the write shares more than `threshold` of its shingles with sealed gold.
export function contentGate(sealedGold: Set<string>, writeText: string, threshold = 0.12): string | null {
  const o = overlap(shingles(writeText), sealedGold);
  return o > threshold ? `heldout_gold_overlap=${o.toFixed(2)}>${threshold}` : null;
}
