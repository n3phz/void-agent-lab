import type { GameState } from '../gameState';
import { getAgentName, repairAgent, refuelAgent, recoverDestroyedAgent } from '../gameState';
import scoutShipSVG from '../assets/tactical/scout-ship.svg';
import haulerShipSVG from '../assets/tactical/hauler-ship.svg';
import { StationShell } from './StationShell';

interface StationProps {
  state: GameState;
  setState: React.Dispatch<React.SetStateAction<GameState>>;
}

export function Station({ state, setState }: StationProps) {
  const selectedAgent = state.selectedAgentIndex !== null && state.selectedAgentIndex < state.agents.length
    ? state.agents[state.selectedAgentIndex]
    : null;

  const handleRepair = () => {
    if (!selectedAgent || state.credits <= 0) return;
    const res = repairAgent(selectedAgent, state.credits);
    if (!res.canAfford) return;
    setState(s => {
      const updatedAgents = [...s.agents];
      updatedAgents[s.selectedAgentIndex ?? 0] = res.agent;
      return {
        ...s,
        credits: s.credits - res.spent,
        agents: updatedAgents,
      };
    });
  };

  const handleRefuel = () => {
    if (!selectedAgent || state.credits <= 0) return;
    const res = refuelAgent(selectedAgent, state.credits);
    if (!res.canAfford) return;
    setState(s => {
      const updatedAgents = [...s.agents];
      updatedAgents[s.selectedAgentIndex ?? 0] = res.agent;
      return {
        ...s,
        credits: s.credits - res.spent,
        agents: updatedAgents,
      };
    });
  };

  const handleRecover = () => {
    if (!selectedAgent || state.credits <= 0) return;
    const res = recoverDestroyedAgent(selectedAgent, state.credits);
    if (!res.canAfford) return;
    setState(s => {
      const updatedAgents = [...s.agents];
      updatedAgents[s.selectedAgentIndex ?? 0] = res.agent;
      return {
        ...s,
        credits: s.credits - res.spent,
        agents: updatedAgents,
      };
    });
  };

  const repairCost = selectedAgent && selectedAgent.hullCurrent < 100
    ? Math.ceil(100 - selectedAgent.hullCurrent)
    : 0;
  const refuelCost = selectedAgent && selectedAgent.fuel < 100
    ? Math.ceil(100 - selectedAgent.fuel)
    : 0;
  const recoveryCost = selectedAgent && selectedAgent.hullCurrent < 30
    ? Math.ceil(30 - selectedAgent.hullCurrent)
    : 0;

  const shipSVG = selectedAgent
    ? selectedAgent.type === 'SCOUT'
      ? scoutShipSVG
      : haulerShipSVG
    : null;

  return (
    <StationShell
      state={state}
      statusText="STATION COMMAND"
      screenClass="station-root"
    >
      <div className="sc">
        {/* Agent Roster */}
        <section className="void-panel void-panel--raised panel-enter" style={{ animationDelay: '40ms' }}>
          <div className="void-panel__header">
            <h2 className="void-panel__title">AGENT ROSTER</h2>
            <span className="mono">{state.agents.length} UNIT{state.agents.length !== 1 ? 'S' : ''}</span>
          </div>
          <div className="sc__roster">
            {state.agents.length === 0 ? (
              <div className="void-empty">
                <div className="void-empty__icon">◇</div>
                <h3 className="void-panel__title" style={{ marginBottom: 'var(--space-2)' }}>NO AGENTS ASSIGNED</h3>
                <p className="mono" style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>Create an agent to begin operations.</p>
              </div>
            ) : (
              state.agents.map((a, idx: number) => {
                const isDestroyed = a.hullCurrent <= 0;
                const isSelected = idx === state.selectedAgentIndex;
                return (
                  <div
                    key={idx}
                    role="button"
                    tabIndex={0}
                    className={`sc__card${isSelected ? ' is-selected' : ''}${isDestroyed ? ' is-destroyed' : ''}`}
                    onClick={() => setState(s => ({ ...s, selectedAgentIndex: idx }))}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setState(s => ({ ...s, selectedAgentIndex: idx })); } }}
                  >
                    <div className="sc__card-header">
                      <div className="sc__card-identity">
                        <span className="sc__card-name">{getAgentName(a)}</span>
                        <span className="sc__card-type mono">{a.type} · LVL {a.level}</span>
                      </div>
                      {isDestroyed && <span className="void-status void-status--destroyed mono">DESTROYED</span>}
                    </div>
                    <div className="sc__card-xp mono">XP {a.xp} / 50</div>
                    <div className="sc__card-bars">
                      <div className="void-bar">
                        <div className="void-bar__label-row">
                          <span className="void-bar__label mono">HULL</span>
                          <span className="void-bar__value value-transition mono">{a.hullCurrent.toFixed(1)}%</span>
                        </div>
                        <div className="void-bar__track" style={{ height: '6px' }}>
                          <div className={`void-bar__fill${isDestroyed || a.hullCurrent < 30 ? ' void-bar__fill--critical' : ''}`} style={{ width: `${Math.max(0, a.hullCurrent)}%` }} />
                        </div>
                      </div>
                      <div className="void-bar">
                        <div className="void-bar__label-row">
                          <span className="void-bar__label mono">FUEL</span>
                          <span className="void-bar__value value-transition mono">{a.fuel.toFixed(1)}%</span>
                        </div>
                        <div className="void-bar__track" style={{ height: '6px' }}>
                          <div className={`void-bar__fill${a.fuel < 30 ? ' void-bar__fill--caution' : ''}`} style={{ width: `${Math.max(0, a.fuel)}%` }} />
                        </div>
                      </div>
                    </div>
                    <div className="sc__card-footer">
                      <button
                        type="button"
                        className={`void-btn void-btn--sm${isSelected ? ' void-btn--primary' : ''}`}
                        disabled={isSelected}
                        onClick={(e) => { e.stopPropagation(); setState(s => ({ ...s, selectedAgentIndex: idx })); }}
                      >
                        {isSelected ? 'SELECTED' : 'SELECT'}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* Selected Agent Detail */}
        <section className="void-panel void-panel--raised panel-enter" style={{ animationDelay: '80ms' }}>
          {selectedAgent ? (
            <>
              <div className="void-panel__header">
                <div>
                  <h2 className="void-panel__title">{getAgentName(selectedAgent)}</h2>
                  <div className="sc__agent-type mono">{selectedAgent.type} — Level {selectedAgent.level}</div>
                </div>
                <div className="sc__agent-attrs mono">
                  <div>NAV {selectedAgent.nav}</div>
                  <div>OPS {selectedAgent.ops}</div>
                </div>
              </div>

              <div className="sc__body">
                {/* Vessel Frame */}
                <div className="sc__vessel void-panel void-panel--sunken">
                  {shipSVG ? (
                    <img
                      src={shipSVG}
                      alt={`${selectedAgent.type} vessel`}
                      className="sc__ship"
                    />
                  ) : (
                    <div className="void-empty" style={{ padding: 'var(--space-8) var(--space-4)' }}>
                      <div className="void-empty__icon">◇</div>
                      <p className="mono" style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>No vessel data.</p>
                    </div>
                  )}
                  <div className="sc__vessel-specs mono">
                    <div className="sc__spec-row"><span>TYPE</span><span>{selectedAgent.type}</span></div>
                    <div className="sc__spec-row"><span>LEVEL</span><span>{selectedAgent.level}</span></div>
                    <div className="sc__spec-row"><span>NAV</span><span>{selectedAgent.nav}</span></div>
                    <div className="sc__spec-row"><span>OPS</span><span>{selectedAgent.ops}</span></div>
                  </div>
                </div>

                {/* Status Panel */}
                <div className="sc__status">
                  <div className="void-bar">
                    <div className="void-bar__label-row">
                      <span className="void-bar__label mono">HULL</span>
                      <span className="void-bar__value value-transition mono">{selectedAgent.hullCurrent.toFixed(1)}%</span>
                    </div>
                    <div className="void-bar__track" style={{ height: '8px' }}>
                      <div className={`void-bar__fill${selectedAgent.hullCurrent < 30 ? ' void-bar__fill--critical' : ''}`} style={{ width: `${Math.max(0, selectedAgent.hullCurrent)}%` }} />
                    </div>
                  </div>
                  <div className="void-bar">
                    <div className="void-bar__label-row">
                      <span className="void-bar__label mono">FUEL</span>
                      <span className="void-bar__value value-transition mono">{selectedAgent.fuel.toFixed(1)}%</span>
                    </div>
                    <div className="void-bar__track" style={{ height: '8px' }}>
                      <div className={`void-bar__fill${selectedAgent.fuel < 30 ? ' void-bar__fill--caution' : ''}`} style={{ width: `${Math.max(0, selectedAgent.fuel)}%` }} />
                    </div>
                  </div>

                  <div className="sc__actions void-flex">
                    <button
                      type="button"
                      className="void-btn"
                      onClick={handleRepair}
                      disabled={repairCost === 0 || state.credits < repairCost}
                    >
                      <span>REPAIR</span>
                      <span className="mono">{repairCost} CR</span>
                    </button>
                    <button
                      type="button"
                      className="void-btn"
                      onClick={handleRefuel}
                      disabled={refuelCost === 0 || state.credits < refuelCost}
                    >
                      <span>REFUEL</span>
                      <span className="mono">{refuelCost} CR</span>
                    </button>
                    {selectedAgent.hullCurrent <= 0 && (
                      <button
                        type="button"
                        className="void-btn void-btn--danger"
                        onClick={handleRecover}
                        disabled={recoveryCost === 0 || state.credits < recoveryCost}
                      >
                        <span>RECOVER</span>
                        <span className="mono">{recoveryCost} CR</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="void-empty">
              <div className="void-empty__icon">◇</div>
              <h3 className="void-panel__title" style={{ marginBottom: 'var(--space-2)' }}>NO AGENT SELECTED</h3>
              <p className="mono" style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>Select an agent from the roster to inspect vessel and status.</p>
            </div>
          )}
        </section>

        {/* Command Bar */}
        <div className="sc__command-bar void-flex">
          <button
            type="button"
            className="void-btn void-btn--ghost void-btn--full"
            onClick={() => setState(s => ({ ...s, screen: 'agent_creation' }))}
          >
            CREATE AGENT
          </button>
          <button
            type="button"
            className="void-btn void-btn--ghost void-btn--full"
            onClick={() => setState(s => ({ ...s, screen: 'agent_configuration' }))}
            disabled={state.selectedAgentIndex === null}
          >
            CONFIGURE RULES
          </button>
          <button
            type="button"
            className="void-btn void-btn--primary void-btn--full"
            onClick={() => setState(s => ({ ...s, screen: 'mission_selection' }))}
            disabled={state.agents.length === 0}
          >
            SELECT MISSION
          </button>
          <button
            type="button"
            className="void-btn void-btn--ghost void-btn--full"
            onClick={() => setState(s => ({ ...s, screen: 'agent_blueprint' }))}
            disabled={state.selectedAgentIndex === null}
          >
            BLUEPRINT
          </button>
        </div>
      </div>
    </StationShell>
  );
}