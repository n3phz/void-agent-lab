export function hostileRoll(ops: number, rng: () => number): boolean {
  const base = 0.3;
  const opsBonus = (ops - 50) / 200;
  return rng() < clampChance(base + opsBonus);
}

export function clampChance(v: number): number {
  if (v < 0) return 0;
  if (v > 1) return 1;
  return v;
}

export function hostileCombatOutcome(hullPct: number, ops: number, rng: () => number): 'won' | 'lost' | 'fled' {
  const winChance = clampChance(0.4 + (ops - 50) / 200);
  if (rng() < winChance) return 'won';
  const fleeChance = clampChance(0.3 + (hullPct / 100) * 0.4);
  if (rng() < fleeChance) return 'fled';
  return 'lost';
}

export function bribeSuccess(ops: number, rng: () => number): boolean {
  return rng() < clampChance(0.5 + (ops - 50) / 250);
}