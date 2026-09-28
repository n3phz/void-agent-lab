import type { ReactNode } from 'react';
import type { GameState } from '../gameState';

const LOCATION_LABEL: Record<GameState['screen'], string> = {
  station: 'COMMAND',
  agent_creation: 'HANGAR',
  agent_configuration: 'ENGINEERING',
  agent_blueprint: 'HOLO-DECK',
  mission_selection: 'OPERATIONS',
  simulation: 'MISSION CONTROL',
  mission_report: 'AFTER-ACTION',
};

interface StationShellProps {
  children: ReactNode;
  state: GameState;
  statusText?: string;
  /**
   * Stable screen-identifying marker kept alongside the design-system classes.
   * Visual QA and any external automation address screens by this hook, so it
   * must survive a restyle. It carries no visual styling of its own.
   */
  screenClass?: string;
}

/** Persistent station frame: identity, location, resources, unit status. */
export function StationShell({ children, state, statusText, screenClass }: StationShellProps) {
  const activeUnits = state.agents.filter((a) => a.hullCurrent > 0).length;
  const hasDanger = state.agents.some((a) => a.hullCurrent <= 0 || a.hullCurrent < 30);
  const hasWarning = !hasDanger && state.agents.some((a) => a.fuel < 30);
  const indicatorClass = hasDanger
    ? 'void-shell__status-indicator--danger'
    : hasWarning
      ? 'void-shell__status-indicator--warning'
      : 'void-shell__status-indicator--active';

  return (
    <div className={screenClass ? `void-shell ${screenClass}` : 'void-shell'}>
      <div className="void-shell__bg-pattern" aria-hidden="true" />

      <header className="void-shell__header">
        <div className="void-shell__header-left">
          <div className="void-shell__brand">
            <svg
              className="void-shell__logo"
              viewBox="0 0 32 32"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <circle cx="16" cy="16" r="14" stroke="var(--void-nav)" strokeWidth="1.5" opacity="0.8" />
              <circle cx="16" cy="16" r="8" stroke="var(--void-nav)" strokeWidth="1" opacity="0.5" />
              <polygon points="16,4 28,22 4,22" stroke="var(--void-nav)" strokeWidth="1" fill="none" opacity="0.7" />
              <circle cx="16" cy="16" r="2" fill="var(--void-nav)" opacity="0.9" />
            </svg>
            <h1 className="void-shell__title">VOID</h1>
            <span className="void-shell__subtitle">STATION // AGENT LAB</span>
          </div>
          <div className="void-shell__location mono">{LOCATION_LABEL[state.screen]}</div>
        </div>

        <div className="void-shell__header-right">
          <div className="void-shell__resources">
            <div className="void-shell__resource void-shell__resource--credits">
              <span className="mono">{state.credits.toLocaleString()}</span>
              <span className="void-shell__resource-unit">CR</span>
            </div>
            {state.agents.length > 0 && (
              <div className="void-shell__resource">
                <span className="mono">{activeUnits}</span>
                <span className="void-shell__resource-unit">ACTIVE</span>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="void-shell__main">{children}</main>

      <footer className="void-shell__footer">
        <div className="void-shell__footer-left">
          <div className="void-shell__status">
            <span className={`void-shell__status-indicator ${indicatorClass}`} />
            <span className="mono">
              {state.agents.length} UNIT{state.agents.length !== 1 ? 'S' : ''}
            </span>
          </div>
        </div>
        <div className="void-shell__footer-center">
          {statusText && (
            <span className="mono" style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
              {statusText}
            </span>
          )}
        </div>
        <div className="void-shell__footer-right">
          <span className="mono" style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
            SEED {state.simulationSeed}
          </span>
        </div>
      </footer>
    </div>
  );
}
