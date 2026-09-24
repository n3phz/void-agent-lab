export type TraitName = 'FUEL_SIPHON' | 'KEEN_SENSORS' | 'THICK_PLATING' | 'QUICK_TURN' | 'BULKHEAD' | 'SCRAP_CODE';

export interface TraitEffects {
  fuelCostMultiplier: number;
  effectiveOpsBonus: number;
  hullDamageMultiplier: number;
  effectiveHullBonus: number;
  salvageRewardMultiplier: number;
  travelSafetyBonus: number;
}

export function getTraitEffects(traitNames: string[]): TraitEffects {
  const effects: TraitEffects = {
    fuelCostMultiplier: 1.0,
    effectiveOpsBonus: 0,
    hullDamageMultiplier: 1.0,
    effectiveHullBonus: 0,
    salvageRewardMultiplier: 1.0,
    travelSafetyBonus: 0,
  };

  for (const name of traitNames) {
    switch (name) {
      case 'FUEL_SIPHON':
        effects.fuelCostMultiplier = Math.max(0.6, effects.fuelCostMultiplier - 0.1);
        break;
      case 'KEEN_SENSORS':
        effects.effectiveOpsBonus = Math.min(15, effects.effectiveOpsBonus + 10);
        break;
      case 'THICK_PLATING':
        effects.hullDamageMultiplier = Math.max(0.5, effects.hullDamageMultiplier - 0.15);
        break;
      case 'QUICK_TURN':
        effects.effectiveHullBonus = Math.min(20, effects.effectiveHullBonus + 10);
        effects.travelSafetyBonus = Math.min(10, effects.travelSafetyBonus + 5);
        break;
      case 'BULKHEAD':
        effects.hullDamageMultiplier = Math.max(0.5, effects.hullDamageMultiplier - 0.1);
        break;
      case 'SCRAP_CODE':
        effects.salvageRewardMultiplier = Math.min(1.5, effects.salvageRewardMultiplier + 0.2);
        break;
    }
  }

  return effects;
}
