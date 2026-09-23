import type { Rules } from './types';

export interface Anomaly {
  risk: 'low' | 'high';
  found: boolean;
  scanned: boolean;
  dataRecovered: boolean;
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
  if (response === 'SCAN_ONLY') return true;
  if (response === 'INVESTIGATE_LOW_RISK') return risk === 'low';
  if (response === 'INVESTIGATE_ANY_RISK') return true;
  return false;
}

export function scanSuccess(ops: number, rng: () => number): boolean {
  const base = 0.6;
  const opsBonus = (ops - 50) / 150;
  return rng() < clampChance(base + opsBonus);
}
