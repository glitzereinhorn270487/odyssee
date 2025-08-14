import type { RiskResult } from '../types';

export function scoreX(evt: any, risk: RiskResult): { score: number; reasons: string[] } {
  const flags = Array.isArray(risk?.flags) ? risk.flags : [];
  const penalty = Math.min(flags.length * 10, 50); // -10 pro Flag, Deckel 50
  const base = 50; // neutrale Basislinie
  const score = Math.max(0, Math.min(100, base - penalty));
  const reasons: string[] = [];
  if (flags.length) reasons.push(`risk flags: ${flags.join(', ')}`);
  return { score, reasons };
}
