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
      statusText="MISSION OPERATIONS — DISPATCH"
      screenClass="mission-root"
    >
      <div className="ms">
        {/* Left column: mission list */}
        <div className="ms__col">
          <section className="void-panel void-panel--raised panel-enter" style={{ animationDelay: '40ms' }}>
            <div className="void-panel__header">
              <h2 className="void-panel__title">MISSION SELECTION</h2>
            </div>
            <div className="ms__missions" role="radiogroup" aria-label="Mission selection">
              {MISSION_TYPES.map((mission) => {
                const req = missionCargoRequirement(mission.type);
                const canCargo = selectedAgent ? req === null ? true : selectedAgent.cargo >= req : true;
                const isSelected = state.selectedMission === mission.type;
                return (
                  <button
                    key={mission.type}
                    type="button"
                    className={`ms__card mission-card ${isSelected ? 'is-selected' : ''} ${!canCargo ? 'is-incompatible' : ''}`}
                    onClick={() => setState(s => ({ ...s, selectedMission: mission.type }))}
                    disabled={!canCargo}
                    aria-pressed={isSelected}
                  >
                    <div className="ms__card-head">
                      <span className="ms__card-name">{mission.name}</span>
                      <span className={`ms__risk ms__risk--${mission.risk}`}>
                        {mission.risk.toUpperCase()}
                      </span>
                    </div>
                    <span className="ms__card-loc mono">{mission.location}</span>
                    <p className="ms__card-desc">{mission.description}</p>
                    <div className="ms__card-stats mono">
                      <span>REWARD {mission.rewardMin.toLocaleString()}–{mission.rewardMax.toLocaleString()} CR</span>
                      <span>DURATION {mission.durationMin}–{mission.durationMax} TICKS</span>
                      {req !== null && <span>CARGO REQ {req}</span>}
                    </div>
                    {!canCargo && selectedAgent && (
                      <p className="ms__card-warn mono">
                        INSUFFICIENT CARGO CAPACITY ({selectedAgent.cargo} &lt; {req})
                      </p>
                    )}
                  </button>
                );
              })}
            </div>
          </section>
        </div>

        {/* Right column: deployment brief */}
        <div className="ms__col">
          <section className="void-panel void-panel--raised panel-enter ms__brief" style={{ animationDelay: '80ms' }}>
            <div className="void-panel__header">
              <h2 className="void-panel__title">DEPLOYMENT BRIEF</h2>
            </div>

            {/* Agent status */}
            {selectedAgent ? (
              <div className="ms__agent">
                <div className="ms__agent-head">
                  <span className="ms__agent-name">{getAgentName(selectedAgent)}</span>
                  {isDestroyed && (
                    <span className="ms__agent-status ms__agent-status--destroyed">DESTROYED</span>
                  )}
                </div>
                <div className="ms__agent-type mono">{selectedAgent.type} · LEVEL {selectedAgent.level}</div>
                <div className="ms__agent-meta mono">
                  <span>HULL {selectedAgent.hullCurrent.toFixed(1)}%</span>
                  <span>FUEL {selectedAgent.fuel.toFixed(1)}%</span>
                  <span>CAPACITY {selectedAgent.cargo}</span>
                </div>
              </div>
            ) : (
              <div className="ms__empty">No agent selected.</div>
            )}

            {/* Mission details */}
            {selectedMissionInfo ? (
              <div className="ms__mission scan-surface" key={selectedMissionInfo.type}>
                <div className="ms__mission-head">
                  <span className="ms__mission-name">{selectedMissionInfo.name}</span>
                  <span className={`ms__risk ms__risk--${selectedMissionInfo.risk}`}>
                    {selectedMissionInfo.risk.toUpperCase()}
                  </span>
                </div>
                <span className="ms__mission-loc mono">→ {selectedMissionInfo.location}</span>
                <dl className="ms__specs mono">
                  <div><dt>RISK</dt><dd>{selectedMissionInfo.risk.toUpperCase()}</dd></div>
                  <div><dt>REWARD</dt><dd>{selectedMissionInfo.rewardMin.toLocaleString()}–{selectedMissionInfo.rewardMax.toLocaleString()} CR</dd></div>
                  <div><dt>DURATION</dt><dd>{selectedMissionInfo.durationMin}–{selectedMissionInfo.durationMax} ticks</dd></div>
                  {selectedMissionInfo.type === 'PROSPECT' && (
                    <div><dt>OBJECTIVE</dt><dd>Scan 3 anomalies (+150 CR each)</dd></div>
                  )}
                  {selectedMissionInfo.type === 'SALVAGE' && (
                    <div><dt>OBJECTIVE</dt><dd>Recover ≥ 1 cargo unit</dd></div>
                  )}
                  {selectedMissionInfo.type === 'COURIER' && (
                    <div><dt>OBJECTIVE</dt><dd>Deliver 30 goods · pick up 20 metals</dd></div>
                  )}
                  {selectedReq !== null && (
                    <div><dt>CARGO REQ</dt><dd>{selectedReq} units</dd></div>
                  )}
                </dl>

                {/* Cargo compatibility */}
                {selectedAgent && selectedReq !== null && (
                  <div className={`ms__cargo-check ${cargoIncompatible ? 'is-bad' : 'is-good'}`}>
                    <div className="ms__cargo-row mono">
                      <span>CAPACITY {selectedAgent.cargo}</span>
                      <span>REQ {selectedReq}</span>
                    </div>
                    <div className="ms__cargo-verdict mono">
                      {cargoIncompatible
                        ? `INCOMPATIBLE — SHORT BY ${selectedReq - selectedAgent.cargo}`
                        : `COMPATIBLE — SLACK ${selectedAgent.cargo - selectedReq}`}
                    </div>
                  </div>
                )}

                <p className="ms__deploy-note">Deploying launches the live simulation of this mission for the selected agent.</p>
              </div>
            ) : (
              <div className="ms__empty">Select a mission to view its briefing.</div>
            )}

            {/* Deploy warning */}
            {deployBlockedReason && (
              <p className="ms__warning mono">{deployBlockedReason}</p>
            )}

            {/* Deploy button */}
            <button
              className="void-btn void-btn--primary ms__deploy"
              onClick={handleDeploy}
              disabled={!state.selectedMission || isDestroyed || cargoIncompatible}
            >
              DEPLOY MISSION
            </button>
          </section>
        </div>
      </div>

      {/* Footer nav */}
      <div className="ms__nav">
        <button
          className="void-btn void-btn--ghost"
          onClick={() => setState(s => ({ ...s, screen: 'station' }))}
        >
          ← RETURN TO STATION
        </button>
      </div>
    </StationShell>
  );
}
