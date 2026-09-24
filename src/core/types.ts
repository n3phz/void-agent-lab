// VOID // AGENT LAB — Phase 1 core types
// v0.1 specification types for deterministic simulation

export type AgentType = 'SCOUT' | 'HAULER';
export type MissionType = 'PROSPECT' | 'SALVAGE' | 'COURIER';
export type FuelThreshold = 'CONSERVATIVE' | 'BALANCED' | 'AGGRESSIVE' | 'RECKLESS';
export type TravelMode = 'CONSERVATIVE' | 'BALANCED' | 'AGGRESSIVE';
export type AnomalyResponse = 'IGNORE' | 'SCAN_ONLY' | 'INVESTIGATE_LOW_RISK' | 'INVESTIGATE_ANY_RISK';
export type HostileReaction = 'FLEE_IMMEDIATELY' | 'EVADE_AND_SCAN' | 'DEFEND' | 'BRIBE';
export type TickAction = 'RETURN_HOME' | 'RESOLVE_EVENT' | 'TRAVEL' | 'IDLE_WAIT' | 'MISSION_WORK';

export type EventType =
  | 'ANOMALY_DETECTED'
  | 'ANOMALY_SCANNED'
  | 'ANOMALY_INVESTIGATED_LOW_RISK'
  | 'ANOMALY_INVESTIGATED_HIGH_RISK'
  | 'HOSTILE_ENCOUNTER'
  | 'HOSTILE_FLED'
  | 'HOSTILE_DEFEATED'
  | 'HOSTILE_BRIBED'
  | 'HOSTILE_FLED_COMBAT'
  | 'JUMP'
  | 'CRUISE'
  | 'MISJUMP'
  | 'JUMP_FAILURE'
  | 'CARGO_DAMAGED'
  | 'HULL_DAMAGE'
  | 'XP_EARNED'
  | 'LEVEL_UP'
  | 'AGENT_DESTROYED'
  | 'MISSION_COMPLETE'
  | 'MISSION_FAILED'
  | 'OUT_OF_FUEL'
  | 'REACHED_HOME'
  | 'DELIVER_GOODS'
  | 'PICKUP_GOODS'
  | 'MAINTENANCE'
  | 'IDLE';

export interface Agent {
  type: AgentType;
  nav: number;
  ops: number;
  hull: number;
  cargo: number;
  cost: number;
  xp: number;
  level: number;
  traits: string[];
  hullCurrent: number; // 0-100 %
  fuel: number;        // 0-100 %
  cargoUsed: number;
  credits: number;
}

export interface Mission {
  type: MissionType;
  location: string;
  goalAnomalies?: number;
  goalCargoRecover?: number;
  goalDeliver?: { goods: number; metals: number };
  goalPickup?: { goods: number; metals: number };
  durationMin: number;
  durationMax: number;
  rewardMin: number;
  rewardMax: number;
  anomalyBonus?: number;
  risk: 'low' | 'medium';
}

export interface Rules {
  fuelThreshold: FuelThreshold;
  travelMode: TravelMode;
  anomalyResponse: AnomalyResponse;
  hostileReaction: HostileReaction;
}

export interface EventRecord {
  tick: number;
  time: string;
  action: TickAction;
  event: EventType;
  detail: string;
  fuelPct: number;
  hullPct: number;
}

export interface SimulationResult {
  seed: number;
  ticks: number;
  outcome: 'success' | 'failure' | 'aborted' | 'destroyed';
  eventLog: EventRecord[];
  creditsEarned: number;
  creditsExpenses: number;
  maintenanceCost: number;
  netResult: number;
  xpEarned: number;
  finalHullPct: number;
  fuelRemainingPct: number;
  agentSurvives: boolean;
  anomaliesScanned: number;
  anomaliesRequired: number;
  cargoRecovered: number;
  cargoRequired: number;
  agent: Agent;
}

// v0.1 Agent definitions (exact)
export const AGENTS: Record<AgentType, Omit<Agent, 'xp' | 'level' | 'traits' | 'hullCurrent' | 'fuel' | 'cargoUsed' | 'credits'>> = {
  SCOUT: { type: 'SCOUT', nav: 75, ops: 55, hull: 35, cargo: 20, cost: 800 },
  HAULER: { type: 'HAULER', nav: 45, ops: 50, hull: 70, cargo: 30, cost: 1000 },
};

// Fuel threshold percentages (v0.1 spec)
export const THRESHOLDS: Record<FuelThreshold, number> = {
  CONSERVATIVE: 50,
  BALANCED: 30,
  AGGRESSIVE: 15,
  RECKLESS: 5,
};

export const TRAVEL_MODE: Record<TravelMode, { cruiseTicks: number; fuelMultiplier: number; riskDelta: number }> = {
  CONSERVATIVE: { cruiseTicks: 2, fuelMultiplier: 0.75, riskDelta: -8 },
  BALANCED: { cruiseTicks: 1, fuelMultiplier: 1, riskDelta: 0 },
  AGGRESSIVE: { cruiseTicks: 0, fuelMultiplier: 1.35, riskDelta: 10 },
};

// Fuel consumption per action type (v0.1 spec)
export const FUEL: Record<string, number> = {
  JUMP: 8,
  CRUISE: 2,
  ANOMALY_LOW_RISK: 5,
  ANOMALY_HIGH_RISK: 10,
  COMBAT: 10,
  IDLE: 1,
};

export const ANOMALY_RISK = { LOW: 'low' as const, HIGH: 'high' as const };