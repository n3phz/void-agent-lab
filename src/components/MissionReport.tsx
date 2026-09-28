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

  return (
    <StationShell
      state={state}
      statusText="MISSION REPORT — AFTER-ACTION"
      screenClass="report-root"
    >
      <div className="mr">
        {/* Outcome banner */}
        <section className="mr__outcome-banner panel-enter">
          <span className="mr__scan-line" aria-hidden="true" />
          <div className="mr__outcome-label mono">OUTCOME</div>
          <div className="mr__outcome-value">{result.outcome.toUpperCase()}</div>
          <div className="mr__outcome-stats mono">
            <span className="value-transition value-count">
              {result.netResult >= 0 ? `+${result.netResult.toLocaleString()}` : result.netResult.toLocaleString()} CR
            </span>
            <span className="value-transition value-count">+{result.xpEarned} XP</span>
          </div>
        </section>

        {/* Main report deck */}
        <main className="mr__deck">
          {/* Agent status panel */}
          <section className="void-panel void-panel--raised panel-enter" style={{ animationDelay: '120ms' }}>
            <div className="void-panel__header">
              <h2 className="void-panel__title">AGENT STATUS</h2>
            </div>

            <div className="mr__agent-head">
              <span className="mr__agent-name">{getAgentName(agent)}</span>
              {!result.agentSurvives && (
                <span className="mr__agent-status mr__agent-status--destroyed">DESTROYED</span>
              )}
            </div>
            <div className="mr__agent-type mono">{agent.type} · LEVEL {agent.level}</div>

            {/* Hull bar */}
            <div className="mr__bar">
              <div className="mr__bar-row mono">
                <span>HULL</span>
                <span>{result.finalHullPct}%</span>
              </div>
              <div className="mr__bar-track">
                <div className={`mr__bar-fill${isCritical ? ' is-critical' : ''}`} style={{ width: `${Math.max(0, Math.min(100, result.finalHullPct))}%` }} />
              </div>
            </div>

            {/* Fuel bar */}
            <div className="mr__bar">
              <div className="mr__bar-row mono">
                <span>FUEL</span>
                <span>{result.fuelRemainingPct}%</span>
              </div>
              <div className="mr__bar-track">
                <div className="mr__bar-fill" style={{ width: `${Math.max(0, Math.min(100, result.fuelRemainingPct))}%` }} />
              </div>
            </div>

            <dl className="mr__specs mono">
              <div><dt>CREDITS</dt><dd>{agent.credits.toLocaleString()} CR</dd></div>
              <div><dt>EARNED</dt><dd>{result.creditsEarned.toLocaleString()} CR</dd></div>
              <div><dt>EXPENSES</dt><dd>{result.creditsExpenses.toLocaleString()} CR</dd></div>
              <div><dt>MAINTENANCE</dt><dd>{result.maintenanceCost.toLocaleString()} CR</dd></div>
            </dl>

            {(result.outcome === 'success' && (missionObj?.type === 'SALVAGE' || missionObj?.type === 'COURIER')) && (
              <p className="mr__note">
                Cargo impact: capacity {agent.cargo} influenced mission reward for {missionObj?.type}.
              </p>
            )}
          </section>

          {/* Events panel */}
          <section className="void-panel void-panel--raised panel-enter" style={{ animationDelay: '160ms' }}>
            <div className="void-panel__header">
              <h2 className="void-panel__title">MISSION EVENTS ({result.eventLog.length})</h2>
            </div>

            {result.eventLog.length === 0 ? (
              <div className="mr__empty">No events recorded.</div>
            ) : (
              <ol className="mr__events mono">
                {result.eventLog.slice(0, 30).map((event: EventRecord, i: number) => (
                  <li key={i} className="mr__event report-reveal" style={{ animationDelay: `${Math.min(i * 30, 300)}ms` }}>
                    <span className="mr__event-tick">T{event.tick} {event.time}</span>
                    <span className="mr__event-action">{event.action}</span>
                    <span className="mr__event-text">{event.event}</span>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </main>

        {/* Footer actions */}
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