import type { Agent } from './types';
import { FUEL } from './types';

export interface TravelResult {
  jumps: number;
  cruised: number;
  failed: boolean;
  misjump: boolean;
  fuelCost: number;
  log: string[];
}

export function travelTo(
  agent: Agent,
  destination: string,
  homeDistanceJumps: number,
  cruiseTicksPerJump: number,
  rng: () => number,
  travelSafetyBonus = 0,
  effectiveNavOverride?: number,
): TravelResult {
  const log: string[] = [];
  let jumps = 0;
  let cruised = 0;
  let failed = false;
  let misjump = false;
  let fuelCost = 0;
  const effectiveNav = effectiveNavOverride ?? agent.nav;
  const jumpChanceFail = Math.max(0, (100 - effectiveNav) / 2 - travelSafetyBonus);
  for (let j = 0; j < homeDistanceJumps; j++) {
    jumps++;
    log.push(`Jump toward ${destination}`);
    fuelCost += FUEL.JUMP;
    if (rng() * 100 < jumpChanceFail) {
      failed = true;
      misjump = true;
      log.push('Misjump');
      cruised += 2;
      fuelCost += FUEL.ANOMALY_LOW_RISK;
      break;
    }
    for (let c = 0; c < cruiseTicksPerJump; c++) {
      cruised++;
      log.push('Cruise');
      fuelCost += FUEL.CRUISE;
    }
  }
  return { jumps, cruised, failed, misjump, fuelCost, log };
}
