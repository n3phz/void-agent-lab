"use client";

import { useState, useEffect, useMemo, useRef } from 'react';
import type { Rules, EventRecord, AgentType, MissionType, FuelThreshold, AnomalyResponse, HostileReaction } from './core/types';
import { simulateMission } from './core/simulation';
import { THRESHOLDS } from './core/types';
import type { GameState } from './gameState';
import { loadState, saveState, createAgent, getMission, getAgentName, MISSION_TYPES, applyMissionResults, generateMissionSeed, repairAgent, refuelAgent, recoverDestroyedAgent } from './gameState';
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
    <section className="station-root" style={{ position: 'relative', overflow: 'hidden' }}>
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
                      className="tactical-button"
                    >
                      Repair ({repairCost} CR)
                    </button>
                    <button
                      onClick={handleRefuel}
                      disabled={refuelCost === 0 || state.credits < refuelCost}
                      className="tactical-button"
                    >
                      Refuel ({refuelCost} CR)
                    </button>
                    {selectedAgent.hullCurrent <= 0 && (
                      <button
                        onClick={handleRecover}
                        disabled={recoveryCost === 0 || state.credits < recoveryCost}
                        className="tactical-button"
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
            className="action-bar__item"
          >
            Create Agent
          </button>
          <button
            onClick={() => setState(s => ({ ...s, screen: 'agent_configuration' }))}
            disabled={state.selectedAgentIndex === null}
            className="action-bar__item"
          >
            Configure Rules
          </button>
          <button
            onClick={() => setState(s => ({ ...s, screen: 'mission_selection' }))}
            disabled={state.agents.length === 0}
            className="action-bar__item"
          >
            Select Mission
          </button>
          <button
            onClick={() => setState(s => ({ ...s, screen: 'agent_blueprint' }))}
            disabled={state.selectedAgentIndex === null}
            className="action-bar__item"
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
    <section className="screen">
      <div className="screen__hero">
        <h1>Agent Blueprint</h1>
        <p>Tactical Engineering File</p>
      </div>

      <div style={{ padding: '24px', maxWidth: '800px' }}>
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h2 style={{ margin: '0 0 4px 0' }}>{getAgentName(agent)}</h2>
              <div style={{ fontFamily: 'var(--mono)', fontSize: '13px', color: 'var(--text)' }}>
                {agent.type} — Level {agent.level}
              </div>
            </div>
            <div style={{
              padding: '4px 12px',
              borderRadius: '4px',
              background: isDestroyed ? 'rgba(255,0,0,0.1)' :
                needsUpgrade ? 'var(--accent-bg)' : 'var(--code-bg)',
              border: `1px solid ${isDestroyed ? 'red' : needsUpgrade ? 'var(--accent)' : 'var(--border)'}`,
              fontFamily: 'var(--mono)',
              fontSize: '12px',
              fontWeight: 'bold'
            }}>
              {status}
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
          <div style={{ padding: '16px', border: '1px solid var(--border)', borderRadius: '4px' }}>
            <div style={{ fontSize: '11px', color: 'var(--text)', marginBottom: '4px' }}>CREDITS</div>
            <div style={{ fontSize: '22px', fontWeight: 'bold', fontFamily: 'var(--mono)' }}>{agent.credits} CR</div>
          </div>
          <div style={{ padding: '16px', border: '1px solid var(--border)', borderRadius: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text)', marginBottom: '4px' }}>XP</div>
                <div style={{ fontSize: '22px', fontWeight: 'bold', fontFamily: 'var(--mono)' }}>{agent.xp} / 50</div>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text)', fontFamily: 'var(--mono)' }}>Level {agent.level}</div>
            </div>
            <div style={{ height: '6px', background: 'var(--border)', borderRadius: '3px', marginTop: '10px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Math.min(100, (agent.xp / 50) * 100)}%`, background: needsUpgrade ? 'var(--accent)' : 'var(--accent-border)', transition: 'width 0.3s' }} />
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text)', marginTop: '6px' }}>
              {needsUpgrade ? 'Level up available — deploy a mission to apply upgrade' : `${50 - agent.xp} XP to next level`}
            </div>
          </div>
          <div style={{ padding: '16px', border: '1px solid var(--border)', borderRadius: '4px' }}>
            <div style={{ fontSize: '11px', color: 'var(--text)', marginBottom: '4px' }}>HULL</div>
            <div style={{ fontSize: '22px', fontWeight: 'bold', fontFamily: 'var(--mono)', color: isLowHull ? 'red' : 'var(--text-h)' }}>
              {agent.hullCurrent.toFixed(1)}%
            </div>
            <div style={{ height: '4px', background: 'var(--border)', borderRadius: '2px', marginTop: '8px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Math.max(0, agent.hullCurrent)}%`, background: isDestroyed ? 'red' : isLowHull ? 'red' : 'var(--accent)', transition: 'width 0.3s' }} />
            </div>
          </div>
          <div style={{ padding: '16px', border: '1px solid var(--border)', borderRadius: '4px' }}>
            <div style={{ fontSize: '11px', color: 'var(--text)', marginBottom: '4px' }}>FUEL</div>
            <div style={{ fontSize: '22px', fontWeight: 'bold', fontFamily: 'var(--mono)', color: isLowFuel ? 'var(--accent)' : 'var(--text-h)' }}>
              {agent.fuel.toFixed(1)}%
            </div>
            <div style={{ height: '4px', background: 'var(--border)', borderRadius: '2px', marginTop: '8px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Math.max(0, agent.fuel)}%`, background: isLowFuel ? 'var(--accent)' : 'var(--accent-border)', transition: 'width 0.3s' }} />
            </div>
          </div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '12px', color: 'var(--text)', marginBottom: '8px' }}>ATTRIBUTES</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '13px' }}>
            <div style={{ padding: '8px', border: '1px solid var(--border)', borderRadius: '4px' }}>
              <strong>NAV</strong>: {agent.nav}
              <div style={{ fontSize: '10px', color: 'var(--text)' }}>Anomaly scan bonus: +{navMod}x</div>
            </div>
            <div style={{ padding: '8px', border: '1px solid var(--border)', borderRadius: '4px' }}>
              <strong>OPS</strong>: {agent.ops}
              <div style={{ fontSize: '10px', color: 'var(--text)' }}>Bribe/hostile modifier: +{opsMod}x</div>
            </div>
            <div style={{ padding: '8px', border: '1px solid var(--border)', borderRadius: '4px' }}>
              <strong>HULL MAX</strong>: {agent.hull}
              <div style={{ fontSize: '10px', color: 'var(--text)' }}>Damage resistance</div>
            </div>
            <div style={{ padding: '8px', border: '1px solid var(--border)', borderRadius: '4px' }}>
              <strong>CARGO</strong>: {agent.cargo}
              <div style={{ fontSize: '10px', color: 'var(--text)' }}>Max cargo units</div>
            </div>
          </div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '12px', color: 'var(--text)', marginBottom: '8px' }}>TRAITS</div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {agent.traits.slice(1).length === 0 ? (
              <span style={{ fontSize: '12px', color: 'var(--text)' }}>No traits gained yet.</span>
            ) : (
              agent.traits.slice(1).map((trait, i) => (
                <span key={i} style={{ padding: '4px 10px', border: '1px solid var(--border)', borderRadius: '4px', fontSize: '12px', fontFamily: 'var(--mono)', background: 'var(--code-bg)' }}>{trait}</span>
              ))
            )}
          </div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '12px', color: 'var(--text)', marginBottom: '8px' }}>MISSION HISTORY</div>
          <div style={{ border: '1px solid var(--border)', borderRadius: '4px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', fontFamily: 'var(--mono)' }}>
              <thead>
                <tr style={{ background: 'var(--code-bg)' }}>
                  <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid var(--border)' }}>Mission</th>
                  <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid var(--border)' }}>Outcome</th>
                  <th style={{ textAlign: 'right', padding: '8px', borderBottom: '1px solid var(--border)' }}>Net CR</th>
                  <th style={{ textAlign: 'right', padding: '8px', borderBottom: '1px solid var(--border)' }}>XP</th>
                </tr>
              </thead>
              <tbody>
                {state.missionHistory.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ padding: '10px', color: 'var(--text)', borderBottom: '1px solid var(--border)' }}>No missions recorded.</td>
                  </tr>
                ) : (
                  state.missionHistory.slice().reverse().map((m, i) => (
                    <tr key={i} style={{ background: i % 2 === 0 ? 'transparent' : 'var(--code-bg)' }}>
                      <td style={{ padding: '8px', borderBottom: '1px solid var(--border)' }}>{m.agent.type} — {m.outcome}</td>
                      <td style={{ padding: '8px', borderBottom: '1px solid var(--border)', textTransform: 'capitalize' }}>{m.outcome}</td>
                      <td style={{ padding: '8px', borderBottom: '1px solid var(--border)', textAlign: 'right' }}>{m.netResult}</td>
                      <td style={{ padding: '8px', borderBottom: '1px solid var(--border)', textAlign: 'right' }}>{m.xpEarned}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '12px' }}>
          <button
            onClick={handleRepair}
            disabled={repairCost === 0 || state.credits < repairCost}
            style={{ padding: '8px 16px', fontSize: '12px', opacity: repairCost === 0 || state.credits < repairCost ? 0.5 : 1 }}
          >
            Repair ({repairCost} CR)
          </button>
          <button
            onClick={handleRefuel}
            disabled={refuelCost === 0 || state.credits < refuelCost}
            style={{ padding: '8px 16px', fontSize: '12px', opacity: refuelCost === 0 || state.credits < refuelCost ? 0.5 : 1 }}
          >
            Refuel ({refuelCost} CR)
          </button>
          {isDestroyed && (
            <button
              onClick={handleRecover}
              disabled={recoveryCost === 0 || state.credits < recoveryCost}
              style={{ padding: '8px 16px', fontSize: '12px', opacity: recoveryCost === 0 || state.credits < recoveryCost ? 0.5 : 1 }}
            >
              Recover ({recoveryCost} CR)
            </button>
          )}
        </div>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setState(s => ({ ...s, screen: 'station' }))}
            style={{ padding: '8px 16px', fontSize: '12px' }}
          >
            Return to Station
          </button>
        </div>
      </div>
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
    <section className="creation-root">
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
        <div className="creation-panel creation-panel--config">
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
                className={`profile-option${type === 'SCOUT' ? ' is-selected' : ''}`}
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
                className={`profile-option${type === 'HAULER' ? ' is-selected' : ''}`}
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

        <aside className="creation-panel creation-panel--preview">
          <h3 className="section-title">LIVE PROFILE</h3>
          <div className="preview-body">
            <div className="preview-agent__name">{name.trim() || 'UNNAMED UNIT'}</div>
            <div className="preview-agent__type mono">{type}</div>
            <dl className="preview-specs mono">
              <div><dt>TYPE</dt><dd>{type}</dd></div>
              <div><dt>NAV</dt><dd>{type === 'SCOUT' ? 75 : 45}</dd></div>
              <div><dt>OPS</dt><dd>{type === 'SCOUT' ? 55 : 50}</dd></div>
              <div><dt>HULL</dt><dd>{type === 'SCOUT' ? 35 : 70}</dd></div>
              <div><dt>CARGO</dt><dd>{type === 'SCOUT' ? 20 : 30}</dd></div>
              <div className="preview-specs__cost"><dt>COST</dt><dd>{agentCost} CR</dd></div>
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
    <section className="rules-root">
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
        <div className="rules-panel rules-panel--config">
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
                <label key={level} className={`rule-option${rules.fuelThreshold === level ? ' is-selected' : ''}`}>
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
                <label key={response} className={`rule-option${rules.anomalyResponse === response ? ' is-selected' : ''}`}>
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
                <label key={reaction} className={`rule-option${rules.hostileReaction === reaction ? ' is-selected' : ''}`}>
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

        <aside className="rules-panel rules-panel--summary">
          <h3 className="section-title">BEHAVIOUR SUMMARY</h3>

          {selectedAgent && (
            <div className="summary-agent">
              <div className="summary-agent__name">{getAgentName(selectedAgent)}</div>
              <div className="summary-agent__type mono">{selectedAgent.type} · LEVEL {selectedAgent.level}</div>
            </div>
          )}

          <div className="summary-block">
            <div className="summary-block__head mono">TRAVEL</div>
            <div className="summary-block__value">{rules.fuelThreshold}</div>
            <div className="summary-block__detail">Auto-return home at ≤ {THRESHOLDS[rules.fuelThreshold]}% fuel.</div>
          </div>

          <div className="summary-block">
            <div className="summary-block__head mono">ANOMALIES</div>
            <div className="summary-block__value">{rules.anomalyResponse.replace(/_/g, ' ')}</div>
            <div className="summary-block__detail">{anomalySummary[rules.anomalyResponse]}</div>
          </div>

          <div className="summary-block">
            <div className="summary-block__head mono">ENCOUNTER</div>
            <div className="summary-block__value">{rules.hostileReaction.replace(/_/g, ' ')}</div>
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
          className="rules-save"
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
    <section className="mission-root">
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
        <div className="mission-panel mission-panel--list">
          <h3 className="section-title">MISSION SELECTION</h3>
          {MISSION_TYPES.map((mission) => {
            const missionCargoRequirement2 = missionCargoRequirement(mission.type);
            const missionCanCargo = selectedAgent ? missionCargoRequirement2 === null ? true : selectedAgent.cargo >= missionCargoRequirement2 : true;
            const isSelected = state.selectedMission === mission.type;
            return (
              <button
                key={mission.type}
                type="button"
                className={`mission-card${isSelected ? ' is-selected' : ''}${!missionCanCargo ? ' is-incompatible' : ''}`}
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

        <aside className="mission-panel mission-panel--brief">
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
            <div className="brief-mission">
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
            className="mission-deploy"
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
  const hasStartedRef = useRef(false);
  const hasCompletedRef = useRef(false);
  
  const agent = state.selectedAgentIndex !== null && state.selectedAgentIndex < state.agents.length ? state.agents[state.selectedAgentIndex] : null;
  const mission = state.selectedMission;
  const rules = state.rules;
  const missionObj = useMemo(() => (mission ? getMission(mission) : null), [mission]);
  const maxTicks = 120;
  
  useEffect(() => {
    setSpeed(state.simulationSpeed);
  }, [state.simulationSpeed]);
  
  // Auto-start the presentation when entering the Simulation screen.
  useEffect(() => {
    if (!agent || !mission || !missionObj || state.simulationResult || hasStartedRef.current) return;

    hasStartedRef.current = true;
    setIsRunning(true);
    setTickCount(0);
    setProgressPercent(0);
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
  
  if (!agent || !mission || !missionObj) {
    return <Station state={state} setState={setState} />;
  }
  
  if (state.simulationResult) {
    return <MissionReport state={state} setState={setState} />;
  }
  
  const fuelThreshold = THRESHOLDS[rules.fuelThreshold];
  const isReturning = agent.fuel <= fuelThreshold;
  const agentName = getAgentName(agent);
  const simulationStatus = tickCount === 0
    ? 'Waiting to begin simulation...'
    : tickCount < maxTicks
      ? `Running deterministic mission simulation (${tickCount}/${maxTicks})...`
      : 'Simulation complete — preparing Mission Report...';
  
  return (
    <section className="screen">
      <div className="screen__hero">
        <h1>Mission Simulation</h1>
        <p>Station Commander</p>
      </div>
      
      <div style={{ padding: '24px', maxWidth: '800px' }}>
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span><strong>Agent:</strong> {agentName} ({agent.type})</span>
            <span><strong>Mission:</strong> {mission} → {missionObj.location}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span><strong>Speed:</strong> {speed}x</span>
            <span><strong>Ticks:</strong> {tickCount}/{maxTicks}</span>
          </div>
        </div>
        
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span>Progress</span>
            <span>{Math.round(progressPercent)}%</span>
          </div>
          <div style={{ height: '8px', background: 'var(--border)', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ height: '100%', background: isReturning ? 'var(--accent)' : 'var(--accent-border)', width: `${progressPercent}%`, transition: 'width 0.3s ease' }} />
          </div>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
          <div style={{ padding: '12px', border: '1px solid var(--border)', borderRadius: '4px' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-h)' }}>HULL</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: agent.hullCurrent < 30 ? 'red' : 'var(--text-h)' }}>{agent.hullCurrent}%</div>
          </div>
          <div style={{ padding: '12px', border: '1px solid var(--border)', borderRadius: '4px' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-h)' }}>FUEL</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: agent.fuel < fuelThreshold ? 'var(--accent)' : 'var(--text-h)' }}>{agent.fuel}%</div>
            <div style={{ fontSize: '11px', color: 'var(--text-h)' }}>Threshold: {fuelThreshold}%</div>
          </div>
        </div>
        
        <div style={{ padding: '12px', border: '1px solid var(--border)', borderRadius: '4px', marginBottom: '20px' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-h)', marginBottom: '8px' }}>RULES ACTIVE</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '13px' }}>
            <div><strong>Fuel:</strong> {rules.fuelThreshold} ({fuelThreshold}% trigger)</div>
            <div><strong>Anomaly:</strong> {rules.anomalyResponse}</div>
            <div><strong>Hostile:</strong> {rules.hostileReaction}</div>
            <div><strong>Seed:</strong> {state.simulationSeed}</div>
          </div>
        </div>
        
        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-h)', marginBottom: '8px' }}>EVENT LOG</div>
          <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: '4px', padding: '8px', background: 'var(--code-bg)', fontFamily: 'var(--mono)', fontSize: '11px' }}>
            <div style={{ color: 'var(--text-h)' }}>{simulationStatus}</div>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setSpeed(1)}
            style={{ 
              padding: '8px 16px', 
              fontSize: '12px',
              background: speed === 1 ? 'var(--accent-bg)' : 'transparent',
              border: `1px solid ${speed === 1 ? 'var(--accent)' : 'var(--border)'}`,
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            1x
          </button>
          <button
            onClick={() => setSpeed(5)}
            style={{ 
              padding: '8px 16px', 
              fontSize: '12px',
              background: speed === 5 ? 'var(--accent-bg)' : 'transparent',
              border: `1px solid ${speed === 5 ? 'var(--accent)' : 'var(--border)'}`,
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            5x
          </button>
          <button
            onClick={() => setSpeed(10)}
            style={{ 
              padding: '8px 16px', 
              fontSize: '12px',
              background: speed === 10 ? 'var(--accent-bg)' : 'transparent',
              border: `1px solid ${speed === 10 ? 'var(--accent)' : 'var(--border)'}`,
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            10x
          </button>
          <button
            onClick={() => {
              setIsRunning(false);
              setState(s => ({ ...s, screen: 'station' }));
            }}
            style={{ padding: '8px 16px', fontSize: '12px', marginLeft: 'auto' }}
          >
            Abort
          </button>
        </div>
      </div>
    </section>
  );
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
    <section className="report-root">
      <header className="report-header">
        <div className="report-header__left">
          <h1 className="report-header__title">MISSION REPORT</h1>
          <p className="report-header__subtitle">Deployment debrief</p>
        </div>
        <div className="report-header__credits">
          {state.credits.toLocaleString()} <span>CR</span>
        </div>
      </header>

      <div className={`report-outcome report-outcome--${result.outcome}`}>
        <div className="report-outcome__label mono">OUTCOME</div>
        <div className="report-outcome__value">{result.outcome.toUpperCase()}</div>
        <div className="report-outcome__stats mono">
          <span>{result.netResult >= 0 ? `+${result.netResult.toLocaleString()}` : result.netResult.toLocaleString()} CR</span>
          <span>+{result.xpEarned} XP</span>
        </div>
      </div>

      <main className="report-deck">
        <div className="report-panel report-panel--agent">
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

        <div className="report-panel report-panel--events">
          <h3 className="section-title">MISSION EVENTS ({result.eventLog.length})</h3>
          {result.eventLog.length === 0 ? (
            <div className="empty-state">No events recorded.</div>
          ) : (
            <ol className="report-events mono">
              {result.eventLog.slice(0, 30).map((event: EventRecord, i: number) => (
                <li key={i} className="report-event">
                  <span className="report-event__tick">T{event.tick} {event.time}</span>
                  <span className="report-event__action">{event.action}</span>
                  <span className="report-event__text">{event.event}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </main>

      <footer className="report-actions">
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
