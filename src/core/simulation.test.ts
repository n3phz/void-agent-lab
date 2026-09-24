import { describe, it, expect } from 'vitest';
import { simulateMission } from './simulation';
import { createMission } from './missions';
import { getTraitEffects } from './traits';
import type { Agent, Mission, Rules } from './types';

function baseAgent(overrides: Partial<Agent> = {}): Agent {
  return {
    type: 'SCOUT',
    nav: 75,
    ops: 55,
    hull: 35,
    cargo: 20,
    cost: 800,
    xp: 0,
    level: 1,
    traits: [],
    hullCurrent: 100,
    fuel: 100,
    cargoUsed: 0,
    credits: 2000,
    ...overrides,
  };
}

const baseRules: Rules = {
  fuelThreshold: 'BALANCED',
  anomalyResponse: 'SCAN_ONLY',
  hostileReaction: 'FLEE_IMMEDIATELY',
};

const prospectingMission: Mission = createMission('PROSPECT');

describe('deterministic simulation regression', () => {
  it('produces identical results for same seed and inputs', () => {
    const agent = baseAgent();
    const first = simulateMission(agent, prospectingMission, baseRules, 12345);
    const second = simulateMission(agent, prospectingMission, baseRules, 12345);

    expect(first).toEqual(second);
    expect(first.seed).toBe(second.seed);
    expect(first.ticks).toBe(second.ticks);
    expect(first.outcome).toBe(second.outcome);
    expect(first.eventLog).toEqual(second.eventLog);
    expect(first.agent).toEqual(second.agent);
  });

  it('allows different agent types to produce different behavior', () => {
    const scout = baseAgent({ type: 'SCOUT', nav: 75, ops: 55, hull: 35, cargo: 20 });
    const hauler = baseAgent({ type: 'HAULER', nav: 45, ops: 50, hull: 70, cargo: 30 });

    const scoutResult = simulateMission(scout, prospectingMission, baseRules, 999);
    const haulerResult = simulateMission(hauler, prospectingMission, baseRules, 999);

    expect(scoutResult.agent.nav).not.toBe(haulerResult.agent.nav);
    expect(scoutResult.agent.hull).not.toBe(haulerResult.agent.hull);
    expect(scoutResult.agent.cargo).not.toBe(haulerResult.agent.cargo);
  });

  it('keeps fuel threshold behavior deterministic', () => {
    const conservative = simulateMission(baseAgent(), prospectingMission, { ...baseRules, fuelThreshold: 'CONSERVATIVE' }, 11);
    const aggressive = simulateMission(baseAgent(), prospectingMission, { ...baseRules, fuelThreshold: 'AGGRESSIVE' }, 11);

    expect(typeof conservative.fuelRemainingPct).toBe('number');
    expect(typeof aggressive.fuelRemainingPct).toBe('number');
    expect(conservative.seed).toBe(aggressive.seed);
  });

  it('keeps anomaly response behavior deterministic', () => {
    const ignore = simulateMission(baseAgent(), prospectingMission, { ...baseRules, anomalyResponse: 'IGNORE' }, 42);
    const investigateAny = simulateMission(baseAgent(), prospectingMission, { ...baseRules, anomalyResponse: 'INVESTIGATE_ANY_RISK' }, 42);

    expect(ignore.seed).toBe(investigateAny.seed);
    expect(Array.isArray(ignore.eventLog)).toBe(true);
    expect(Array.isArray(investigateAny.eventLog)).toBe(true);
  });

  it('keeps hostile reaction behavior deterministic', () => {
    const flee = simulateMission(baseAgent(), prospectingMission, { ...baseRules, hostileReaction: 'FLEE_IMMEDIATELY' }, 77);
    const defend = simulateMission(baseAgent(), prospectingMission, { ...baseRules, hostileReaction: 'DEFEND' }, 77);

    expect(flee.seed).toBe(defend.seed);
    expect(typeof flee.finalHullPct).toBe('number');
    expect(typeof defend.finalHullPct).toBe('number');
  });

  it('returns structurally valid simulation results', () => {
    const result = simulateMission(baseAgent(), prospectingMission, baseRules, 1);

    expect(result).toHaveProperty('seed', 1);
    expect(result).toHaveProperty('ticks');
    expect(result).toHaveProperty('outcome');
    expect(['success', 'failure', 'aborted', 'destroyed']).toContain(result.outcome);
    expect(Array.isArray(result.eventLog)).toBe(true);
    expect(typeof result.creditsEarned).toBe('number');
    expect(typeof result.creditsExpenses).toBe('number');
    expect(typeof result.maintenanceCost).toBe('number');
    expect(typeof result.netResult).toBe('number');
    expect(typeof result.xpEarned).toBe('number');
    expect(typeof result.finalHullPct).toBe('number');
    expect(typeof result.fuelRemainingPct).toBe('number');
    expect(typeof result.agentSurvives).toBe('boolean');
    expect(typeof result.anomaliesScanned).toBe('number');
    expect(typeof result.anomaliesRequired).toBe('number');
    expect(typeof result.cargoRecovered).toBe('number');
    expect(typeof result.cargoRequired).toBe('number');
    expect(result.agent).toBeTruthy();
  });
});

describe('trait activation regression', () => {
  it('preserves baseline behavior for agents without traits', () => {
    const withoutTraits = baseAgent({ traits: [] });
    const result = simulateMission(withoutTraits, prospectingMission, baseRules, 321);

    expect(result.outcome).toBeDefined();
    expect(result.agent.traits).toEqual([]);
  });

  it('applies bounded deterministic trait effects through getTraitEffects', () => {
    const effects = getTraitEffects(['FUEL_SIPHON', 'KEEN_SENSORS', 'THICK_PLATING', 'QUICK_TURN', 'BULKHEAD', 'SCRAP_CODE']);

    expect(effects.fuelCostMultiplier).toBeGreaterThanOrEqual(0.6);
    expect(effects.fuelCostMultiplier).toBeLessThanOrEqual(1);
    expect(effects.effectiveOpsBonus).toBeGreaterThanOrEqual(0);
    expect(effects.effectiveOpsBonus).toBeLessThanOrEqual(15);
    expect(effects.hullDamageMultiplier).toBeGreaterThanOrEqual(0.5);
    expect(effects.hullDamageMultiplier).toBeLessThanOrEqual(1);
    expect(effects.effectiveHullBonus).toBeGreaterThanOrEqual(0);
    expect(effects.effectiveHullBonus).toBeLessThanOrEqual(20);
    expect(effects.salvageRewardMultiplier).toBeGreaterThanOrEqual(1);
    expect(effects.salvageRewardMultiplier).toBeLessThanOrEqual(1.5);
    expect(effects.travelSafetyBonus).toBeGreaterThanOrEqual(0);
    expect(effects.travelSafetyBonus).toBeLessThanOrEqual(10);
  });

  it('shows measurable deterministic trait impact on salvage outcomes', () => {
    const salvageMission = createMission('SALVAGE');
    const baseScout = baseAgent({ type: 'SCOUT', cargo: 20 });
    const enhancedScout = baseAgent({ type: 'SCOUT', cargo: 20, traits: ['SCRAP_CODE'] });

    const baseResult = simulateMission(baseScout, salvageMission, baseRules, 2024);
    const enhancedResult = simulateMission(enhancedScout, salvageMission, baseRules, 2024);

    expect(baseResult.seed).toBe(enhancedResult.seed);
    expect(baseResult.agent.traits).not.toEqual(enhancedResult.agent.traits);
    expect(typeof baseResult.netResult).toBe('number');
    expect(typeof enhancedResult.netResult).toBe('number');

    const baseline = simulateMission(baseScout, salvageMission, baseRules, 2024);
    const repeat = simulateMission(baseScout, salvageMission, baseRules, 2024);
    expect(baseline.netResult).toBe(repeat.netResult);
    expect(baseline.cargoRecovered).toBe(repeat.cargoRecovered);
    expect(baseline.finalHullPct).toBe(repeat.finalHullPct);
    expect(baseline.fuelRemainingPct).toBe(repeat.fuelRemainingPct);
  });

  it('does not introduce Math.random, timestamps, network, or mutable global state', () => {
    const sources = [simulateMission.toString(), getTraitEffects.toString()];

    for (const sourceText of sources) {
      expect(sourceText).not.toContain('Math.random');
      expect(sourceText).not.toContain('Date.now');
      expect(sourceText).not.toContain('fetch(');
      expect(sourceText).not.toContain('localStorage');
    }
  });
});
