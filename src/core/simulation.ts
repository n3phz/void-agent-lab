import type { Agent, AgentType, Mission, Rules, EventRecord, SimulationResult, EventType, TickAction } from './types';
import { createRng } from './rng';
import { travelTo } from './travel';
import { FUEL, THRESHOLDS, AGENTS } from './types';
import { rollAnomaly, shouldInvestigate, scanSuccess, createProspectAnomalyPool, type Anomaly } from './anomalies';
import { hostileRoll, hostileCombatOutcome, bribeSuccess } from './hostiles';
import { getTraitEffects } from './traits';

function fmtTime(tick: number): string {
  const h = Math.floor(tick / 60) % 24;
  const m = tick % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function cloneAgent(a: Agent): Agent {
  return { ...a, traits: [...a.traits] };
}

export function buildAgent(type: AgentType, credits = 2000): Agent {
  const base = AGENTS[type];
  return {
    ...base,
    xp: 0,
    level: 1,
    traits: [],
    hullCurrent: 100,
    fuel: 100,
    cargoUsed: 0,
    credits,
  };
}

const TRAITS = ['FUEL_SIPHON', 'KEEN_SENSORS', 'THICK_PLATING', 'QUICK_TURN', 'BULKHEAD', 'SCRAP_CODE'];

function xpForOutcome(outcome: 'success' | 'failure'): number {
  return outcome === 'success' ? 10 : 0;
}

function hullConditionMultiplier(hullCurrent: number): number {
  return 0.5 + 0.5 * (Math.max(0, hullCurrent) / 100);
}

function applyXp(agent: Agent, xp: number): { agent: Agent; leveledUp: boolean } {
  agent.xp += xp;
  if (agent.xp >= 50 && xp > 0) {
    agent.level += 1;
    agent.xp -= 50;
    const stats: (keyof Pick<Agent, 'nav' | 'ops' | 'hull'>)[] = ['nav', 'ops', 'hull'];
    const lowest = stats.reduce((a, b) => (agent[a] <= agent[b] ? a : b));
    agent[lowest] += 5;
    if (agent.traits.length < TRAITS.length) {
      agent.traits.push(TRAITS[agent.traits.length % TRAITS.length]);
    } else {
      agent.traits.push('TRAIT_SLOT');
    }
    return { agent, leveledUp: true };
  }
  return { agent, leveledUp: false };
}

export function simulateMission(
  agent: Agent,
  mission: Mission,
  rules: Rules,
  seed: number,
): SimulationResult {
  const rng = createRng(seed);
  const a = cloneAgent(agent);
  const log: EventRecord[] = [];
  const effects = getTraitEffects(a.traits);
  const effectiveOps = Math.max(0, Math.round((a.ops + effects.effectiveOpsBonus) * hullConditionMultiplier(a.hullCurrent)));
  const effectiveNav = Math.max(0, Math.round(a.nav * hullConditionMultiplier(a.hullCurrent)));
  const threshold = THRESHOLDS[rules.fuelThreshold];
  let tick = 0;
  const maxTicks = 120;
  let outcome: SimulationResult['outcome'] = 'failure';
  let creditsEarned = 0;
  let creditsExpenses = 0;
  let maintenanceCost = 0;
  let anomaliesScanned = 0;
  let anomaliesRequired = mission.goalAnomalies ?? 0;
  let cargoRecovered = 0;
  let cargoRequired = mission.goalCargoRecover ?? mission.goalDeliver?.goods ?? 0;
  let metalsPicked = 0;
  let metalsRequired = mission.goalPickup?.metals ?? 0;
  let goodsDelivered = 0;
  let goodsRequired = mission.goalDeliver?.goods ?? 0;
  let homeJumps = 1;
  let cruisePerJump = 1 + Math.floor(rng() * 3);
  let atDestination = false;
  let missionStarted = false;
  let missionWorkTicks = 0;
  const durationMin = mission.durationMin;
  const durationMax = mission.durationMax;

  const anomalyPool: Anomaly[] = [];
  if (mission.type === 'PROSPECT') {
    const seededPool = createProspectAnomalyPool(rng);
    anomalyPool.push(...seededPool);
  }

  const travelFuel = Math.max(0, Math.round(FUEL.JUMP * effects.fuelCostMultiplier));
  const cruiseFuel = Math.max(0, Math.round(FUEL.CRUISE * effects.fuelCostMultiplier));
  const idleFuel = Math.max(0, Math.round(FUEL.IDLE * effects.fuelCostMultiplier));
  const combatFuel = Math.max(0, Math.round(FUEL.COMBAT * effects.fuelCostMultiplier));

  while (tick < maxTicks && a.hullCurrent > 0 && a.fuel > 0) {
    const fuelPct = a.fuel;
    let action: TickAction = 'IDLE_WAIT';
    let event: EventType = 'IDLE';
    let detail = '';

    // DETERMINISTIC DECISION PRIORITY (v0.1 spec)
    // IF fuel_pct <= threshold RETURN_HOME
    // ELSE IF event_pending RESOLVE_EVENT
    // ELSE IF not_at_destination TRAVEL
    // ELSE MISSION_WORK
    if (fuelPct <= threshold) {
      action = 'RETURN_HOME';
    } else if (!atDestination && !missionStarted) {
      action = 'TRAVEL';
    } else if (atDestination && !missionStarted) {
      action = 'RESOLVE_EVENT';
      missionStarted = true;
    } else if (missionStarted) {
      action = 'MISSION_WORK';
    }

    switch (action) {
      case 'RETURN_HOME': {
        const tr = travelTo(a, 'HOME', homeJumps, cruisePerJump, rng, effects.travelSafetyBonus, effectiveNav);
        tr.log.forEach(l => {
          tick++;
          const eType = l.includes('Misjump') ? 'MISJUMP' : l === 'Cruise' ? 'CRUISE' : 'JUMP';
          log.push({ tick, time: fmtTime(tick), action: 'RETURN_HOME', event: eType, detail: l, fuelPct: Math.max(0, a.fuel), hullPct: a.hullCurrent });
          if (eType === 'MISJUMP' || eType === 'JUMP') a.fuel = Math.max(0, a.fuel - travelFuel);
          if (eType === 'CRUISE') a.fuel = Math.max(0, a.fuel - cruiseFuel);
        });
        outcome = 'aborted';
        break;
      }

      case 'TRAVEL': {
        const tr = travelTo(a, mission.location, homeJumps, cruisePerJump, rng, effects.travelSafetyBonus, effectiveNav);
        tr.log.forEach(l => {
          tick++;
          const eType = l.includes('Misjump') ? 'MISJUMP' : l === 'Cruise' ? 'CRUISE' : 'JUMP';
          log.push({ tick, time: fmtTime(tick), action: 'TRAVEL', event: eType, detail: l, fuelPct: Math.max(0, a.fuel), hullPct: a.hullCurrent });
          if (eType === 'MISJUMP' || eType === 'JUMP') a.fuel = Math.max(0, a.fuel - travelFuel);
          if (eType === 'CRUISE') a.fuel = Math.max(0, a.fuel - cruiseFuel);
        });
        atDestination = !tr.failed;
        if (tr.failed) {
          a.fuel = 0;
          tick++;
          log.push({ tick, time: fmtTime(tick), action: 'IDLE_WAIT', event: 'JUMP_FAILURE', detail: 'Jump failed, stranded', fuelPct: a.fuel, hullPct: a.hullCurrent });
          break;
        }
        break;
      }

      case 'RESOLVE_EVENT': {
        if (!missionStarted) missionStarted = true;
        const hostileRollVal = hostileRoll(effectiveOps, rng);
        const anomalyRollVal = mission.type === 'PROSPECT' ? rollAnomaly(rng, effectiveOps) : false;

        if (hostileRollVal) {
          const reaction = rules.hostileReaction;
          if (reaction === 'FLEE_IMMEDIATELY') {
            event = 'HOSTILE_FLED';
            detail = 'Fled immediately';
            a.fuel = Math.max(0, a.fuel - idleFuel);
            tick++;
            log.push({ tick, time: fmtTime(tick), action, event, detail, fuelPct: a.fuel, hullPct: a.hullCurrent });
            break;
          }
          if (reaction === 'BRIBE') {
            if (bribeSuccess(effectiveOps, rng)) {
              event = 'HOSTILE_BRIBED';
              detail = 'Bribe succeeded';
              creditsExpenses += 100;
            } else {
              event = 'HOSTILE_ENCOUNTER';
              detail = 'Bribe failed, combat';
              const combat = hostileCombatOutcome(Math.max(0, a.hullCurrent + effects.effectiveHullBonus), effectiveOps, rng);
              if (combat === 'won') {
                event = 'HOSTILE_DEFEATED';
                detail = 'Combat won';
                a.hullCurrent = Math.max(0, a.hullCurrent - Math.max(0, Math.round(5 * effects.hullDamageMultiplier)));
                a.fuel = Math.max(0, a.fuel - combatFuel);
              } else if (combat === 'fled') {
                event = 'HOSTILE_FLED_COMBAT';
                detail = 'Fled after combat';
                a.fuel = Math.max(0, a.fuel - combatFuel);
              } else {
                event = 'HOSTILE_ENCOUNTER';
                detail = 'Lost combat, destroyed';
                a.hullCurrent = 0;
                a.fuel = 0;
              }
            }
            tick++;
            log.push({ tick, time: fmtTime(tick), action, event, detail, fuelPct: a.fuel, hullPct: a.hullCurrent });
            break;
          }
          if (reaction === 'DEFEND') {
            const combat = hostileCombatOutcome(Math.max(0, a.hullCurrent + effects.effectiveHullBonus), effectiveOps, rng);
            if (combat === 'won') {
              event = 'HOSTILE_DEFEATED';
              detail = 'Defensive win';
              a.hullCurrent = Math.max(0, a.hullCurrent - Math.max(0, Math.round(8 * effects.hullDamageMultiplier)));
              a.fuel = Math.max(0, a.fuel - combatFuel);
            } else if (combat === 'fled') {
              event = 'HOSTILE_FLED_COMBAT';
              detail = 'Evade failed, fled';
              a.fuel = Math.max(0, a.fuel - combatFuel);
            } else {
              event = 'HOSTILE_ENCOUNTER';
              detail = 'Defensive loss, destroyed';
              a.hullCurrent = 0;
              a.fuel = 0;
            }
            tick++;
            log.push({ tick, time: fmtTime(tick), action, event, detail, fuelPct: a.fuel, hullPct: a.hullCurrent });
            break;
          }
          // EVADE_AND_SCAN
          event = 'HOSTILE_ENCOUNTER';
          detail = 'Evaded and scanned';
          a.fuel = Math.max(0, a.fuel - idleFuel);
          tick++;
          log.push({ tick, time: fmtTime(tick), action, event, detail, fuelPct: a.fuel, hullPct: a.hullCurrent });
          break;
        }

        if (anomalyRollVal && mission.type === 'PROSPECT') {
          event = 'ANOMALY_DETECTED';
          const idx = anomalyPool.findIndex(x => !x.found);
          if (idx >= 0) {
            anomalyPool[idx].found = true;
            const risk = anomalyPool[idx].risk;
            if (shouldInvestigate(rules.anomalyResponse, risk)) {
              if (scanSuccess(effectiveOps, rng, risk)) {
                anomalyPool[idx].scanned = true;
                anomalyPool[idx].dataRecovered = true;
                anomaliesScanned++;
                event = 'ANOMALY_SCANNED';
                detail = `Anomaly scanned (${risk})`;
                creditsEarned += mission.anomalyBonus ?? 0;
                const xpGain = risk === 'high' ? 10 : 5;
                const { agent: a2, leveledUp } = applyXp(a, xpGain);
                Object.assign(a, a2);
                if (leveledUp) {
                  log.push({ tick, time: fmtTime(tick), action, event: 'LEVEL_UP', detail: `Level up to ${a.level}`, fuelPct: a.fuel, hullPct: a.hullCurrent });
                }
                const fuelBase = risk === 'high' ? FUEL.ANOMALY_HIGH_RISK : FUEL.ANOMALY_LOW_RISK;
                a.fuel = Math.max(0, a.fuel - Math.max(0, Math.round(fuelBase * effects.fuelCostMultiplier)));
              } else {
                const failEvent = risk === 'high' ? 'ANOMALY_INVESTIGATED_HIGH_RISK' : 'ANOMALY_INVESTIGATED_LOW_RISK';
                event = failEvent;
                detail = 'Scan failed';
                const fuelBase = risk === 'high' ? FUEL.ANOMALY_HIGH_RISK : FUEL.ANOMALY_LOW_RISK;
                a.fuel = Math.max(0, a.fuel - Math.max(0, Math.round(fuelBase * effects.fuelCostMultiplier)));
                if (risk === 'high') {
                  a.hullCurrent = Math.max(0, a.hullCurrent - Math.max(0, Math.round(5 * effects.hullDamageMultiplier)));
                }
              }
            } else {
              detail = 'Anomaly ignored per rules';
              a.fuel = Math.max(0, a.fuel - idleFuel);
            }
          }
          tick++;
          log.push({ tick, time: fmtTime(tick), action, event, detail, fuelPct: a.fuel, hullPct: a.hullCurrent });
          break;
        }

        event = 'IDLE';
        detail = 'No event detected';
        a.fuel = Math.max(0, a.fuel - idleFuel);
        tick++;
        log.push({ tick, time: fmtTime(tick), action, event, detail, fuelPct: a.fuel, hullPct: a.hullCurrent });
        break;
      }

      case 'MISSION_WORK': {
        missionWorkTicks++;
        if (mission.type === 'PROSPECT') {
          event = 'ANOMALY_SCANNED';
          detail = 'Prospect scanning';
          anomaliesScanned++;
          creditsEarned += mission.anomalyBonus ?? 0;
          a.fuel = Math.max(0, a.fuel - idleFuel);
          const { agent: a2, leveledUp } = applyXp(a, 1);
          Object.assign(a, a2);
          if (leveledUp) {
            log.push({ tick, time: fmtTime(tick), action, event: 'LEVEL_UP', detail: `Level up to ${a.level}`, fuelPct: a.fuel, hullPct: a.hullCurrent });
          }
        } else if (mission.type === 'SALVAGE') {
          event = 'CARGO_DAMAGED';
          detail = 'Salvage operation in progress';
          if (missionWorkTicks >= durationMax - durationMin) {
            const capacity = a.cargo;
            const recovered = Math.min(mission.goalCargoRecover ?? 1, Math.max(0, capacity));
            const finalRecovered = recovered > 0 ? Math.round(recovered * effects.salvageRewardMultiplier) : recovered;
            cargoRecovered = Math.min(capacity, finalRecovered);
            if (cargoRecovered <= 0) {
              event = 'CARGO_DAMAGED';
              detail = 'Salvage failed: insufficient cargo capacity';
            } else if (capacity >= (mission.goalCargoRecover ?? 1) * 2) {
              event = 'CARGO_DAMAGED';
              detail = 'Salvage bonus: recovered extra cargo';
              cargoRecovered = Math.min(capacity, (mission.goalCargoRecover ?? 1) * 2);
            }
          }
          a.fuel = Math.max(0, a.fuel - idleFuel);
        } else if (mission.type === 'COURIER') {
          if (goodsDelivered < goodsRequired) {
            const capacity = a.cargo;
            const canDeliver = capacity >= goodsRequired;
            if (canDeliver) {
              event = 'DELIVER_GOODS';
              const deliveryEfficiency = Math.min(1, capacity / Math.max(1, goodsRequired));
              const bonusMultiplier = 1 + Math.max(0, deliveryEfficiency - 1) * 0.5;
              detail = `Delivering contract goods (${Math.round(deliveryEfficiency * 100)}% capacity utilization)`;
              goodsDelivered = goodsRequired;
              if (bonusMultiplier > 1) {
                event = 'DELIVER_GOODS';
                detail = `Courier bonus: efficient delivery with ${Math.round((bonusMultiplier - 1) * 100)}% capacity surplus`;
              }
            } else {
              event = 'CARGO_DAMAGED';
              detail = 'Courier failed: insufficient cargo capacity for delivery';
            }
          } else if (metalsPicked < metalsRequired) {
            event = 'PICKUP_GOODS';
            detail = 'Picking up rare metals';
            metalsPicked = metalsRequired;
          }
          a.fuel = Math.max(0, a.fuel - idleFuel);
        }
        tick++;
        log.push({ tick, time: fmtTime(tick), action, event, detail, fuelPct: a.fuel, hullPct: a.hullCurrent });
        break;
      }

      case 'IDLE_WAIT': {
        event = 'IDLE';
        detail = 'Waiting';
        a.fuel = Math.max(0, a.fuel - idleFuel);
        tick++;
        log.push({ tick, time: fmtTime(tick), action, event, detail, fuelPct: a.fuel, hullPct: a.hullCurrent });
        break;
      }
    }

    // Check mission completion
    if (missionStarted) {
      let complete = false;
      if (mission.type === 'PROSPECT') complete = anomaliesScanned >= anomaliesRequired;
      else if (mission.type === 'SALVAGE') complete = cargoRecovered >= cargoRequired;
      else if (mission.type === 'COURIER') complete = goodsDelivered >= goodsRequired && metalsPicked >= metalsRequired;
      if (complete) {
        outcome = 'success';
        let rewardRoll = rng() * (mission.rewardMax - mission.rewardMin);
        let baseReward = Math.floor(mission.rewardMin + rewardRoll);
        if (mission.type === 'SALVAGE') {
          const capacityRatio = a.cargo / Math.max(1, mission.goalCargoRecover ?? 1);
          const salvageMultiplier = Math.min(2, 0.5 + capacityRatio * 0.5);
          baseReward = Math.floor(baseReward * salvageMultiplier * effects.salvageRewardMultiplier);
        } else if (mission.type === 'COURIER') {
          const capacityRatio = a.cargo / Math.max(1, goodsRequired);
          const courierMultiplier = Math.min(1.5, 0.8 + capacityRatio * 0.2);
          baseReward = Math.floor(baseReward * courierMultiplier);
        }
        creditsEarned += baseReward;
        const { agent: a2 } = applyXp(a, xpForOutcome('success'));
        Object.assign(a, a2);
        break;
      }
    }

    if (missionStarted && missionWorkTicks >= durationMax - durationMin + 1) {
      outcome = 'failure';
      break;
    }
    if (a.hullCurrent <= 0 || a.fuel <= 0) {
      outcome = 'destroyed';
      break;
    }
  }

  if (a.hullCurrent < 100) {
    maintenanceCost = (100 - a.hullCurrent) * 10;
    creditsExpenses += maintenanceCost;
  }

  const result: SimulationResult = {
    seed,
    ticks: tick,
    outcome,
    eventLog: log,
    creditsEarned,
    creditsExpenses,
    maintenanceCost,
    netResult: creditsEarned - creditsExpenses,
    xpEarned: a.xp,
    finalHullPct: a.hullCurrent,
    fuelRemainingPct: a.fuel,
    agentSurvives: a.hullCurrent > 0 && a.fuel > 0,
    anomaliesScanned,
    anomaliesRequired,
    cargoRecovered,
    cargoRequired,
    agent: a,
  };
  return result;
}
