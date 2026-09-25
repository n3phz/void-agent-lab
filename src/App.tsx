"use client";

import './App.css';
import { useState, useEffect, useMemo, useRef } from 'react';
import type { Rules, EventRecord, AgentType, MissionType, FuelThreshold, AnomalyResponse, HostileReaction } from './core/types';
import { simulateMission } from './core/simulation';
import { THRESHOLDS } from './core/types';
import type { GameState } from './gameState';
import { loadState, saveState, createAgent, getMission, getAgentName, MISSION_TYPES, applyMissionResults, generateMissionSeed, repairAgent, refuelAgent, recoverDestroyedAgent } from './gameState';
import { TacticalVisualization } from './core/tacticalVisualization';
import stationEnv from './assets/station/station-environment.png';
import scoutShip from './assets/station/scout-ship.png';
import haulerShip from './assets/station/hauler-ship.png';

// ============ Station Screen ============

function Station({ state, setState }: { state: GameState; setState: React.Dispatch<React.SetStateAction<GameState>> }) {
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

  const shipImage = selectedAgent
    ? selectedAgent.type === 'SCOUT'
      ? scoutShip
      : haulerShip
    : null;

  return (
    <section className="station-root screen-enter" style={{ position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${stationEnv})`, backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.78, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'linear-gradient(180deg, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.55) 100%)' }} />
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <header className="station-header">
          <div className="station-header__left">
            <h1 className="station-header__title">VOID // AGENT LAB</h1>
            <p className="station-header__subtitle">Station Commander Interface</p>
          </div>
          <div className="station-header__right">
            <span className="station-credits">{state.credits.toLocaleString()} CR</span>
          </div>
        </header>

        <main className="station-command-deck">
          <aside className="station-roster-panel">
            <div className="panel-header">
              <h3 className="section-title" style={{ margin: 0 }}>AGENT ROSTER</h3>
            </div>
            <div className="roster-list">
              {state.agents.length === 0 ? (
                <div className="empty-state">
                  <p>No agents assigned.</p>
                  <p style={{ fontSize: '12px', color: 'var(--text)' }}>Create an agent to begin.</p>
                </div>
              ) : (
                state.agents.map((a, idx: number) => {
                  const isDestroyed = a.hullCurrent <= 0;
                  const isSelected = idx === state.selectedAgentIndex;
                  return (
                    <div
                      key={idx}
                      className={`agent-card${isSelected ? ' is-selected' : ''}${isDestroyed ? ' is-destroyed' : ''}`}
                      onClick={() => setState(s => ({ ...s, selectedAgentIndex: idx }))}
                    >
                      <div className="agent-card__header">
                        <div className="agent-card__title">
                          <span className="agent-name">{getAgentName(a)}</span>
                          <span className="agent-type">{a.type}</span>
                        </div>
                        {isDestroyed && <span className="agent-status agent-status--destroyed">DESTROYED</span>}
                      </div>
                      <div className="agent-card__meta">
                        <span>LVL {a.level}</span>
                        <span>XP {a.xp}/50</span>
                        <span>HULL {a.hullCurrent.toFixed(1)}%</span>
                        <span>FUEL {a.fuel.toFixed(1)}%</span>
                      </div>
                      <div className="agent-card__footer">
                        <button
                          onClick={(e) => { e.stopPropagation(); setState(s => ({ ...s, selectedAgentIndex: idx })); }}
                          className="agent-select-button"
                        >
                          Select
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </aside>

          <section className="station-selected-panel">
            {selectedAgent ? (
              <>
                <div className="panel-header">
                  <div>
                    <h3 className="section-title" style={{ margin: 0 }}>{getAgentName(selectedAgent)}</h3>
                    <div style={{ fontSize: '12px', color: 'var(--text)' }}>
                      {selectedAgent.type} — Level {selectedAgent.level}
                    </div>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text)', fontFamily: 'var(--mono)', textAlign: 'right' }}>
                    <div>NAV {selectedAgent.nav}</div>
                    <div>OPS {selectedAgent.ops}</div>
                  </div>
                </div>

                <div className="selected-agent__body">
                  <div className="station-preview-frame">
                    {shipImage ? (
                      <img src={shipImage} alt={selectedAgent ? `${selectedAgent.type} vessel` : 'Selected vessel'} />
                    ) : (
                      <div className="preview-placeholder">No vessel data.</div>
                    )}
                  </div>

                  <div className="selected-agent__actions">
                    <button
                      onClick={handleRepair}
                      disabled={repairCost === 0 || state.credits < repairCost}
                      className="btn"
                    >
                      Repair ({repairCost} CR)
                    </button>
                    <button
                      onClick={handleRefuel}
                      disabled={refuelCost === 0 || state.credits < refuelCost}
                      className="btn"
                    >
                      Refuel ({refuelCost} CR)
                    </button>
                    {selectedAgent.hullCurrent <= 0 && (
                      <button
                        onClick={handleRecover}
                        disabled={recoveryCost === 0 || state.credits < recoveryCost}
                        className="btn btn--danger"
                      >
                        Recover ({recoveryCost} CR)
                      </button>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="station-preview-frame">
                <div style={{ padding: '24px', color: 'var(--text)', fontSize: '13px', textAlign: 'center' }}>
                  Select an agent to inspect vessel and status.
                </div>
              </div>
            )}
          </section>
        </main>

        <nav className="station-action-bar">
          <button
            onClick={() => setState(s => ({ ...s, screen: 'agent_creation' }))}
            className="btn btn--secondary"
          >
            Create Agent
          </button>
          <button
            onClick={() => setState(s => ({ ...s, screen: 'agent_configuration' }))}
            disabled={state.selectedAgentIndex === null}
            className="btn btn--secondary"
          >
            Configure Rules
          </button>
          <button
            onClick={() => setState(s => ({ ...s, screen: 'mission_selection' }))}
            disabled={state.agents.length === 0}
            className="btn btn--secondary"
          >
            Select Mission
          </button>
          <button
            onClick={() => setState(s => ({ ...s, screen: 'agent_blueprint' }))}
            disabled={state.selectedAgentIndex === null}
            className="btn btn--secondary"
          >
            Blueprint
          </button>
        </nav>
      </div>
    </section>
  );
}

// ============ Agent Blueprint Screen ============

function AgentBlueprint({ state, setState }: { state: GameState; setState: React.Dispatch<React.SetStateAction<GameState>> }) {
  const agent = state.selectedAgentIndex !== null && state.selectedAgentIndex < state.agents.length
    ? state.agents[state.selectedAgentIndex]
    : null;

  if (!agent) {
    return <Station state={state} setState={setState} />;
  }

  const needsUpgrade = agent.xp >= 50;
  const isLowHull = agent.hullCurrent < 30;
  const isLowFuel = agent.fuel < 30;
  const isDestroyed = agent.hullCurrent <= 0;
  const status = isDestroyed
    ? 'DESTROYED'
    : needsUpgrade
      ? 'LEVEL UP READY'
      : 'ACTIVE';

  const repairCost = agent.hullCurrent < 100 ? Math.ceil(100 - agent.hullCurrent) : 0;
  const refuelCost = agent.fuel < 100 ? Math.ceil(100 - agent.fuel) : 0;
  const recoveryCost = isDestroyed ? Math.ceil(30 - agent.hullCurrent) : 0;

  const handleRepair = () => {
    if (!agent || state.credits <= 0) return;
    const res = repairAgent(agent, state.credits);
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
    if (!agent || state.credits <= 0) return;
    const res = refuelAgent(agent, state.credits);
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
    if (!agent || state.credits <= 0) return;
    const res = recoverDestroyedAgent(agent, state.credits);
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

  const navMod = Math.round((agent.nav / 100) * 100) / 100;
  const opsMod = Math.round((agent.ops / 100) * 100) / 100;

  return (
    <section className="blueprint-root screen-enter">
      <header className="blueprint-header">
        <div className="blueprint-header__left">
          <h1 className="blueprint-header__title">AGENT BLUEPRINT</h1>
          <p className="blueprint-header__subtitle">Tactical Engineering File</p>
        </div>
        <div className="blueprint-header__credits">
          {state.credits.toLocaleString()} <span>CR</span>
        </div>
      </header>

      <main className="blueprint-deck">
        <div className="panel-enter" style={{ animationDelay: '40ms' }}>
        <div className="blueprint-col blueprint-col--left">
          <div className="blueprint-panel blueprint-identity scan-surface">
            <div className="blueprint-identity__head">
              <h2 className="blueprint-identity__name">{getAgentName(agent)}</h2>
              <span
                className={`blueprint-status${isDestroyed ? ' is-destroyed' : needsUpgrade ? ' is-levelup' : ''}${!isDestroyed ? ' status-pulse' : ''}`}
              >
                {status}
              </span>
            </div>
            <div className="blueprint-identity__type mono">{agent.type} — Level {agent.level}</div>
            <div className="blueprint-identity__credits mono">
              <span className="value-transition">CREDITS</span>
              <span className="value-transition">{agent.credits.toLocaleString()} CR</span>
            </div>
          </div>

          <div className="blueprint-panel panel-enter" style={{ animationDelay: '80ms' }}>
            <h3 className="section-title">PROGRESSION</h3>
            <div className="bp-xp__row mono">
              <span className="value-transition">XP {agent.xp} / 50</span>
              <span className="value-transition">LEVEL {agent.level}</span>
            </div>
            <div className="bp-xp__track">
              <div
                className={`bp-xp__fill value-transition${needsUpgrade ? ' is-ready' : ''}`}
                style={{ width: `${Math.min(100, (agent.xp / 50) * 100)}%` }}
              />
            </div>
            <div className="bp-xp__hint">
              {needsUpgrade ? 'Level up available — deploy a mission to apply upgrade' : `${50 - agent.xp} XP to next level`}
            </div>
          </div>

          <div className="blueprint-panel panel-enter" style={{ animationDelay: '120ms' }}>
            <h3 className="section-title">CONDITION</h3>
            <div className="bp-bar">
              <div className="bp-bar__row mono">
                <span>HULL</span>
                <span className={isLowHull ? 'is-critical' : ''}>{agent.hullCurrent.toFixed(1)}%</span>
              </div>
              <div className="bp-bar__track">
                <div
                  className={`bp-bar__fill value-transition bp-bar__fill--hull${isDestroyed || isLowHull ? ' is-critical' : ''}`}
                  style={{ width: `${Math.max(0, agent.hullCurrent)}%` }}
                />
              </div>
            </div>
            <div className="bp-bar">
              <div className="bp-bar__row mono">
                <span>FUEL</span>
                <span className={isLowFuel ? 'is-low' : ''}>{agent.fuel.toFixed(1)}%</span>
              </div>
              <div className="bp-bar__track">
                <div
                  className={`bp-bar__fill value-transition bp-bar__fill--fuel${isLowFuel ? ' is-low' : ''}`}
                  style={{ width: `${Math.max(0, agent.fuel)}%` }}
                />
              </div>
            </div>
          </div>

          <div className="blueprint-panel panel-enter" style={{ animationDelay: '160ms' }}>
            <h3 className="section-title">TRAITS</h3>
            <div className="bp-traits">
              {agent.traits.slice(1).length === 0 ? (
                <span className="empty-state">No traits gained yet.</span>
              ) : (
                agent.traits.slice(1).map((trait, i) => (
                  <span key={i} className={`bp-trait mono bp-stagger-${(i % 4) + 1}`}>{trait}</span>
                ))
              )}
            </div>
          </div>
        </div>
        </div>

        <div className="blueprint-col blueprint-col--right">
          <div className="blueprint-panel panel-enter" style={{ animationDelay: '80ms' }}>
            <h3 className="section-title">ATTRIBUTES</h3>
            <div className="bp-attrs">
              <div className="bp-attr">
                <div className="bp-attr__label mono">NAV</div>
                <div className="bp-attr__value value-transition">{agent.nav}</div>
                <div className="bp-attr__hint">Anomaly scan bonus: +{navMod}x</div>
              </div>
              <div className="bp-attr">
                <div className="bp-attr__label mono">OPS</div>
                <div className="bp-attr__value value-transition">{agent.ops}</div>
                <div className="bp-attr__hint">Bribe/hostile modifier: +{opsMod}x</div>
              </div>
              <div className="bp-attr">
                <div className="bp-attr__label mono">HULL MAX</div>
                <div className="bp-attr__value value-transition">{agent.hull}</div>
                <div className="bp-attr__hint">Damage resistance · current hull {agent.hullCurrent.toFixed(1)}%</div>
              </div>
              <div className="bp-attr">
                <div className="bp-attr__label mono">CARGO</div>
                <div className="bp-attr__value value-transition">{agent.cargo}</div>
                <div className="bp-attr__hint">Max cargo units · used {agent.cargoUsed}</div>
              </div>
            </div>
          </div>

          <div className="blueprint-panel panel-enter" style={{ animationDelay: '120ms' }}>
            <h3 className="section-title">MISSION HISTORY</h3>
            <div className="bp-history-wrap">
              <table className="bp-history">
                <thead>
                  <tr>
                    <th>Mission</th>
                    <th>Outcome</th>
                    <th className="is-num">Net CR</th>
                    <th className="is-num">XP</th>
                  </tr>
                </thead>
                <tbody>
                  {state.missionHistory.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="bp-history__empty">No missions recorded.</td>
                    </tr>
                  ) : (
                    state.missionHistory.slice().reverse().map((m, i) => (
                      <tr key={i} className={`bp-stagger-${(i % 4) + 1}`}>
                        <td className="value-transition">{m.agent.type} — {m.outcome}</td>
                        <td className="bp-history__outcome value-transition">{m.outcome}</td>
                        <td className="is-num value-transition">{m.netResult}</td>
                        <td className="is-num value-transition">{m.xpEarned}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="blueprint-panel blueprint-actions-panel panel-enter" style={{ animationDelay: '160ms' }}>
            <h3 className="section-title">MAINTENANCE</h3>
            <div className="bp-actions">
              <button
                type="button"
                className="bp-action"
                onClick={handleRepair}
                disabled={repairCost === 0 || state.credits < repairCost}
              >
                REPAIR ({repairCost} CR)
              </button>
              <button
                type="button"
                className="bp-action"
                onClick={handleRefuel}
                disabled={refuelCost === 0 || state.credits < refuelCost}
              >
                REFUEL ({refuelCost} CR)
              </button>
              {isDestroyed && (
                <button
                  type="button"
                  className="bp-action bp-action--recover"
                  onClick={handleRecover}
                  disabled={recoveryCost === 0 || state.credits < recoveryCost}
                >
                  RECOVER ({recoveryCost} CR)
                </button>
              )}
            </div>
          </div>
        </div>
      </main>

      <footer className="blueprint-footer">
        <button
          type="button"
          className="bp-back"
          onClick={() => setState(s => ({ ...s, screen: 'station' }))}
        >
          ← RETURN TO STATION
        </button>
      </footer>
    </section>
  );
}

// ============ Mission Selection Screen ============

// ============ Agent Creation Screen ============

function AgentCreation({ state, setState }: { state: GameState; setState: React.Dispatch<React.SetStateAction<GameState>> }) {
  const [type, setType] = useState<AgentType>('SCOUT');
  const [name, setName] = useState('');
  
  const canAfford = type === 'SCOUT' ? state.credits >= 800 : state.credits >= 1000;
  const agentCost = type === 'SCOUT' ? 800 : 1000;
  
  const handleCreate = () => {
    if (!name.trim() || !canAfford) return;
    
    const result = createAgent(type, name.trim(), state.credits);
    if (result) {
      setState(s => ({
        ...s,
        credits: result.remainingCredits,
        agents: [...s.agents, result.agent],
        selectedAgentIndex: s.agents.length,
        screen: 'station'
      }));
    }
  };
  
  return (
    <section className="creation-root screen-enter">
      <header className="creation-header">
        <div className="creation-header__left">
          <h1 className="creation-header__title">CREATE AGENT</h1>
          <p className="creation-header__subtitle">Configure a new operational unit</p>
        </div>
        <div className="creation-header__credits">
          {state.credits.toLocaleString()} <span>CR</span>
        </div>
      </header>

      <main className="creation-deck">
        <div className="creation-panel creation-panel--config panel-enter" style={{ animationDelay: '40ms' }}>
          <h3 className="section-title">AGENT CONFIGURATION</h3>

          <label className="creation-field">
            <span className="creation-field__label">Name</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter a name for your agent"
              className="creation-input"
            />
          </label>

          <div className="creation-field">
            <span className="creation-field__label">Agent Type</span>
            <div className="profile-grid">
              <button
                type="button"
                className={`profile-option selection-transition${type === 'SCOUT' ? ' is-selected' : ''}`}
                onClick={() => setType('SCOUT')}
                aria-pressed={type === 'SCOUT'}
              >
                <span className="profile-option__name">SCOUT</span>
                <span className="profile-option__role">Reconnaissance</span>
                <span className="profile-option__stats mono">NAV 75 · OPS 55 · HULL 35 · CARGO 20</span>
                <span className="profile-option__cost mono">800 CR</span>
              </button>
              <button
                type="button"
                className={`profile-option selection-transition${type === 'HAULER' ? ' is-selected' : ''}`}
                onClick={() => setType('HAULER')}
                aria-pressed={type === 'HAULER'}
              >
                <span className="profile-option__name">HAULER</span>
                <span className="profile-option__role">Heavy Transport</span>
                <span className="profile-option__stats mono">NAV 45 · OPS 50 · HULL 70 · CARGO 30</span>
                <span className="profile-option__cost mono">1,000 CR</span>
              </button>
            </div>
          </div>

          <div className="creation-note">
            <p><strong>Statistics</strong> — NAV, OPS, HULL (max {type === 'SCOUT' ? 35 : 70}), Cargo</p>
            <p>NAV increases anomaly scan success chance. OPS affects hostile encounter and bribe success. Hull determines damage resistance.</p>
          </div>
        </div>

        <aside className="creation-panel creation-panel--preview panel-enter" style={{ animationDelay: '80ms' }}>
          <h3 className="section-title">LIVE PROFILE</h3>
          <div className="preview-body profile-swap">
            <div className="preview-agent__name">{name.trim() || 'UNNAMED UNIT'}</div>
            <div className="preview-agent__type mono">{type}</div>
            <dl className="preview-specs mono" key={type}>
              <div><dt>TYPE</dt><dd className="value-transition">{type}</dd></div>
              <div><dt>NAV</dt><dd className="value-transition">{type === 'SCOUT' ? 75 : 45}</dd></div>
              <div><dt>OPS</dt><dd className="value-transition">{type === 'SCOUT' ? 55 : 50}</dd></div>
              <div><dt>HULL</dt><dd className="value-transition">{type === 'SCOUT' ? 35 : 70}</dd></div>
              <div><dt>CARGO</dt><dd className="value-transition">{type === 'SCOUT' ? 20 : 30}</dd></div>
              <div className="preview-specs__cost"><dt>COST</dt><dd className="value-transition">{agentCost} CR</dd></div>
            </dl>
            {!canAfford && (
              <p className="creation-warning mono">
                INSUFFICIENT CREDITS — AVAILABLE: {state.credits} CR · REQUIRED: {agentCost} CR
              </p>
            )}
            <button
              type="button"
              className="creation-primary"
              onClick={handleCreate}
              disabled={!canAfford || !name.trim()}
            >
              CREATE {type}
            </button>
          </div>
        </aside>
      </main>

      <footer className="creation-footer">
        <button
          type="button"
          className="creation-back"
          onClick={() => setState(s => ({ ...s, screen: 'station' }))}
        >
          ← BACK TO STATION
        </button>
      </footer>
    </section>
  );
}

// ============ Agent Configuration Screen ============

function AgentConfiguration({ state, setState }: { state: GameState; setState: React.Dispatch<React.SetStateAction<GameState>> }) {
  const rules = state.rules;

  const handleRuleChange = (category: keyof Rules, value: string) => {
    setState(s => ({ ...s, rules: { ...s.rules, [category]: value as Rules[typeof category] } }));
  };

  const selectedAgent = state.selectedAgentIndex !== null && state.agents[state.selectedAgentIndex]
    ? state.agents[state.selectedAgentIndex]
    : null;

  const FUEL_LEVELS: readonly FuelThreshold[] = ['CONSERVATIVE', 'BALANCED', 'AGGRESSIVE', 'RECKLESS'];
  const ANOMALY_RESPONSES: readonly AnomalyResponse[] = ['IGNORE', 'SCAN_ONLY', 'INVESTIGATE_LOW_RISK', 'INVESTIGATE_ANY_RISK'];
  const HOSTILE_REACTIONS: readonly HostileReaction[] = ['FLEE_IMMEDIATELY', 'EVADE_AND_SCAN', 'DEFEND', 'BRIBE'];

  const anomalySummary: Record<AnomalyResponse, string> = {
    IGNORE: 'Detected anomalies are left untouched.',
    SCAN_ONLY: 'All anomalies are scanned for data.',
    INVESTIGATE_LOW_RISK: 'Only low-risk anomalies are investigated.',
    INVESTIGATE_ANY_RISK: 'Every anomaly is investigated regardless of risk.',
  };
  const hostileSummary: Record<HostileReaction, string> = {
    FLEE_IMMEDIATELY: 'Disengage at first contact — minimal exposure.',
    EVADE_AND_SCAN: 'Slip past hostiles and scan them on the way out.',
    DEFEND: 'Stand and fight; hull damage accepted.',
    BRIBE: 'Attempt a 100 CR bribe; failed bribes turn to combat.',
  };

  return (
    <section className="rules-root screen-enter">
      <header className="rules-header">
        <div className="rules-header__left">
          <h1 className="rules-header__title">AGENT RULES</h1>
          <p className="rules-header__subtitle">Configure autonomous behaviour</p>
        </div>
        <div className="rules-header__credits">
          {state.credits.toLocaleString()} <span>CR</span>
        </div>
      </header>

      <main className="rules-deck">
        <div className="rules-panel rules-panel--config panel-enter" style={{ animationDelay: '40ms' }}>
          <h3 className="section-title">RULE CONFIGURATION</h3>

          <div className="rules-agent-tag mono">
            {selectedAgent
              ? <>UNIT {state.selectedAgentIndex! + 1} · {selectedAgent.type} · LEVEL {selectedAgent.level}</>
              : <>NO AGENT SELECTED · STATION-WIDE DEFAULTS</>}
          </div>

          <fieldset className="rule-group">
            <legend className="rule-group__name">Fuel Threshold</legend>
            <p className="rule-group__desc">When fuel drops to this percentage, the agent automatically returns to station.</p>
            <div className="rule-options rule-options--grid">
              {FUEL_LEVELS.map((level) => (
                <label key={level} className={`rule-option selection-transition rules-scan${rules.fuelThreshold === level ? ' is-selected' : ''}`}>
                  <input
                    type="radio"
                    name="fuelThreshold"
                    checked={rules.fuelThreshold === level}
                    onChange={() => handleRuleChange('fuelThreshold', level)}
                  />
                  <span className="rule-option__text">{level}</span>
                  <span className="rule-option__hint mono">{THRESHOLDS[level]}%</span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="rule-group">
            <legend className="rule-group__name">Anomaly Response</legend>
            <p className="rule-group__desc">How the agent handles detected anomalies.</p>
            <div className="rule-options">
              {ANOMALY_RESPONSES.map((response) => (
                <label key={response} className={`rule-option selection-transition rules-scan${rules.anomalyResponse === response ? ' is-selected' : ''}`}>
                  <input
                    type="radio"
                    name="anomalyResponse"
                    checked={rules.anomalyResponse === response}
                    onChange={() => handleRuleChange('anomalyResponse', response)}
                  />
                  <span className="rule-option__text">{response.replace(/_/g, ' ')}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="rule-group">
            <legend className="rule-group__name">Hostile Reaction</legend>
            <p className="rule-group__desc">How the agent responds when encountering hostiles.</p>
            <div className="rule-options">
              {HOSTILE_REACTIONS.map((reaction) => (
                <label key={reaction} className={`rule-option selection-transition rules-scan${rules.hostileReaction === reaction ? ' is-selected' : ''}`}>
                  <input
                    type="radio"
                    name="hostileReaction"
                    checked={rules.hostileReaction === reaction}
                    onChange={() => handleRuleChange('hostileReaction', reaction)}
                  />
                  <span className="rule-option__text">{reaction.replace(/_/g, ' ')}</span>
                </label>
              ))}
            </div>
          </fieldset>
        </div>

        <aside className="rules-panel rules-panel--summary panel-enter" style={{ animationDelay: '80ms' }}>
          <h3 className="section-title">BEHAVIOUR SUMMARY</h3>

          {selectedAgent && (
            <div className="summary-agent">
              <div className="summary-agent__name">{getAgentName(selectedAgent)}</div>
              <div className="summary-agent__type mono">{selectedAgent.type} · LEVEL {selectedAgent.level}</div>
            </div>
          )}

          <div className="summary-block" key={rules.fuelThreshold}>
            <div className="summary-block__head mono">TRAVEL</div>
            <div className="summary-block__value value-transition">{rules.fuelThreshold}</div>
            <div className="summary-block__detail">Auto-return home at ≤ {THRESHOLDS[rules.fuelThreshold]}% fuel.</div>
          </div>

          <div className="summary-block" key={rules.anomalyResponse}>
            <div className="summary-block__head mono">ANOMALIES</div>
            <div className="summary-block__value value-transition">{rules.anomalyResponse.replace(/_/g, ' ')}</div>
            <div className="summary-block__detail">{anomalySummary[rules.anomalyResponse]}</div>
          </div>

          <div className="summary-block" key={rules.hostileReaction}>
            <div className="summary-block__head mono">ENCOUNTER</div>
            <div className="summary-block__value value-transition">{rules.hostileReaction.replace(/_/g, ' ')}</div>
            <div className="summary-block__detail">{hostileSummary[rules.hostileReaction]}</div>
          </div>
        </aside>
      </main>

      <footer className="rules-footer">
        <button
          type="button"
          className="rules-back"
          onClick={() => setState(s => ({ ...s, screen: 'station' }))}
        >
          ← BACK TO STATION
        </button>
        <button
          type="button"
          className="rules-save save-confirm"
          onClick={() => setState(s => ({ ...s, rules: rules, screen: 'station' }))}
        >
          SAVE &amp; RETURN
        </button>
      </footer>
    </section>
  );
}

// ============ Mission Selection Screen ============

function MissionSelection({ state, setState }: { state: GameState; setState: React.Dispatch<React.SetStateAction<GameState>> }) {
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

  const missionCargoRequirement = (type: MissionType): number | null =>
    type === 'SALVAGE' ? 1 : type === 'COURIER' ? 30 : null;

  const selectedMissionInfo = MISSION_TYPES.find(m => m.type === state.selectedMission) ?? null;
  const selectedReq = state.selectedMission ? missionCargoRequirement(state.selectedMission) : null;

  const deployBlockedReason = !selectedAgent
    ? 'No agent selected. Return to station and select an agent first.'
    : isDestroyed
      ? 'Selected agent is destroyed and cannot deploy. Recover it from the station or blueprint screen first.'
      : cargoIncompatible
        ? `Selected agent cannot complete this mission: cargo capacity ${selectedAgent.cargo} is below requirement.`
        : null;

  return (
    <section className="mission-root screen-enter">
      <header className="mission-header">
        <div className="mission-header__left">
          <h1 className="mission-header__title">SELECT MISSION</h1>
          <p className="mission-header__subtitle">Choose deployment parameters</p>
        </div>
        <div className="mission-header__credits">
          {state.credits.toLocaleString()} <span>CR</span>
        </div>
      </header>

      <main className="mission-deck">
        <div className="mission-panel mission-panel--list panel-enter" style={{ animationDelay: '40ms' }}>
          <h3 className="section-title">MISSION SELECTION</h3>
          {MISSION_TYPES.map((mission) => {
            const missionCargoRequirement2 = missionCargoRequirement(mission.type);
            const missionCanCargo = selectedAgent ? missionCargoRequirement2 === null ? true : selectedAgent.cargo >= missionCargoRequirement2 : true;
            const isSelected = state.selectedMission === mission.type;
            return (
              <button
                key={mission.type}
                type="button"
                className={`mission-card mission-card-enter selection-transition${isSelected ? ' is-selected' : ''}${!missionCanCargo ? ' is-incompatible' : ''}`}
                onClick={() => setState(s => ({ ...s, selectedMission: mission.type }))}
                disabled={!missionCanCargo}
                aria-pressed={isSelected}
              >
                <div className="mission-card__top">
                  <span className="mission-card__name">{mission.name}</span>
                  <span className={`mission-risk mission-risk--${mission.risk}`}>
                    {mission.risk.toUpperCase()}
                  </span>
                </div>
                <div className="mission-card__loc mono">{mission.location}</div>
                <p className="mission-card__desc">{mission.description}</p>
                <div className="mission-card__stats mono">
                  <span>REWARD {mission.rewardMin.toLocaleString()}–{mission.rewardMax.toLocaleString()} CR</span>
                  <span>DURATION {mission.durationMin}–{mission.durationMax} TICKS</span>
                  {missionCargoRequirement2 !== null && (
                    <span>CARGO REQ {missionCargoRequirement2}</span>
                  )}
                </div>
                {!missionCanCargo && selectedAgent && (
                  <p className="mission-card__warn mono">
                    INSUFFICIENT CARGO CAPACITY ({selectedAgent.cargo} &lt; {missionCargoRequirement2})
                  </p>
                )}
              </button>
            );
          })}
        </div>

        <aside className="mission-panel mission-panel--brief panel-enter" style={{ animationDelay: '80ms' }}>
          <h3 className="section-title">DEPLOYMENT BRIEF</h3>

          {selectedAgent ? (
            <div className="brief-agent">
              <div className="brief-agent__head">
                <span className="brief-agent__name">{getAgentName(selectedAgent)}</span>
                {isDestroyed && <span className="agent-status agent-status--destroyed">DESTROYED</span>}
              </div>
              <div className="brief-agent__type mono">{selectedAgent.type} · LEVEL {selectedAgent.level}</div>
              <div className="brief-agent__meta mono">
                <span>HULL {selectedAgent.hullCurrent.toFixed(1)}%</span>
                <span>FUEL {selectedAgent.fuel.toFixed(1)}%</span>
                <span>CAPACITY {selectedAgent.cargo}</span>
              </div>
            </div>
          ) : (
            <div className="empty-state">No agent selected.</div>
          )}

          {selectedMissionInfo ? (
            <div className="brief-mission scan-surface" key={selectedMissionInfo ? selectedMissionInfo.type : 'none'}>
              <div className="brief-mission__head">
                <span className="brief-mission__name">{selectedMissionInfo.name}</span>
                <span className={`mission-risk mission-risk--${selectedMissionInfo.risk}`}>
                  {selectedMissionInfo.risk.toUpperCase()}
                </span>
              </div>
              <div className="brief-mission__loc mono">→ {selectedMissionInfo.location}</div>
              <dl className="brief-specs mono">
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

              {selectedAgent && selectedReq !== null && (
                <div className={`cargo-check${cargoIncompatible ? ' is-bad' : ' is-good'}`}>
                  <div className="cargo-check__row mono">
                    <span>CAPACITY {selectedAgent.cargo}</span>
                    <span>REQ {selectedReq}</span>
                  </div>
                  <div className="cargo-check__verdict mono">
                    {cargoIncompatible
                      ? `INCOMPATIBLE — SHORT BY ${selectedReq - selectedAgent.cargo}`
                      : `COMPATIBLE — SLACK ${selectedAgent.cargo - selectedReq}`}
                  </div>
                </div>
              )}

              <p className="brief-deploy-note">Deploying launches the live simulation of this mission for the selected agent.</p>
            </div>
          ) : (
            <div className="empty-state">Select a mission to view its briefing.</div>
          )}

          {deployBlockedReason && (
            <p className="mission-warning mono">{deployBlockedReason}</p>
          )}

          <button
            type="button"
            className="mission-deploy deploy-lock"
            onClick={() => {
              if (state.selectedMission && !isDestroyed && !cargoIncompatible) {
                setState(s => {
                  if (!s.agents[s.selectedAgentIndex ?? 0]) return s;
                  return {
                    ...s,
                    simulationSeed: generateMissionSeed(s.simulationSeed),
                    simulationResult: null,
                    screen: 'simulation',
                  };
                });
              }
            }}
            disabled={!state.selectedMission || isDestroyed || cargoIncompatible}
          >
            DEPLOY MISSION
          </button>
        </aside>
      </main>

      <footer className="mission-footer">
        <button
          type="button"
          className="mission-back"
          onClick={() => setState(s => ({ ...s, screen: 'station' }))}
        >
          ← BACK TO STATION
        </button>
      </footer>
    </section>
  );
}

// ============ Simulation Screen ============

function Simulation({ state, setState }: { state: GameState; setState: React.Dispatch<React.SetStateAction<GameState>> }) {
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

  // Helper for phase badge class
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
    <section className="simulation-root screen-enter">
      <header className="simulation-header">
        <div className="simulation-header__left">
          <h1 className="simulation-header__title">LIVE MISSION</h1>
          <p className="simulation-header__subtitle">Mission execution</p>
        </div>
        <div className="simulation-header__credits">
          {state.credits.toLocaleString()} <span>CR</span>
        </div>
      </header>

      <div className="simulation-identity mono">
        <span>{agentName} · {agent.type} · LVL {agent.level}</span>
        <span>{mission} → {missionObj.location}</span>
        <span className="simulation-identity__phase">{simulationStatus}</span>
      </div>

      <main className="simulation-deck">
        <div className="simulation-panel simulation-panel--tactical panel-enter" style={{ animationDelay: '40ms' }}>          <div className="tactical-visualization-container">
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
        </div>

        <div className="simulation-panel simulation-panel--telemetry panel-enter" style={{ animationDelay: '80ms' }}>
          <div className="instrument-strips">
            <div className="instrument-strip">
              <span className="instrument-label">HULL</span>
              <span className={`instrument-value${agent.hullCurrent < 30 ? ' critical' : ''}`}>{agent.hullCurrent.toFixed(1)}%</span>
              <span className="instrument-bar"><span className="instrument-fill" style={{ width: `${Math.max(0, Math.min(100, agent.hullCurrent))}%` }} /></span>
              <span className="instrument-detail">MAX {agent.hull} / CRIT 30%</span>
            </div>
            <div className="instrument-strip">
              <span className="instrument-label">FUEL</span>
              <span className={`instrument-value${agent.fuel < fuelThreshold ? ' low' : ''}`}>{agent.fuel.toFixed(1)}%</span>
              <span className="instrument-bar"><span className="instrument-fill" style={{ width: `${Math.max(0, Math.min(100, agent.fuel))}%` }} /></span>
              <span className="instrument-detail">THR {fuelThreshold}% · {isReturning ? 'RTB' : 'NOM'}</span>
            </div>
            <div className="instrument-strip">
              <span className="instrument-label">PHASE</span>
              <span className={`instrument-value phase-badge phase-badge--${getPhaseBadgeClass(phaseState)}`}>{phaseState}</span>
            </div>
            <div className="instrument-strip">
              <span className="instrument-label">NAV MODE</span>
              <span className="instrument-value">{rules.travelMode ?? 'BALANCED'}</span>
            </div>
            <div className="instrument-strip">
              <span className="instrument-label">MISSION</span>
              <span className="instrument-value">{tickCount}/{maxTicks} · {Math.round(progressPercent)}%</span>
              <span className="instrument-bar"><span className="instrument-fill" style={{ width: `${progressPercent}%` }} /></span>
              <span className="instrument-detail">{isReturning ? 'AUTO-RETURN' : 'IN PROGRESS'}</span>
            </div>
            <div className="instrument-strip">
              <span className="instrument-label">NAV</span>
              <span className="instrument-value">{agent.nav}</span>
              <span className="instrument-detail">SCAN +{Math.round((agent.nav / 100) * 100) / 100}x</span>
            </div>
            <div className="instrument-strip">
              <span className="instrument-label">OPS</span>
              <span className="instrument-value">{agent.ops}</span>
              <span className="instrument-detail">HSTL +{Math.round((agent.ops / 100) * 100) / 100}x</span>
            </div>
          </div>
        </div>

        <div className="simulation-panel simulation-panel--status panel-enter" style={{ animationDelay: '80ms' }}>          <h3 className="section-title">AGENT STATUS</h3>

          <dl className="stat-specs mono">
            <div><dt>CREDITS</dt><dd>{agent.credits.toLocaleString()} CR</dd></div>
            <div><dt>CARGO</dt><dd>{agent.cargoUsed}/{agent.cargo}</dd></div>
            <div><dt>SEED</dt><dd>{state.simulationSeed}</dd></div>
          </dl>

          <div className="current-event scan-surface">
            <div className="current-event__head mono">CURRENT EVENT</div>
            <div className="current-event__text current-event-pulse">{simulationStatus}</div>
          </div>
        </div>
      </main>

      <div className="simulation-stream panel-enter" style={{ animationDelay: '120ms' }}>        <div className="simulation-stream__head mono">
          <span>EVENT STREAM</span>
          <span>SPEED</span>
        </div>
        <div className="simulation-stream__body">
          <ol className="stream-log mono">
            {events.map((e) => (
              <li key={e.id} className={`stream-entry ${e.isCurrent ? ' is-current' : ''}`}>
                <span className="stream-entry__icon" aria-hidden="true">{getEventIcon(e.category)}</span>
                <span className="stream-entry__tick mono">T{e.tick}</span>
                <span className="stream-entry__action mono">{e.action}</span>
                <span className="stream-entry__text">{e.event}</span>
                {e.detail && <span className="stream-entry__detail mono">{e.detail}</span>}
              </li>
            ))}
          </ol>
          <div className="stream-speed">
            <div className="speed-control" role="group" aria-label="Simulation speed">
              {[1, 5, 10].map((v) => (
                <button
                  key={v}
                  type="button"
                  className={`speed-segment${speed === v ? ' is-active speed-active' : ''}`}
                  onClick={() => setSpeed(v)}
                >
                  {v}x
                </button>
              ))}
            </div>
            <button
              type="button"
              className="simulation-abort"
              onClick={() => {
                setIsRunning(false);
                setState(s => ({ ...s, screen: 'station' }));
              }}
            >
              ABORT
            </button>
          </div>
        </div>
      </div>
    </section>
  );

  function getEventIcon(category: string): string {
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
  }
}

// ============ Mission Report Screen ============

function MissionReport({ state, setState }: { state: GameState; setState: React.Dispatch<React.SetStateAction<GameState>> }) {
  const result = state.simulationResult;
  const agent = state.selectedAgentIndex !== null && state.selectedAgentIndex < state.agents.length ? state.agents[state.selectedAgentIndex] : null;
  const missionObj = useMemo(() => (state.selectedMission ? getMission(state.selectedMission) : null), [state.selectedMission]);
  
  if (!result || !agent) {
    return <Station state={state} setState={setState} />;
  }
  
  // Maintenance cost computed for display: getMaintenanceCostFromResult(result.finalHullPct)
  
  return (
    <section className="report-root screen-enter">
      <header className="report-header">
        <div className="report-header__left">
          <h1 className="report-header__title">MISSION REPORT</h1>
          <p className="report-header__subtitle">Deployment debrief</p>
        </div>
        <div className="report-header__credits">
          {state.credits.toLocaleString()} <span>CR</span>
        </div>
      </header>

      <div className={`report-outcome report-outcome--${result.outcome} panel-enter`}>
        <span className="scan-line" aria-hidden="true" />
        <div className="report-outcome__label mono">OUTCOME</div>
        <div className="report-outcome__value">{result.outcome.toUpperCase()}</div>
        <div className="report-outcome__stats mono">
          <span className="value-transition value-count">{result.netResult >= 0 ? `+${result.netResult.toLocaleString()}` : result.netResult.toLocaleString()} CR</span>
          <span className="value-transition value-count">+{result.xpEarned} XP</span>
        </div>
      </div>

      <main className="report-deck">
        <div className="report-panel report-panel--agent panel-enter" style={{ animationDelay: '120ms' }}>
          <h3 className="section-title">AGENT STATUS</h3>
          <div className="report-agent__head">
            <span className="report-agent__name">{getAgentName(agent)}</span>
            {!result.agentSurvives && <span className="agent-status agent-status--destroyed">DESTROYED</span>}
          </div>
          <div className="report-agent__type mono">{agent.type} · LEVEL {agent.level}</div>

          <div className="report-bar">
            <div className="report-bar__row mono"><span>HULL</span><span>{result.finalHullPct}%</span></div>
            <div className="report-bar__track">
              <div className={`report-bar__fill${result.finalHullPct < 30 ? ' is-critical' : ''}`} style={{ width: `${Math.max(0, Math.min(100, result.finalHullPct))}%` }} />
            </div>
          </div>
          <div className="report-bar">
            <div className="report-bar__row mono"><span>FUEL</span><span>{result.fuelRemainingPct}%</span></div>
            <div className="report-bar__track">
              <div className="report-bar__fill" style={{ width: `${Math.max(0, Math.min(100, result.fuelRemainingPct))}%` }} />
            </div>
          </div>

          <dl className="report-specs mono">
            <div><dt>CREDITS</dt><dd>{agent.credits.toLocaleString()} CR</dd></div>
            <div><dt>EARNED</dt><dd>{result.creditsEarned.toLocaleString()} CR</dd></div>
            <div><dt>EXPENSES</dt><dd>{result.creditsExpenses.toLocaleString()} CR</dd></div>
            <div><dt>MAINTENANCE</dt><dd>{result.maintenanceCost.toLocaleString()} CR</dd></div>
          </dl>

          {(result.outcome === 'success' && (missionObj?.type === 'SALVAGE' || missionObj?.type === 'COURIER')) && (
            <p className="report-note">
              Cargo impact: capacity {agent.cargo} influenced mission reward for {missionObj?.type}.
            </p>
          )}
        </div>

        <div className="report-panel report-panel--events panel-enter" style={{ animationDelay: '160ms' }}>
          <h3 className="section-title">MISSION EVENTS ({result.eventLog.length})</h3>
          {result.eventLog.length === 0 ? (
            <div className="empty-state">No events recorded.</div>
          ) : (
            <ol className="report-events mono">
              {result.eventLog.slice(0, 30).map((event: EventRecord, i: number) => (
                <li key={i} className="report-event report-reveal" style={{ animationDelay: `${Math.min(i * 30, 300)}ms` }}>
                  <span className="report-event__tick">T{event.tick} {event.time}</span>
                  <span className="report-event__action">{event.action}</span>
                  <span className="report-event__text">{event.event}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </main>

      <footer className="report-actions panel-enter" style={{ animationDelay: '200ms' }}>
        <button
          type="button"
          className="report-action report-action--primary"
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
          className="report-action"
          onClick={() => setState(s => ({ ...s, screen: 'agent_blueprint' }))}
        >
          VIEW AGENT BLUEPRINT
        </button>
      </footer>
    </section>
  );
}

// ============ Main App ============

export default function App() {
  const [state, setState] = useState<GameState>(() => loadState());
  
  // Persist state changes
  useEffect(() => {
    saveState(state);
  }, [state]);
  
  // Render based on screen
  switch (state.screen) {
    case 'station':
      return <Station state={state} setState={setState} />;
    
    case 'agent_creation':
      return <AgentCreation state={state} setState={setState} />;
    
    case 'agent_configuration':
      return <AgentConfiguration state={state} setState={setState} />;
    
    case 'agent_blueprint':
      return <AgentBlueprint state={state} setState={setState} />;
    
    case 'mission_selection':
      return <MissionSelection state={state} setState={setState} />;
    
    case 'simulation':
      return <Simulation state={state} setState={setState} />;
    
    case 'mission_report':
      return <MissionReport state={state} setState={setState} />;
    
    default:
      return <Station state={state} setState={setState} />;
  }
}
