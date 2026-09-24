// VOID // AGENT LAB Phase 2 — Game state management and persistence

import type { Agent, AgentType, Mission, MissionType, Rules, SimulationResult } from './core/types';
import { buildAgent, simulateMission } from './core/simulation';
import { createMission } from './core/missions';

// Screen enum for navigation
export type Screen = 'station' | 'agent_creation' | 'agent_configuration' | 'agent_blueprint' | 'mission_selection' | 'simulation' | 'mission_report';

// Game state
export interface GameState {
  credits: number;
  agents: Agent[];
  selectedAgentIndex: number | null;
  selectedMission: MissionType | null;
  rules: Rules;
  simulationResult: SimulationResult | null;
  simulationSeed: number;
  simulationSpeed: number; // 1, 5, 10
  screen: Screen;
  missionHistory: SimulationResult[];
}

// Initial game state
export const INITIAL_STATE: GameState = {
  credits: 2000,
  agents: [],
  selectedAgentIndex: null,
  selectedMission: null,
  rules: {
    fuelThreshold: 'BALANCED',
    travelMode: 'BALANCED',
    anomalyResponse: 'SCAN_ONLY',
    hostileReaction: 'FLEE_IMMEDIATELY'
  },
  simulationResult: null,
  simulationSeed: 1337,
  simulationSpeed: 1,
  screen: 'station',
  missionHistory: []
};

// LocalStorage persistence
const STATE_KEY = '***';

export function loadState(): GameState {
  try {
    const saved = localStorage.getItem(STATE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Validate required fields
      if (
        typeof parsed.credits === 'number' &&
        Array.isArray(parsed.agents) &&
        typeof parsed.rules === 'object' &&
        typeof parsed.screen === 'string'
      ) {
        return { ...INITIAL_STATE, ...parsed };
      }
    }
  } catch (e) {
    console.warn('Failed to load game state:', e);
  }
  return { ...INITIAL_STATE };
}

export function saveState(state: GameState): void {
  try {
    localStorage.setItem(STATE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('Failed to save game state:', e);
  }
}

// Agent type definitions for display
export interface AgentTypeInfo {
  type: AgentType;
  name: string;
  cost: number;
  nav: number;
  ops: number;
  hull: number;
  cargo: number;
  description: string;
}

export const AGENT_TYPES: AgentTypeInfo[] = [
  { type: 'SCOUT', name: 'Scout', cost: 800, nav: 75, ops: 55, hull: 35, cargo: 20, description: 'Fast explorer with high navigation skill. Ideal for prospecting anomalies.' },
  { type: 'HAULER', name: 'Hauler', cost: 1000, nav: 45, ops: 50, hull: 70, cargo: 30, description: 'Heavy-duty vessel with large cargo capacity and strong hull integrity.' }
];

// Mission info for display
export interface MissionInfo {
  type: MissionType;
  name: string;
  location: string;
  risk: 'low' | 'medium';
  rewardMin: number;
  rewardMax: number;
  durationMin: number;
  durationMax: number;
  description: string;
}

export const MISSION_TYPES: MissionInfo[] = [
  { type: 'PROSPECT', name: 'PROSPECT', location: 'KELPER-3', risk: 'low', rewardMin: 800, rewardMax: 1500, durationMin: 24, durationMax: 36, description: 'Survey anomalies and recover data. Higher reward potential with anomaly bonuses.' },
  { type: 'SALVAGE', name: 'SALVAGE', location: 'DERELICT-RING', risk: 'medium', rewardMin: 0, rewardMax: 2500, durationMin: 36, durationMax: 48, description: 'Recover cargo from derelict vessels in a hazardous debris field.' },
  { type: 'COURIER', name: 'COURIER', location: 'OUTPOST-7 → HUB', risk: 'medium', rewardMin: 1500, rewardMax: 2500, durationMin: 30, durationMax: 42, description: 'High-value transport of goods and rare metals between stations.' }
];

// Create a new agent
export function createAgent(type: AgentType, name: string, credits: number): { agent: Agent; remainingCredits: number } | null {
  const cost = type === 'SCOUT' ? 800 : 1000;
  if (credits < cost) return null;
  
  const agent = buildAgent(type, credits - cost);
  return {
    agent: {
      ...agent,
      traits: [name, ...agent.traits]
    },
    remainingCredits: credits - cost
  };
}

// Get agent's display name (stored in traits[0])
export function getAgentName(agent: Agent): string {
  return agent.traits[0] || 'Unnamed Agent';
}

// Select mission by type
export function getMission(type: MissionType): Mission {
  return createMission(type);
}

// Run deterministic simulation
export function runSimulation(
  agent: Agent,
  mission: Mission,
  rules: Rules,
  seed: number
): SimulationResult {
  return simulateMission(agent, mission, rules, seed);
}

// Generate a deterministic mission seed based on current seed
export function generateMissionSeed(currentSeed: number): number {
  return currentSeed + 1;
}

// Calculate maintenance cost based on hull damage from simulation result
export function getMaintenanceCostFromResult(finalHullPct: number): number {
  return (100 - finalHullPct) * 10;
}

// Repair cost: 1 CR per 1% hull restored. Never exceeds maximum hull.
export function repairAgent(agent: Agent, credits: number): { agent: Agent; spent: number; canAfford: boolean } {
  if (agent.hullCurrent >= 100) {
    return { agent, spent: 0, canAfford: true };
  }

  const hullToRepair = 100 - agent.hullCurrent;
  const cost = Math.ceil(hullToRepair);
  const canAfford = credits >= cost;

  if (!canAfford) {
    return { agent, spent: 0, canAfford: false };
  }

  const repaired = { ...agent, hullCurrent: 100 };
  return { agent: repaired, spent: cost, canAfford: true };
}

// Refuel cost: 1 CR per 1% fuel restored. Never exceeds maximum fuel.
export function refuelAgent(agent: Agent, credits: number): { agent: Agent; spent: number; canAfford: boolean } {
  if (agent.fuel >= 100) {
    return { agent, spent: 0, canAfford: true };
  }

  const fuelToRefuel = 100 - agent.fuel;
  const cost = Math.ceil(fuelToRefuel);
  const canAfford = credits >= cost;

  if (!canAfford) {
    return { agent, spent: 0, canAfford: false };
  }

  const refueled = { ...agent, fuel: 100 };
  return { agent: refueled, spent: cost, canAfford: true };
}

// Repair a destroyed agent to operational threshold (30% hull minimum).
// Costs 1 CR per 1% hull restored. Allows the agent to deploy again.
export function recoverDestroyedAgent(agent: Agent, credits: number): { agent: Agent; spent: number; canAfford: boolean } {
  // Recovery target: at least 30% hull (minimum to function), or 100% if affordable
  const recoveryTarget = Math.min(Math.max(30, agent.hull), 100);
  const currentHull = agent.hullCurrent;

  if (currentHull >= recoveryTarget) {
    // Already at or above recovery threshold; do full repair to 100
    return repairAgent(agent, credits);
  }

  const hullToRecover = recoveryTarget - currentHull;
  const cost = Math.ceil(hullToRecover);
  const canAfford = credits >= cost;

  if (!canAfford) {
    return { agent, spent: 0, canAfford: false };
  }

  const recovered = { ...agent, hullCurrent: recoveryTarget };
  return { agent: recovered, spent: cost, canAfford: true };
}

// Apply mission results to game state — accounts for expenses
export function applyMissionResults(state: GameState, result: SimulationResult): GameState {
  const agentIndex = state.selectedAgentIndex ?? 0;
  const agent = state.agents[agentIndex];

  // The simulation engine already computed final XP/level on result.agent.
  // Using result.agent.xp directly avoids double-counting XP that was
  // already accumulated inside simulateMission().
  const updatedAgents = [...state.agents];
  if (agent) {
    updatedAgents[agentIndex] = {
      ...agent,
      credits: agent.credits + result.creditsEarned - result.creditsExpenses,
      xp: result.agent.xp,
      level: result.agent.level,
      hullCurrent: result.finalHullPct,
      fuel: result.fuelRemainingPct,
      traits: result.agent.traits,
    };
  }

  return {
    ...state,
    agents: updatedAgents,
    credits: state.credits + result.creditsEarned - result.creditsExpenses,
    simulationResult: result,
    missionHistory: [...state.missionHistory, result],
    screen: 'mission_report'
  };
}