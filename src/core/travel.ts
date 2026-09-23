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
): TravelResult {
  const log: string[] = [];
  let jumps = 0;
  let cruised = 0;
  let failed = false;
  let misjump = false;
  let fuelCost = 0;
  const jumpChanceFail = (100 - agent.nav) / 2;
  for (let j = 0; j < homeDistanceJumps; j++) {
    jumps++;
    log.push(`Jump toward ${destination}`);
    fuelCost += FUEL.JUMP;
    if (rng() * 100 < jumpChanceFail) {
      failed = true;
      misjump = true;
      log.push('Misjump');
      cruised += 2;
      fuelCost += FUEL.ANOMALY_LOW_RISK; // misjump = +5 fuel (percentage points)
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
