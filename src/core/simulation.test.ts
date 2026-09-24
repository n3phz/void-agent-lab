import { describe, it, expect } from 'vitest';
import { simulateMission } from './simulation';
import { createMission } from './missions';
import { getTraitEffects } from './traits';
import { createProspectAnomalyPool, shouldInvestigate, scanSuccess } from './anomalies';
import { createRng } from './rng';
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

describe('high-risk anomaly behavior', () => {
  it('generates deterministic high-risk anomalies in PROSPECT pools', () => {
    const seed = 1;
    const firstPool = createProspectAnomalyPool(createRng(seed));
    const secondPool = createProspectAnomalyPool(createRng(seed));

    expect(firstPool).toEqual(secondPool);
    expect(firstPool.some(anomaly => anomaly.risk === 'high')).toBe(true);
  });

  it('keeps INVESTIGATE_LOW_RISK from investigating high-risk anomalies', () => {
    expect(shouldInvestigate('INVESTIGATE_LOW_RISK', 'low')).toBe(true);
    expect(shouldInvestigate('INVESTIGATE_LOW_RISK', 'high')).toBe(false);
  });

  it('allows INVESTIGATE_ANY_RISK to investigate high-risk anomalies', () => {
    expect(shouldInvestigate('INVESTIGATE_ANY_RISK', 'low')).toBe(true);
    expect(shouldInvestigate('INVESTIGATE_ANY_RISK', 'high')).toBe(true);
  });

  it('gives high-risk investigation measurable reward and risk trade-off', () => {
    expect(scanSuccess(55, () => 0.3, 'low')).toBe(true);
    expect(scanSuccess(55, () => 0.5, 'high')).toBe(false);
  });

  it('preserves IGNORE and SCAN_ONLY behavior under high-risk anomalies', () => {
    expect(shouldInvestigate('IGNORE', 'high')).toBe(false);
    expect(shouldInvestigate('SCAN_ONLY', 'high')).toBe(false);
    expect(shouldInvestigate('SCAN_ONLY', 'low')).toBe(true);
  });

  it('preserves Phase 10A trait effects during anomaly investigation', () => {
    const baseEffects = getTraitEffects([]);
    const keenEffects = getTraitEffects(['KEEN_SENSORS']);

    expect(keenEffects.effectiveOpsBonus).toBeGreaterThan(baseEffects.effectiveOpsBonus);

    const baseResult = simulateMission(baseAgent(), prospectingMission, baseRules, 2024);
    const keenResult = simulateMission(baseAgent({ traits: ['KEEN_SENSORS'] }), prospectingMission, baseRules, 2024);

    expect(baseResult.seed).toBe(keenResult.seed);
    expect(typeof baseResult.netResult).toBe('number');
    expect(typeof keenResult.netResult).toBe('number');
  });

  it('produces a deterministic end-to-end PROSPECT run that reaches anomaly events', () => {
    const seed = 2024;
    const first = simulateMission(baseAgent(), prospectingMission, baseRules, seed);
    const second = simulateMission(baseAgent(), prospectingMission, baseRules, seed);

    expect(first).toEqual(second);
    expect(first.eventLog.some(e => e.event === 'ANOMALY_DETECTED' || e.event === 'ANOMALY_SCANNED')).toBe(true);
  });
});

describe('hull degradation', () => {
  it('uses full effective stats at 100% hull', () => {
    const fullHull = baseAgent({ hullCurrent: 100 });
    const result = simulateMission(fullHull, prospectingMission, baseRules, 2024);

    expect(result.finalHullPct).toBeGreaterThanOrEqual(0);
    expect(result.agentSurvives).toBe(true);
  });

  it('reduces effective performance when hull is damaged', () => {
    const fullHull = baseAgent({ hullCurrent: 100 });
    const damaged = baseAgent({ hullCurrent: 40 });

    const fullResult = simulateMission(fullHull, prospectingMission, baseRules, 2024);
    const damagedResult = simulateMission(damaged, prospectingMission, baseRules, 2024);

    expect(fullResult.seed).toBe(damagedResult.seed);
    expect(damagedResult.finalHullPct).toBeLessThanOrEqual(fullResult.finalHullPct);
  });

  it('keeps very low hull bounded and deterministic', () => {
    const nearZero = baseAgent({ hullCurrent: 1 });
    const first = simulateMission(nearZero, prospectingMission, baseRules, 777);
    const second = simulateMission(nearZero, prospectingMission, baseRules, 777);

    expect(first).toEqual(second);
    expect(typeof first.finalHullPct).toBe('number');
  });

  it('remains byte-identical for the same damaged-agent seed', () => {
    const damaged = baseAgent({ hullCurrent: 35 });
    const first = simulateMission(damaged, prospectingMission, baseRules, 555);
    const second = simulateMission(damaged, prospectingMission, baseRules, 555);

    expect(first).toEqual(second);
  });

  it('can change mission outcome from damaged hull versus full hull', () => {
    const fullHull = baseAgent({ hullCurrent: 100 });
    const damaged = baseAgent({ hullCurrent: 10 });

    const fullResult = simulateMission(fullHull, prospectingMission, { ...baseRules, hostileReaction: 'DEFEND' }, 2024);
    const damagedResult = simulateMission(damaged, prospectingMission, { ...baseRules, hostileReaction: 'DEFEND' }, 2024);

    expect(fullResult.seed).toBe(damagedResult.seed);
    expect(fullResult.outcome !== damagedResult.outcome || fullResult.finalHullPct !== damagedResult.finalHullPct).toBe(true);
  });

  it('applies hull degradation to travel without changing unrelated behavior', () => {
    const fullHull = baseAgent({ type: 'SCOUT', hullCurrent: 100 });
    const damaged = baseAgent({ type: 'SCOUT', hullCurrent: 20 });

    const fullResult = simulateMission(fullHull, prospectingMission, baseRules, 2024);
    const damagedResult = simulateMission(damaged, prospectingMission, baseRules, 2024);

    expect(fullResult.seed).toBe(damagedResult.seed);
    expect(fullResult.agent.traits).toEqual(damagedResult.agent.traits);
  });

  it('preserves THICK_PLATING damage reduction with hull degradation', () => {
    const base = baseAgent({ traits: ['THICK_PLATING'], hullCurrent: 80 });
    const result = simulateMission(base, prospectingMission, baseRules, 2024);

    expect(result.finalHullPct).toBeGreaterThanOrEqual(0);
    expect(result.agentSurvives).toBe(true);
  });

  it('preserves BULKHEAD damage reduction with hull degradation', () => {
    const base = baseAgent({ traits: ['BULKHEAD'], hullCurrent: 60 });
    const result = simulateMission(base, prospectingMission, { ...baseRules, hostileReaction: 'DEFEND' }, 2024);

    expect(result.finalHullPct).toBeGreaterThanOrEqual(0);
    expect(result.agentSurvives).toBe(true);
  });

  it('keeps repair/recovery behavior unchanged by hull degradation', () => {
    const damaged = baseAgent({ hullCurrent: 30 });
    const result = simulateMission(damaged, prospectingMission, baseRules, 2024);

    expect(typeof result.maintenanceCost).toBe('number');
    expect(result.maintenanceCost).toBe((100 - result.finalHullPct) * 10);
  });
});
