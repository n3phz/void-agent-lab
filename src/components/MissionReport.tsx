import { useMemo } from 'react';
import type { EventRecord } from '../core/types';
import type { GameState } from '../gameState';
import { getMission, getAgentName } from '../gameState';
import { StationShell } from './StationShell';
import { Station } from './Station';

interface MissionReportProps {
  state: GameState;
  setState: React.Dispatch<React.SetStateAction<GameState>>;
}

export function MissionReport({ state, setState }: MissionReportProps) {
  const result = state.simulationResult;
  const agent = state.selectedAgentIndex !== null && state.selectedAgentIndex < state.agents.length ? state.agents[state.selectedAgentIndex] : null;
  const missionObj = useMemo(() => (state.selectedMission ? getMission(state.selectedMission) : null), [state.selectedMission]);

  if (!result || !agent) {
    return <Station state={state} setState={setState} />;
  }

  const isCritical = result.finalHullPct < 30;
  const isSuccess = result.outcome === 'success';
  const isFailed = result.outcome === 'failure' || result.outcome === 'destroyed';

  return (
    <StationShell
      state={state}
      statusText="MISSION REPORT — AFTER-ACTION DEBRIEF"
      screenClass="report-root"
    >
      <div className="mr">
        {/* Outcome Banner */}
        <section className={`mr__outcome mr__outcome--${isSuccess ? 'success' : isFailed ? 'failure' : 'aborted'} panel-enter`}>
          <span className="mr__outcome-scan" aria-hidden="true" />
          <div className="mr__outcome-label mono">OUTCOME</div>
          <div className="mr__outcome-value">{result.outcome.toUpperCase()}</div>
          <div className="mr__outcome-stats mono">
            <span className="mr__outcome-stat">
              {result.netResult >= 0 ? `+${result.netResult.toLocaleString()}` : result.netResult.toLocaleString()} CR
            </span>
            <span className="mr__outcome-stat">+{result.xpEarned} XP</span>
          </div>
        </section>

        {/* Report Deck */}
        <main className="mr__deck">
          {/* Agent Status */}
          <section className="void-panel void-panel--raised panel-enter" style={{ animationDelay: '120ms' }}>
            <div className="void-panel__header">
              <h2 className="void-panel__title">AGENT STATUS</h2>
              {!result.agentSurvives && (
                <span className="void-status void-status--destroyed mono" style={{ fontSize: 'var(--text-xs)' }}>
                  DESTROYED
                </span>
              )}
            </div>

            <div className="mr__agent-head">
              <div>
                <span className="mr__agent-name">{getAgentName(agent)}</span>
                <div className="mr__agent-type mono">{agent.type} · LEVEL {agent.level}</div>
              </div>
            </div>

            {/* Hull Bar */}
            <div className="mr__bar">
              <div className="mr__bar-row mono">
                <span>HULL</span>
                <span style={{ color: isCritical ? 'var(--void-danger)' : undefined }}>{result.finalHullPct}%</span>
              </div>
              <div className="mr__bar-track">
                <div
                  className={`mr__bar-fill${isCritical ? ' is-critical' : ''}`}
                  style={{ width: `${Math.max(0, Math.min(100, result.finalHullPct))}%`, background: isCritical ? 'var(--void-danger)' : 'var(--void-nav)' }}
                />
              </div>
            </div>

            {/* Fuel Bar */}
            <div className="mr__bar">
              <div className="mr__bar-row mono">
                <span>FUEL</span>
                <span style={{ color: result.fuelRemainingPct < 30 ? 'var(--void-caution)' : undefined }}>{result.fuelRemainingPct}%</span>
              </div>
              <div className="mr__bar-track">
                <div
                  className="mr__bar-fill"
                  style={{ width: `${Math.max(0, Math.min(100, result.fuelRemainingPct))}%`, background: result.fuelRemainingPct < 30 ? 'var(--void-caution)' : 'var(--void-nav)' }}
                />
              </div>
            </div>

            <dl className="mr__specs mono">
              <div className="mr__spec"><dt>CREDITS</dt><dd>{agent.credits.toLocaleString()} CR</dd></div>
              <div className="mr__spec"><dt>EARNED</dt><dd>{result.creditsEarned.toLocaleString()} CR</dd></div>
              <div className="mr__spec"><dt>EXPENSES</dt><dd>{result.creditsExpenses.toLocaleString()} CR</dd></div>
              <div className="mr__spec"><dt>MAINTENANCE</dt><dd>{result.maintenanceCost.toLocaleString()} CR</dd></div>
            </dl>

            {(result.outcome === 'success' && (missionObj?.type === 'SALVAGE' || missionObj?.type === 'COURIER')) && (
              <p className="mr__note">
                Cargo impact: capacity {agent.cargo} influenced mission reward for {missionObj?.type}.
              </p>
            )}
          </section>

          {/* Mission Events */}
          <section className="void-panel void-panel--raised panel-enter" style={{ animationDelay: '160ms' }}>
            <div className="void-panel__header">
              <h2 className="void-panel__title">MISSION EVENTS ({result.eventLog.length})</h2>
            </div>

            {result.eventLog.length === 0 ? (
              <div className="mr__empty">No events recorded.</div>
            ) : (
              <ol className="mr__events mono">
                {result.eventLog.slice(0, 30).map((event: EventRecord, i: number) => (
                  <li key={i} className="mr__event" style={{ animationDelay: `${Math.min(i * 30, 300)}ms` }}>
                    <span className="mr__event-tick">T{event.tick} {event.time}</span>
                    <span className="mr__event-action">{event.action}</span>
                    <span className="mr__event-text">{event.event}</span>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </main>

        {/* Footer Actions */}
        <footer className="mr__actions panel-enter" style={{ animationDelay: '200ms' }}>
          <button
            type="button"
            className="void-btn void-btn--primary mr__action"
            onClick={() => {
              setState(s => ({
                ...s,
                simulationResult: null,
                screen: 'station'
              }));
            }}
          >
            ← RETURN TO STATION
          </button>
          <button
            type="button"
            className="void-btn void-btn--ghost mr__action"
            onClick={() => setState(s => ({ ...s, screen: 'agent_blueprint' }))}
          >
            VIEW AGENT BLUEPRINT
          </button>
        </footer>
      </div>
    </StationShell>
  );
}
