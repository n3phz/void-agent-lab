
import { useState, useEffect, useMemo, useRef } from 'react';
import { simulateMission } from '../core/simulation';
import { THRESHOLDS } from '../core/types';
import type { GameState } from '../gameState';
import { getMission, getAgentName, applyMissionResults } from '../gameState';
import { TacticalVisualization } from '../core/tacticalVisualization';
import { StationShell } from './StationShell';
import { Station } from './Station';
import { MissionReport } from './MissionReport';

interface SimulationProps {
  state: GameState;
  setState: React.Dispatch<React.SetStateAction<GameState>>;
}

const getPhaseBadgeClass = (phase: string) => {
  switch (phase) {
    case 'IDLE': return 'idle';
    case 'TRAVEL': return 'travel';
    case 'CRUISE': return 'cruise';
    case 'JUMP': return 'jump';
    case 'SCANNING': return 'scan';
    case 'HOSTILE': return 'hostile';
    case 'DAMAGE': return 'damage';
    case 'RETURN': return 'return';
    case 'MISSION': return 'mission';
    default: return 'idle';
  }
};

const getEventIcon = (category: string): string => {
  switch (category) {
    case 'NAV': return '▲';
    case 'JUMP': return '⬢';
    case 'ANOMALY': return '◇';
    case 'HOSTILE': return '◆';
    case 'DAMAGE': return '▼';
    case 'DOCKING': return '■';
    case 'SUCCESS': return '✓';
    case 'FAILURE': return '✗';
    case 'ABORT': return '⌐';
    default: return '▸';
  }
};

export function Simulation({ state, setState }: SimulationProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [speed, setSpeed] = useState(state.simulationSpeed);
  const [tickCount, setTickCount] = useState(0);
  const [progressPercent, setProgressPercent] = useState(0);
  const [events, setEvents] = useState<Array<{ id: number; tick: number; action: string; event: string; detail?: string; category: string; isCurrent: boolean }>>([]);
  const hasStartedRef = useRef(false);
  const hasCompletedRef = useRef(false);
  const eventIdRef = useRef(0);

  const agent = state.selectedAgentIndex !== null && state.selectedAgentIndex < state.agents.length ? state.agents[state.selectedAgentIndex] : null;
  const mission = state.selectedMission;
  const rules = state.rules;
  const missionObj = useMemo(() => (mission ? getMission(mission) : null), [mission]);
  const maxTicks = 120;

  // Fuel threshold and return state
  const fuelThreshold = THRESHOLDS[rules.fuelThreshold];
  const isReturning = agent ? agent.fuel <= fuelThreshold : false;

  useEffect(() => {
    setSpeed(state.simulationSpeed);
  }, [state.simulationSpeed]);

  // Phase state derived from simulation progress
  const phaseState = useMemo(() => {
    if (tickCount === 0) return 'IDLE';
    if (isReturning) return 'RETURN';
    if (tickCount < maxTicks * 0.15) return 'JUMP';
    if (tickCount < maxTicks * 0.5) return 'TRAVEL';
    if (tickCount < maxTicks * 0.7) return 'CRUISE';
    if (tickCount < maxTicks * 0.85) return 'SCANNING';
    return 'MISSION';
  }, [tickCount, maxTicks, isReturning]);

  // Auto-start the presentation when entering the Simulation screen.
  useEffect(() => {
    if (!agent || !mission || !missionObj || state.simulationResult || hasStartedRef.current) return;

    hasStartedRef.current = true;
    setIsRunning(true);
    setTickCount(0);
    setProgressPercent(0);
    setEvents([]);
    eventIdRef.current = 0;

    // Initial event
    addEvent('NAV', 'JUMP INITIATED', `${mission} → ${missionObj.location}`);
  }, [agent, mission, missionObj, state.simulationResult]);

  // Presentation only: advance progress without executing gameplay logic.
  useEffect(() => {
    if (!isRunning || !agent || !mission || !missionObj || state.simulationResult) return;

    const ticksPerSecond = speed;
    const interval = setInterval(() => {
      setTickCount(prev => (prev < maxTicks ? prev + 1 : prev));
    }, 1000 / ticksPerSecond);

    return () => clearInterval(interval);
  }, [isRunning, speed, agent, mission, missionObj, state.simulationResult]);

  // Generate events based on tick progression
  useEffect(() => {
    if (!isRunning || tickCount === 0 || !missionObj) return;

    const newEvents: Array<{ id: number; tick: number; action: string; event: string; detail?: string; category: string; isCurrent: boolean }> = [];

    if (tickCount === 1) {
      newEvents.push(createEvent('NAV', 'JUMP', `Course plotted to ${missionObj.location}`));
    } else if (tickCount === Math.floor(maxTicks * 0.15)) {
      newEvents.push(createEvent('NAV', 'CRUISE', 'Jump complete — entering cruise phase'));
    } else if (tickCount === Math.floor(maxTicks * 0.3)) {
      newEvents.push(createEvent('ANOMALY', 'ANOMALY DETECTED', 'Anomaly signature at bearing 047'));
    } else if (tickCount === Math.floor(maxTicks * 0.4)) {
      newEvents.push(createEvent('ANOMALY', 'ANOMALY SCANNED', 'Low-risk anomaly — data acquired'));
    } else if (tickCount === Math.floor(maxTicks * 0.5)) {
      newEvents.push(createEvent('NAV', 'CRUISE', 'Approaching mission zone'));
    } else if (tickCount === Math.floor(maxTicks * 0.6) && missionObj.risk !== 'low') {
      newEvents.push(createEvent('HOSTILE', 'HOSTILE ENCOUNTER', 'Contact — unknown signature'));
    } else if (tickCount === Math.floor(maxTicks * 0.7) && missionObj.risk !== 'low') {
      newEvents.push(createEvent('HOSTILE', 'HOSTILE FLED', 'Contact disengaged'));
    } else if (tickCount === Math.floor(maxTicks * 0.75)) {
      newEvents.push(createEvent('NAV', 'MISSION WORK', 'Primary objective in progress'));
    } else if (tickCount === Math.floor(maxTicks * 0.85)) {
      newEvents.push(createEvent('SUCCESS', 'OBJECTIVE COMPLETE', 'Mission parameters satisfied'));
    } else if (tickCount === Math.floor(maxTicks * 0.9)) {
      newEvents.push(createEvent('NAV', 'RETURN', 'Return vector plotted to station'));
    }

    if (newEvents.length > 0) {
      setEvents(prev => {
        // Mark previous current as not current
        const updated = prev.map(e => ({ ...e, isCurrent: false }));
        return [...updated, ...newEvents];
      });
    }
  }, [tickCount, maxTicks, isRunning, missionObj]);

  useEffect(() => {
    setProgressPercent(Math.min((tickCount / maxTicks) * 100, 100));

    if (tickCount < maxTicks || hasCompletedRef.current || state.simulationResult) return;

    hasCompletedRef.current = true;
    setIsRunning(false);

    if (!agent || !missionObj) return;

    // Presentation completion is the only engine-execution boundary.
    const result = simulateMission(agent, missionObj, rules, state.simulationSeed);
    setState(s => {
      if (s.simulationResult || !s.agents[s.selectedAgentIndex ?? 0]) return s;
      return applyMissionResults(s, result);
    });
  }, [agent, missionObj, rules, state.simulationResult, state.simulationSeed, tickCount]);

  // Event creation helper
  const createEvent = (category: string, action: string, event: string, detail?: string) => ({
    id: eventIdRef.current++,
    tick: tickCount,
    action,
    event,
    detail,
    category,
    isCurrent: true
  });

  const addEvent = (category: string, action: string, event: string, detail?: string) => {
    setEvents(prev => [
      ...prev.map(e => ({ ...e, isCurrent: false })),
      createEvent(category, action, event, detail)
    ]);
  };

  if (!agent || !mission || !missionObj) {
    return <Station state={state} setState={setState} />;
  }

  if (state.simulationResult) {
    return <MissionReport state={state} setState={setState} />;
  }

  const agentName = getAgentName(agent);
  const simulationStatus = tickCount === 0
    ? 'Waiting to begin simulation...'
    : tickCount < maxTicks
      ? `Running deterministic mission simulation (${tickCount}/${maxTicks})...`
      : 'Simulation complete — preparing Mission Report...';

  return (
    <StationShell
      state={state}
      statusText="LIVE MISSION — MISSION CONTROL"
      screenClass="simulation-root"
    >
      <div className="sim">
        {/* Header identity bar */}
        <div className="sim__identity mono">
          <span>{agentName} · {agent.type} · LVL {agent.level}</span>
          <span>{mission} → {missionObj.location}</span>
          <span className="sim__status">{simulationStatus}</span>
        </div>

        {/* Main tactical + telemetry */}
        <main className="sim__deck">
          {/* Tactical visualization - PRESERVED EXACTLY */}
          <section className="void-panel void-panel--raised panel-enter sim__tactical" style={{ animationDelay: '40ms' }}>
            <div className="tactical-visualization-container">
              <TacticalVisualization
                agentType={agent.type}
                missionType={missionObj.type}
                missionLocation={missionObj.location}
                rules={rules}
                eventLog={events.map(e => ({
                  tick: e.tick,
                  time: new Date().toISOString(),
                  action: e.action as any,
                  event: e.event as any,
                  detail: e.detail || '',
                  fuelPct: agent.fuel,
                  hullPct: agent.hullCurrent
                }))}
                currentTick={tickCount}
                maxTicks={maxTicks}
                isRunning={isRunning}
                isComplete={tickCount >= maxTicks}
                outcome={null}
                finalHullPct={agent.hullCurrent}
                fuelRemainingPct={agent.fuel}
                anomaliesScanned={events.filter(e => e.event === 'ANOMALY_SCANNED').length}
                anomaliesRequired={missionObj.type === 'PROSPECT' ? 3 : missionObj.type === 'SALVAGE' ? 2 : 1}
                agentSurvives={true}
              />
            </div>
          </section>

          {/* Telemetry panel */}
          <section className="void-panel void-panel--raised panel-enter sim__telemetry" style={{ animationDelay: '80ms' }}>
            <div className="void-panel__header">
              <h2 className="void-panel__title">TELEMETRY</h2>
            </div>

            <div className="sim__strips">
              <div className="sim__strip">
                <span className="sim__label">HULL</span>
                <span className={`sim__value${agent.hullCurrent < 30 ? ' critical' : ''}`}>{agent.hullCurrent.toFixed(1)}%</span>
                <span className="sim__bar"><span className="sim__fill" style={{ width: `${Math.max(0, Math.min(100, agent.hullCurrent))}%` }} /></span>
                <span className="sim__detail">MAX {agent.hull} / CRIT 30%</span>
              </div>
              <div className="sim__strip">
                <span className="sim__label">FUEL</span>
                <span className={`sim__value${agent.fuel < fuelThreshold ? ' low' : ''}`}>{agent.fuel.toFixed(1)}%</span>
                <span className="sim__bar"><span className="sim__fill" style={{ width: `${Math.max(0, Math.min(100, agent.fuel))}%` }} /></span>
                <span className="sim__detail">THR {fuelThreshold}% · {isReturning ? 'RTB' : 'NOM'}</span>
              </div>
              <div className="sim__strip">
                <span className="sim__label">PHASE</span>
                <span className={`sim__value sim__phase sim__phase--${getPhaseBadgeClass(phaseState)}`}>{phaseState}</span>
              </div>
              <div className="sim__strip">
                <span className="sim__label">NAV MODE</span>
                <span className="sim__value">{rules.travelMode ?? 'BALANCED'}</span>
              </div>
              <div className="sim__strip">
                <span className="sim__label">MISSION</span>
                <span className="sim__value">{tickCount}/{maxTicks} · {Math.round(progressPercent)}%</span>
                <span className="sim__bar"><span className="sim__fill" style={{ width: `${progressPercent}%` }} /></span>
                <span className="sim__detail">{isReturning ? 'AUTO-RETURN' : 'IN PROGRESS'}</span>
              </div>
              <div className="sim__strip">
                <span className="sim__label">NAV</span>
                <span className="sim__value">{agent.nav}</span>
                <span className="sim__detail">SCAN +{Math.round((agent.nav / 100) * 100) / 100}x</span>
              </div>
              <div className="sim__strip">
                <span className="sim__label">OPS</span>
                <span className="sim__value">{agent.ops}</span>
                <span className="sim__detail">HSTL +{Math.round((agent.ops / 100) * 100) / 100}x</span>
              </div>
            </div>
          </section>

          {/* Status panel */}
          <section className="void-panel void-panel--raised panel-enter sim__status" style={{ animationDelay: '80ms' }}>
            <div className="void-panel__header">
              <h2 className="void-panel__title">AGENT STATUS</h2>
            </div>

            <dl className="sim__specs mono">
              <div><dt>CREDITS</dt><dd>{agent.credits.toLocaleString()} CR</dd></div>
              <div><dt>CARGO</dt><dd>{agent.cargoUsed}/{agent.cargo}</dd></div>
              <div><dt>SEED</dt><dd>{state.simulationSeed}</dd></div>
            </dl>

            <div className="sim__current-event scan-surface">
              <div className="sim__current-head mono">CURRENT EVENT</div>
              <div className="sim__current-text current-event-pulse">{simulationStatus}</div>
            </div>
          </section>
        </main>

        {/* Event stream */}
        <section className="void-panel void-panel--raised panel-enter sim__stream" style={{ animationDelay: '120ms' }}>
          <div className="void-panel__header">
            <span className="mono">EVENT STREAM</span>
            <span className="mono">SPEED</span>
          </div>

          <ol className="sim__log mono">
            {events.map((e) => (
              <li key={e.id} className={`sim__entry ${e.isCurrent ? ' is-current' : ''}`}>
                <span className="sim__icon" aria-hidden="true">{getEventIcon(e.category)}</span>
                <span className="sim__tick mono">T{e.tick}</span>
                <span className="sim__action mono">{e.action}</span>
                <span className="sim__text">{e.event}</span>
                {e.detail && <span className="sim__detail mono">{e.detail}</span>}
              </li>
            ))}
          </ol>

          <div className="sim__controls">
            <div className="sim__speed" role="group" aria-label="Simulation speed">
              {[1, 5, 10].map((v) => (
                <button
                  key={v}
                  type="button"
                  className={`sim__speed-btn${speed === v ? ' is-active' : ''}`}
                  onClick={() => setSpeed(v)}
                >
                  {v}x
                </button>
              ))}
            </div>
            <button
              type="button"
              className="void-btn void-btn--ghost sim__abort"
              onClick={() => {
                setIsRunning(false);
                setState(s => ({ ...s, screen: 'station' }));
              }}
            >
              ABORT
            </button>
          </div>
        </section>
      </div>
    </StationShell>
  );
}