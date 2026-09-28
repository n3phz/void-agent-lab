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
    case 'NAV': return '◈';
    case 'JUMP': return '⬡';
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

const getCategoryLabel = (category: string): string => {
  switch (category) {
    case 'NAV': return 'NAVIGATION';
    case 'JUMP': return 'JUMP';
    case 'ANOMALY': return 'SENSOR';
    case 'HOSTILE': return 'THREAT';
    case 'DAMAGE': return 'SYSTEMS';
    case 'DOCKING': return 'DOCKING';
    case 'SUCCESS': return 'MISSION';
    case 'FAILURE': return 'FAILURE';
    case 'ABORT': return 'ABORT';
    default: return category;
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

    const result = simulateMission(agent, missionObj, rules, state.simulationSeed);
    setState(s => {
      if (s.simulationResult || !s.agents[s.selectedAgentIndex ?? 0]) return s;
      return applyMissionResults(s, result);
    });
  }, [agent, missionObj, rules, state.simulationResult, state.simulationSeed, tickCount]);

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
  const latestEvent = events[events.length - 1];

  // Format tick as mission time
  const missionTime = `${String(Math.floor(tickCount / 60)).padStart(2, '0')}:${String(tickCount % 60).padStart(2, '0')}`;

  return (
    <StationShell
      state={state}
      statusText="LIVE MISSION — MISSION CONTROL"
      screenClass="simulation-root"
    >
      <div className="sim">
        {/* Header identity bar */}
        <header className="sim__header">
          <div className="sim__identity">
            <div className="sim__identity-ship">
              <span className="sim__ship-name">{agentName}</span>
              <span className="sim__ship-type mono">{agent.type} · LVL {String(agent.level).padStart(2, '0')}</span>
            </div>
            <div className="sim__mission-strip">
              <span className="sim__mission-type mono">{mission} OPERATION</span>
              <span className="sim__mission-target">{missionObj.location}</span>
              <span className={`sim__phase-badge sim__phase--${getPhaseBadgeClass(phaseState)} mono`}>{phaseState}</span>
            </div>
          </div>
          <div className="sim__mission-clock mono">T+{missionTime} · {tickCount}/{maxTicks} ticks</div>
        </header>

        {/* Main tactical + telemetry */}
        <main className="sim__deck">
          {/* Tactical visualization - PRESERVED EXACTLY */}
          <section className="sim__tactical-wrap">
            <section className="sim__tactical panel-enter" style={{ animationDelay: '40ms' }}>
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

            {/* Right-side instrument panel */}
            <aside className="sim__instruments panel-enter" style={{ animationDelay: '80ms' }}>
              {/* Vessel Status */}
              <div className="sim__instr-block">
                <div className="sim__instr-title mono">VESSEL STATUS</div>
                
                <div className="sim__bar-group">
                  <div className="sim__bar-row">
                    <span className="sim__bar-label mono">HULL</span>
                    <span className={`sim__bar-value mono${agent.hullCurrent < 30 ? ' sim__critical' : ''}`}>
                      {agent.hullCurrent.toFixed(1)}%
                    </span>
                  </div>
                  <div className="sim__bar-track">
                    <div 
                      className={`sim__bar-fill${agent.hullCurrent < 30 ? ' sim__fill-critical' : agent.hullCurrent < 60 ? ' sim__fill-caution' : ''}`}
                      style={{ width: `${Math.max(0, Math.min(100, agent.hullCurrent))}%` }}
                    />
                  </div>
                  <div className="sim__bar-meta mono">
                    <span>MAX {agent.hull}</span>
                    {agent.hullCurrent < 30 && <span className="sim__critical-label">CRITICAL</span>}
                  </div>
                </div>

                <div className="sim__bar-group">
                  <div className="sim__bar-row">
                    <span className="sim__bar-label mono">FUEL</span>
                    <span className={`sim__bar-value mono${agent.fuel < fuelThreshold ? ' sim__caution' : ''}`}>
                      {agent.fuel.toFixed(1)}%
                    </span>
                  </div>
                  <div className="sim__bar-track">
                    <div 
                      className={`sim__bar-fill${agent.fuel < fuelThreshold ? ' sim__fill-caution' : ' sim__fill-normal'}`}
                      style={{ width: `${Math.max(0, Math.min(100, agent.fuel))}%` }}
                    />
                  </div>
                  <div className="sim__bar-meta mono">
                    <span>THR {fuelThreshold}%</span>
                    {isReturning && <span className="sim__rtb-label">RTB</span>}
                  </div>
                </div>

                <div className="sim__spec-row">
                  <span className="sim__spec-label mono">CARGO</span>
                  <span className="sim__spec-value mono">{agent.cargoUsed} / {agent.cargo}</span>
                </div>
              </div>

              {/* Navigation & Operations */}
              <div className="sim__instr-block">
                <div className="sim__instr-title mono">NAVIGATION</div>
                
                <div className="sim__spec-row">
                  <span className="sim__spec-label mono">MODE</span>
                  <span className="sim__spec-value mono">{rules.travelMode ?? 'BALANCED'}</span>
                </div>
                <div className="sim__spec-row">
                  <span className="sim__spec-label mono">SCAN</span>
                  <span className="sim__spec-value mono">+{(agent.nav / 100).toFixed(2)}×</span>
                </div>
                <div className="sim__spec-row">
                  <span className="sim__spec-label mono">OPS</span>
                  <span className="sim__spec-value mono">+{(agent.ops / 100).toFixed(2)}×</span>
                </div>
              </div>

              {/* Mission Progress */}
              <div className="sim__instr-block">
                <div className="sim__instr-title mono">MISSION</div>
                
                <div className="sim__phase-display">
                  <span className="sim__phase-label mono">{phaseState}</span>
                  <span className="sim__phase-percent mono">{Math.round(progressPercent)}%</span>
                </div>
                
                <div className="sim__progress-track">
                  <div className="sim__progress-fill" style={{ width: `${progressPercent}%` }} />
                </div>
                
                <div className="sim__progress-ticks mono">
                  <span>{tickCount}</span>
                  <span>/</span>
                  <span>{maxTicks}</span>
                </div>
              </div>

              {/* Current Activity */}
              {latestEvent && (
                <div className="sim__instr-block sim__current-event-block">
                  <div className="sim__instr-title mono">CURRENT</div>
                  <div className="sim__current-event">
                    <span className="sim__event-category mono">{getCategoryLabel(latestEvent.category)}</span>
                    <span className="sim__event-text">{latestEvent.event}</span>
                    {latestEvent.detail && (
                      <span className="sim__event-detail mono">{latestEvent.detail}</span>
                    )}
                  </div>
                </div>
              )}
            </aside>
          </section>

          {/* Bottom: Event stream + controls */}
          <section className="sim__stream-wrap panel-enter" style={{ animationDelay: '120ms' }}>
            <div className="sim__stream-header">
              <span className="mono">EVENT LOG</span>
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
                  className="void-btn void-btn--danger sim__abort"
                  onClick={() => {
                    setIsRunning(false);
                    setState(s => ({ ...s, screen: 'station' }));
                  }}
                >
                  ABORT
                </button>
              </div>
            </div>

            <ol className="sim__log mono">
              {events.length === 0 ? (
                <li className="sim__empty mono">Awaiting mission start...</li>
              ) : (
                events.map((e) => (
                  <li key={e.id} className={`sim__entry ${e.isCurrent ? ' is-current' : ''}`}>
                    <span className="sim__icon" aria-hidden="true">{getEventIcon(e.category)}</span>
                    <span className="sim__tick mono">T+{String(e.tick).padStart(2, '0')}</span>
                    <span className="sim__action mono">{getCategoryLabel(e.category)}</span>
                    <span className="sim__text">{e.event}</span>
                    {e.detail && <span className="sim__detail mono">{e.detail}</span>}
                  </li>
                ))
              )}
            </ol>
          </section>
        </main>
      </div>
    </StationShell>
  );
}
