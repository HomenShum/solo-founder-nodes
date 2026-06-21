// Deterministic hashing primitives for the eval ledger (S16 hash-chain, S12 sealed manifest).
import { createHash, createHmac } from "node:crypto";

export const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");
export const hmac = (salt: string, s: string) => createHmac("sha256", salt).update(s).digest("hex");

// Stable, key-sorted canonical JSON so a row's hash is reproducible regardless of field order.
export function canon(o: unknown): string {
  if (o === null || typeof o !== "object") return JSON.stringify(o);
  if (Array.isArray(o)) return "[" + o.map(canon).join(",") + "]";
  const keys = Object.keys(o as Record<string, unknown>).sort();
  return "{" + keys.map((k) => JSON.stringify(k) + ":" + canon((o as Record<string, unknown>)[k])).join(",") + "}";
}
