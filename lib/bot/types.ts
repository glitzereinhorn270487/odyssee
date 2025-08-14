export interface QuickNodeEvent {
  id?: string;
  source?: string;
  data?: unknown;
 }

export interface RiskResult { risk: number; flags: string[]; }
export interface ScoreXResult { score: number; reasons: string[]; }

