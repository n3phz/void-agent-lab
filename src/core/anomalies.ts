import type { Rules } from './types';

export interface Anomaly {
  risk: 'low' | 'high';
  found: boolean;
  scanned: boolean;
  dataRecovered: boolean;
}

export function rollAnomalyRisk(rng: () => number): 'low' | 'high' {
  return rng() < 0.25 ? 'high' : 'low';
}

export function createProspectAnomalyPool(rng: () => number): Anomaly[] {
  const pool: Anomaly[] = [];
  for (let i = 0; i < 6; i++) {
    const risk = rollAnomalyRisk(rng);
    pool.push({ risk, found: false, scanned: false, dataRecovered: false });
  }
  return pool;
}

export function rollAnomaly(rng: () => number, ops: number): boolean {
  const base = 0.35;
  const opsBonus = (ops - 50) / 200;
  return rng() < clampChance(base + opsBonus);
}

export function clampChance(v: number): number {
  if (v < 0) return 0;
  if (v > 1) return 1;
  return v;
}

export function shouldInvestigate(response: Rules['anomalyResponse'], risk: 'low' | 'high'): boolean {
  if (response === 'IGNORE') return false;
  if (response === 'SCAN_ONLY') return risk === 'low';
  if (response === 'INVESTIGATE_LOW_RISK') return risk === 'low';
  if (response === 'INVESTIGATE_ANY_RISK') return true;
  return false;
}

export function scanSuccess(ops: number, rng: () => number, risk: 'low' | 'high' = 'low'): boolean {
  const base = 0.6;
  const opsBonus = (ops - 50) / 150;
  const riskPenalty = risk === 'high' ? -0.2 : 0;
  return rng() < clampChance(base + opsBonus + riskPenalty);
}
