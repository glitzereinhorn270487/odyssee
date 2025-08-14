import type { RiskResult } from '../types';

// TODO: Integrate real GoPlus checks. For V1.0 skeleton we return no-risk.
export async function checkRisk(mint: string): Promise<RiskResult> {
  return { risk: 0, flags: [] };
}
