import type { Mission, MissionType } from './types';

export function createMission(type: MissionType): Mission {
  switch (type) {
    case 'PROSPECT':
      return {
        type: 'PROSPECT',
        location: 'KELPER-3',
        goalAnomalies: 3,
        durationMin: 24,
        durationMax: 36,
        rewardMin: 800,
        rewardMax: 1500,
        anomalyBonus: 150,
        risk: 'low',
      };
    case 'SALVAGE':
      return {
        type: 'SALVAGE',
        location: 'DERELICT-RING',
        goalCargoRecover: 1,
        durationMin: 36,
        durationMax: 48,
        rewardMin: 0,
        rewardMax: 2500,
        risk: 'medium',
      };
    case 'COURIER':
      return {
        type: 'COURIER',
        location: 'HUB',
        goalDeliver: { goods: 30, metals: 0 },
        goalPickup: { goods: 0, metals: 20 },
        durationMin: 30,
        durationMax: 42,
        rewardMin: 1500,
        rewardMax: 2500,
        risk: 'medium',
      };
  }
}

export const createMissionData = createMission;
