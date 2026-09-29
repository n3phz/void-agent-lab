import type { MissionType } from '../core/types';
import type { GameState } from '../gameState';
import { getAgentName, MISSION_TYPES } from '../gameState';
import { generateMissionSeed } from '../gameState';
import { StationShell } from './StationShell';

interface MissionSelectionProps {
  state: GameState;
  setState: React.Dispatch<React.SetStateAction<GameState>>;
}

const missionCargoRequirement = (type: MissionType): number | null =>
  type === 'SALVAGE' ? 1 : type === 'COURIER' ? 30 : null;

const missionIcon: Record<MissionType, { icon: string; cls: string }> = {
  PROSPECT: { icon: '◇', cls: 'mo__card-type mo__card-type--prospect' },
  SALVAGE: { icon: '▲', cls: 'mo__card-type mo__card-type--salvage' },
  COURIER: { icon: '◆', cls: 'mo__card-type mo__card-type--courier' },
};

export function MissionSelection({ state, setState }: MissionSelectionProps) {
  const selectedAgent = state.selectedAgentIndex !== null && state.selectedAgentIndex < state.agents.length
    ? state.agents[state.selectedAgentIndex]
    : null;

  const isDestroyed = selectedAgent ? selectedAgent.hullCurrent <= 0 : false;
  const cargoIncompatible = selectedAgent
    ? state.selectedMission === 'SALVAGE'
      ? selectedAgent.cargo < 1
      : state.selectedMission === 'COURIER'
        ? selectedAgent.cargo < 30
        : false
    : false;

  const selectedReq = state.selectedMission ? missionCargoRequirement(state.selectedMission) : null;
  const selectedMissionInfo = MISSION_TYPES.find(m => m.type === state.selectedMission) ?? null;

  const deployBlockedReason = !selectedAgent
    ? 'No agent selected. Return to station and select an agent first.'
    : isDestroyed
      ? 'Selected agent is destroyed and cannot deploy. Recover it from the station or blueprint screen first.'
      : cargoIncompatible
        ? `Selected agent cannot complete this mission: cargo capacity ${selectedAgent.cargo} is below requirement.`
        : null;

  const handleDeploy = () => {
    if (state.selectedMission && !isDestroyed && !cargoIncompatible) {
      setState(s => ({
        ...s,
        simulationSeed: generateMissionSeed(s.simulationSeed),
        simulationResult: null,
        screen: 'simulation',
      }));
    }
  };

  return (
    <StationShell
      state={state}
      statusText="MISSION OPERATIONS — CONTRACT BOARD"
      screenClass="mission-root"
    >
      <div className="mission-root">
        <div className="mo">
          {/* Left: Available Contracts */}
          <div className="mo__col">
            <section className="void-panel void-panel--raised panel-enter" style={{ animationDelay: '40ms' }}>
              <div className="void-panel__header">
                <h2 className="void-panel__title">AVAILABLE CONTRACTS</h2>
                <span className="mono" style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                  {MISSION_TYPES.filter(m => {
                    const req = missionCargoRequirement(m.type);
                    return req === null || (selectedAgent && selectedAgent.cargo >= req);
                  }).length} / {MISSION_TYPES.length} ACCESSIBLE
                </span>
              </div>
              <div className="mo__contracts" role="radiogroup" aria-label="Mission selection">
                {MISSION_TYPES.map((mission) => {
                  const req = missionCargoRequirement(mission.type);
                  const canCargo = selectedAgent ? req === null ? true : selectedAgent.cargo >= req : true;
                  const isSelected = state.selectedMission === mission.type;
                  const iconData = missionIcon[mission.type];
                  return (
                    <button
                      key={mission.type}
                      type="button"
                      className={`mo__card${isSelected ? ' is-selected' : ''}`}
                      onClick={() => setState(s => ({ ...s, selectedMission: mission.type }))}
                      disabled={!canCargo}
                      aria-pressed={isSelected}
                    >
                      <div className="mo__card-top">
                        <div className={iconData.cls} aria-hidden="true">
                          {iconData.icon}
                        </div>
                        <div className="mo__card-head">
                          <span className="mo__card-name">{mission.name}</span>
                          <span className="mo__card-location mono">→ {mission.location}</span>
                        </div>
                        <span className={`mo__card-risk mo__card-risk--${mission.risk}`}>
                          {mission.risk.toUpperCase()}
                        </span>
                      </div>
                      <p className="mo__card-desc">{mission.description}</p>
                      <div className="mo__card-stats mono">
                        <span>REWARD <strong>{mission.rewardMin.toLocaleString()}–{mission.rewardMax.toLocaleString()} CR</strong></span>
                        <span>DURATION <strong>{mission.durationMin}–{mission.durationMax} TICKS</strong></span>
                        {req !== null && <span>CARGO REQ <strong>{req}</strong></span>}
                      </div>
                      {!canCargo && selectedAgent && (
                        <p className="mo__card-warn mono">
                          INSUFFICIENT CARGO CAPACITY ({selectedAgent.cargo} &lt; {req})
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>
            </section>
          </div>

          {/* Right: Contract Briefing */}
          <div className="mo__col">
            <section className="mo__brief panel-enter" style={{ animationDelay: '80ms' }}>
              <div className="mo__brief-header">
                <span className="mo__brief-title">CONTRACT BRIEFING</span>
              </div>
              <div className="mo__brief-body">
                {/* Agent Status */}
                {selectedAgent ? (
                  <div className="mo__agent-status">
                    <div>
                      <div className="mo__agent-name">{getAgentName(selectedAgent)}</div>
                      <div className="mo__agent-type mono">{selectedAgent.type} · LVL {String(selectedAgent.level).padStart(2, '0')}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      {isDestroyed && (
                        <div className="mo__agent-destroyed">DESTROYED</div>
                      )}
                      <div className="mo__agent-meta mono">
                        <span>HULL {selectedAgent.hullCurrent.toFixed(1)}%</span>
                        <span>FUEL {selectedAgent.fuel.toFixed(1)}%</span>
                        <span>CARGO {selectedAgent.cargo}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="void-empty" style={{ padding: 'var(--space-4)' }}>
                    <div className="void-empty__icon">◇</div>
                    <p className="mono" style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
                      No agent selected.
                    </p>
                  </div>
                )}

                {/* Mission Details */}
                {selectedMissionInfo ? (
                  <div className="mo__mission-detail">
                    <div className="mo__mission-name">{selectedMissionInfo.name}</div>
                    <div className="mo__mission-target mono">→ {selectedMissionInfo.location}</div>
                    <dl className="mo__mission-specs mono">
                      <div className="mo__spec">
                        <dt className="mo__spec-label">RISK</dt>
                        <dd className="mo__spec-value mo__spec-value--caution">{selectedMissionInfo.risk.toUpperCase()}</dd>
                      </div>
                      <div className="mo__spec">
                        <dt className="mo__spec-label">REWARD</dt>
                        <dd className="mo__spec-value mo__spec-value--caution">{selectedMissionInfo.rewardMin.toLocaleString()}–{selectedMissionInfo.rewardMax.toLocaleString()} CR</dd>
                      </div>
                      <div className="mo__spec">
                        <dt className="mo__spec-label">DURATION</dt>
                        <dd className="mo__spec-value">{selectedMissionInfo.durationMin}–{selectedMissionInfo.durationMax} ticks</dd>
                      </div>
                      <div className="mo__spec">
                        <dt className="mo__spec-label">OBJECTIVE</dt>
                        <dd className="mo__spec-value">
                          {selectedMissionInfo.type === 'PROSPECT' && 'Scan 3 anomalies (+150 CR each)'}
                          {selectedMissionInfo.type === 'SALVAGE' && 'Recover ≥ 1 cargo unit'}
                          {selectedMissionInfo.type === 'COURIER' && 'Deliver 30 goods · pick up 20 metals'}
                        </dd>
                      </div>
                      {selectedReq !== null && (
                        <div className="mo__spec">
                          <dt className="mo__spec-label">CARGO REQ</dt>
                          <dd className="mo__spec-value mo__spec-value--caution">{selectedReq} units</dd>
                        </div>
                      )}
                    </dl>

                    {/* Cargo Check */}
                    {selectedAgent && selectedReq !== null && (
                      <div className={`mo__cargo-check ${cargoIncompatible ? 'is-bad' : 'is-good'}`}>
                        <div className="mo__cargo-row mono">
                          <span>CAPACITY {selectedAgent.cargo}</span>
                          <span>REQ {selectedReq}</span>
                        </div>
                        <div className="mo__cargo-verdict mono">
                          {cargoIncompatible
                            ? `INCOMPATIBLE — SHORT BY ${selectedReq - selectedAgent.cargo}`
                            : `COMPATIBLE — SLACK ${selectedAgent.cargo - selectedReq}`}
                        </div>
                      </div>
                    )}

                    <p className="mo__note" style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 'var(--space-2)' }}>
                      Deploying launches the live simulation of this mission.
                    </p>
                  </div>
                ) : (
                  <div className="void-empty" style={{ padding: 'var(--space-4)' }}>
                    <div className="void-empty__icon">◇</div>
                    <p className="mono" style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
                      Select a contract to view briefing.
                    </p>
                  </div>
                )}

                {/* Warning */}
                {deployBlockedReason && (
                  <p className="mo__warning mono">{deployBlockedReason}</p>
                )}

                {/* Deploy Button */}
                <button
                  className="void-btn void-btn--primary mo__deploy"
                  onClick={handleDeploy}
                  disabled={!state.selectedMission || isDestroyed || cargoIncompatible}
                >
                  DEPLOY MISSION
                </button>
              </div>
            </section>
          </div>
        </div>

        {/* Footer Nav */}
        <div className="mo__nav">
          <button
            className="void-btn void-btn--ghost"
            onClick={() => setState(s => ({ ...s, screen: 'station' }))}
          >
            ← RETURN TO STATION
          </button>
        </div>
      </div>
    </StationShell>
  );
}
