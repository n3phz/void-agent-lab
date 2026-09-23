"use client";

import { useState, useEffect, useMemo, useRef } from 'react';
import type { Rules, EventRecord, AgentType } from './core/types';
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
    <section className="screen">
      <div className="screen__hero">
        <h1>Create Agent</h1>
        <p>Designate a new pilot for the fleet</p>
      </div>
      
      <div style={{ padding: '24px', maxWidth: '600px' }}>
        <h2>Select Agent Type</h2>
        
        <div style={{ margin: '16px 0' }}>
          <label style={{ 
            display: 'block', 
            padding: '12px', 
            margin: '8px 0',
            border: `2px solid ${type === 'SCOUT' ? 'var(--accent)' : 'var(--border)'}`,
            borderRadius: '4px',
            cursor: 'pointer',
            backgroundColor: type === 'SCOUT' ? 'var(--accent-bg)' : 'transparent'
          }} onClick={() => setType('SCOUT')}>
            <strong>SCOUT — {agentCost} CR</strong>
            <br/>
            <small>NAV 75 | OPS 55 | HULL 35 | Cargo 20</small>
          </label>
          
          <label style={{ 
            display: 'block', 
            padding: '12px', 
            margin: '8px 0',
            border: `2px solid ${type === 'HAULER' ? 'var(--accent)' : 'var(--border)'}`,
            borderRadius: '4px',
            cursor: 'pointer',
            backgroundColor: type === 'HAULER' ? 'var(--accent-bg)' : 'transparent'
          }} onClick={() => setType('HAULER')}>
            <strong>HAULER — {agentCost} CR</strong>
            <br/>
            <small>NAV 45 | OPS 50 | HULL 70 | Cargo 30</small>
          </label>
        </div>
        
        <div style={{ margin: '16px 0' }}>
          <label>
            <strong>Agent Name:</strong>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter a name for your agent"
              style={{
                width: '100%',
                padding: '8px',
                marginTop: '8px',
                borderRadius: '4px',
                border: '1px solid var(--border)',
                fontFamily: 'var(--mono)'
              }}
            />
          </label>
        </div>
        
        <div style={{ 
          padding: '12px', 
          border: '1px solid var(--border)',
          borderRadius: '4px',
          marginBottom: '16px',
          fontSize: '14px'
        }}>
          <p style={{ margin: '4px 0' }}>
            <strong>Statistics</strong> — NAV, OPS, HULL (max {type === 'SCOUT' ? 35 : 70}), Cargo
          </p>
          <p style={{ margin: '4px 0', fontSize: '12px', color: 'var(--text-h)' }}>
            NAV increases anomaly scan success chance. OPS affects hostile encounter and bribe success. Hull determines damage resistance.
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={handleCreate}
            disabled={!canAfford || !name.trim()}
            style={{
              padding: '12px 24px',
              flex: 1,
              fontWeight: 'bold',
              cursor: canAfford && name.trim() ? 'pointer' : 'not-allowed',
              opacity: canAfford && name.trim() ? 1 : 0.5
            }}
          >
            Create {type}
          </button>
          <button
            onClick={() => setState(s => ({ ...s, screen: 'station' }))}
            style={{ padding: '12px 24px', flex: 1 }}
          >
            Cancel
          </button>
        </div>
        
        {!canAfford && (
          <p style={{ color: 'red', marginTop: '12px' }}>
            Insufficient credits. Available: {state.credits} CR, Required: {agentCost} CR
          </p>
        )}
      </div>
    </section>
  );
}

// ============ Agent Configuration Screen ============

function AgentConfiguration({ state, setState }: { state: GameState; setState: React.Dispatch<React.SetStateAction<GameState>> }) {
  const rules = state.rules;
  
  const handleRuleChange = (category: keyof Rules, value: string) => {
    setState(s => ({ ...s, rules: { ...s.rules, [category]: value as Rules[typeof category] } }));
  };
  
  return (
    <section className="screen">
      <div className="screen__hero">
        <h1>Configure Agent Rules</h1>
        <p>{state.selectedAgentIndex !== null && state.agents[state.selectedAgentIndex] ? getAgentName(state.agents[state.selectedAgentIndex]!) : 'Station Commander'}</p>
      </div>
      
      <div style={{ padding: '24px', maxWidth: '800px' }}>
        <h2>Fuel Threshold</h2>
        <p style={{ fontSize: '13px', color: 'var(--text-h)' }}>
          When fuel drops to this percentage, the agent automatically returns to station.
        </p>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          {(['CONSERVATIVE', 'BALANCED', 'AGGRESSIVE', 'RECKLESS'] as const).map((level) => (
            <label key={level} style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px',
              padding: '8px 12px',
              border: `2px solid ${rules.fuelThreshold === level ? 'var(--accent)' : 'var(--border)'}`,
              borderRadius: '4px',
              cursor: 'pointer',
              backgroundColor: rules.fuelThreshold === level ? 'var(--accent-bg)' : 'transparent'
            }}>
              <input
                type="radio"
                name="fuelThreshold"
                checked={rules.fuelThreshold === level}
                onChange={() => handleRuleChange('fuelThreshold', level)}
              />
              <span>{level} ({level === 'CONSERVATIVE' ? '50%' : level === 'BALANCED' ? '30%' : level === 'AGGRESSIVE' ? '15%' : '5%'})</span>
            </label>
          ))}
        </div>
        
        <h2 style={{ marginTop: '24px' }}>Anomaly Response</h2>
        <p style={{ fontSize: '13px', color: 'var(--text-h)' }}>
          How the agent handles detected anomalies.
        </p>
        <div style={{ display: 'flex', gap: '16px', flexDirection: 'column' }}>
          {(['IGNORE', 'SCAN_ONLY', 'INVESTIGATE_LOW_RISK', 'INVESTIGATE_ANY_RISK'] as const).map((response) => (
            <label key={response} style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '12px',
              padding: '8px 12px',
              border: `2px solid ${rules.anomalyResponse === response ? 'var(--accent)' : 'var(--border)'}`,
              borderRadius: '4px',
              cursor: 'pointer',
              backgroundColor: rules.anomalyResponse === response ? 'var(--accent-bg)' : 'transparent'
            }}>
              <input
                type="radio"
                name="anomalyResponse"
                checked={rules.anomalyResponse === response}
                onChange={() => handleRuleChange('anomalyResponse', response)}
              />
              <span>{response.replace(/_/g, ' ')}</span>
            </label>
          ))}
        </div>
        
        <h2 style={{ marginTop: '24px' }}>Hostile Reaction</h2>
        <p style={{ fontSize: '13px', color: 'var(--text-h)' }}>
          How the agent responds when encountering hostiles.
        </p>
        <div style={{ display: 'flex', gap: '16px', flexDirection: 'column' }}>
          {(['FLEE_IMMEDIATELY', 'EVADE_AND_SCAN', 'DEFEND', 'BRIBE'] as const).map((reaction) => (
            <label key={reaction} style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '12px',
              padding: '8px 12px',
              border: `2px solid ${rules.hostileReaction === reaction ? 'var(--accent)' : 'var(--border)'}`,
              borderRadius: '4px',
              cursor: 'pointer',
              backgroundColor: rules.hostileReaction === reaction ? 'var(--accent-bg)' : 'transparent'
            }}>
              <input
                type="radio"
                name="hostileReaction"
                checked={rules.hostileReaction === reaction}
                onChange={() => handleRuleChange('hostileReaction', reaction)}
              />
              <span>{reaction.replace(/_/g, ' ')}</span>
            </label>
          ))}
        </div>
        
        <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
          <button
            onClick={() => setState(s => ({ ...s, rules: rules, screen: 'station' }))}
            style={{ padding: '12px 24px', flex: 1 }}
          >
            Save & Return
          </button>
          <button
            onClick={() => setState(s => ({ ...s, screen: 'station' }))}
            style={{ padding: '12px 24px', flex: 1 }}
          >
            Cancel
          </button>
        </div>
      </div>
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

  return (
    <section className="screen">
      <div className="screen__hero">
        <h1>Select Mission</h1>
        <p>Station Commander</p>
      </div>
      
      <div style={{ padding: '24px', maxWidth: '800px' }}>
        <h2>Available Missions</h2>
        {selectedAgent && (
          <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: 'var(--text-h)' }}>
            Selected agent cargo capacity: <strong>{selectedAgent.cargo}</strong>
          </p>
        )}
        {isDestroyed && (
          <p style={{ color: 'red', marginBottom: '12px' }}>
            Selected agent is destroyed and cannot deploy. Recover it from the station or blueprint screen first.
          </p>
        )}
        {MISSION_TYPES.map((mission) => {
          const missionCargoRequirement = mission.type === 'SALVAGE' ? 1 : mission.type === 'COURIER' ? 30 : null;
          const missionCanCargo = selectedAgent ? missionCargoRequirement === null ? true : selectedAgent.cargo >= missionCargoRequirement : true;
          return (
          <div key={mission.type} style={{ 
            margin: '16px 0', 
            padding: '16px',
            border: '1px solid var(--border)',
            borderRadius: '4px',
            backgroundColor: state.selectedMission === mission.type ? 'var(--accent-bg)' : 'transparent'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: '0 0 8px 0' }}>
                  {mission.name} — {mission.location}
                </h3>
                <p style={{ margin: '4px 0', fontSize: '14px' }}>
                  <strong>Risk:</strong> {mission.risk} |{' '}
                  <strong>Reward:</strong> {mission.rewardMin}–{mission.rewardMax} CR |{' '}
                  <strong>Duration:</strong> {mission.durationMin}–{mission.durationMax} ticks
                </p>
                <p style={{ margin: '4px 0', fontSize: '13px', color: 'var(--text-h)' }}>
                  {mission.description}
                </p>
                {(mission.type === 'SALVAGE' || mission.type === 'COURIER') && (
                  <p style={{ margin: '4px 0', fontSize: '13px' }}>
                    <strong>Cargo requirement:</strong> {missionCargoRequirement} units
                  </p>
                )}
                {(mission.type === 'SALVAGE' || mission.type === 'COURIER') && (
                  <p style={{ margin: '4px 0', fontSize: '12px', color: 'var(--text-h)' }}>
                    Cargo capacity affects reward scaling and delivery efficiency for this mission type.
                  </p>
                )}
                {!missionCanCargo && selectedAgent && (
                  <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: 'red' }}>
                    Insufficient cargo capacity ({selectedAgent.cargo} &lt; {missionCargoRequirement}).
                  </p>
                )}
              </div>
              <button
                onClick={() => setState(s => ({ ...s, selectedMission: mission.type }))}
                disabled={!missionCanCargo}
                style={{ padding: '8px 16px', marginLeft: '16px', opacity: !missionCanCargo ? 0.5 : 1, cursor: !missionCanCargo ? 'not-allowed' : 'pointer' }}
              >
                Select
              </button>
            </div>
          </div>
          );
        })}

        
        <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
          {cargoIncompatible && (
            <p style={{ color: 'red', marginBottom: '12px' }}>
              Selected agent cannot complete this mission: cargo capacity {selectedAgent?.cargo} is below requirement.
            </p>
          )}
          <button
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
            style={{
              padding: '12px 24px',
              flex: 1,
              fontWeight: 'bold',
              cursor: (!state.selectedMission || isDestroyed || cargoIncompatible) ? 'not-allowed' : 'pointer',
              opacity: (!state.selectedMission || isDestroyed || cargoIncompatible) ? 0.5 : 1
            }}
          >
            Deploy Mission
          </button>
          <button
            onClick={() => setState(s => ({ ...s, screen: 'station' }))}
            style={{ padding: '12px 24px', flex: 1 }}
          >
            Back
          </button>
        </div>
      </div>
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
    <section className="screen">
      <div className="screen__hero">
        <h1>Mission Report</h1>
        <p>Station Commander</p>
      </div>
      
      <div style={{ padding: '24px', maxWidth: '800px' }}>
        <div style={{ 
          padding: '16px',
          border: '2px solid var(--accent)',
          borderRadius: '4px',
          marginBottom: '24px',
          textAlign: 'center'
        }}>
          <h2 style={{ margin: '0 0 12px 0' }}>Outcome: {result.outcome.toUpperCase()}</h2>
          <p style={{ margin: '0' }}>
            Net Result: <strong>{result.netResult} CR</strong> | 
            XP Gained: <strong>{result.xpEarned}</strong>
          </p>
        </div>
        
        <div style={{ marginBottom: '24px' }}>
          <h3>Agent Status</h3>
          <div style={{ 
            padding: '12px',
            border: '1px solid var(--border)',
            borderRadius: '4px'
          }}>
            <p><strong>{getAgentName(agent)} (Level {agent.level})</strong></p>
            <p>
              Hull: {result.finalHullPct}% | Fuel: {result.fuelRemainingPct}% | Credits: {agent.credits} CR
            </p>
            {(result.outcome === 'success' && (missionObj?.type === 'SALVAGE' || missionObj?.type === 'COURIER')) && (
              <p style={{ marginTop: '8px', fontSize: '12px', color: 'var(--text-h)' }}>
                Cargo impact: capacity {agent.cargo} influenced mission reward for {missionObj?.type}.
              </p>
            )}
          </div>
        </div>
        
        <div style={{ marginBottom: '24px' }}>
          <h3>Notable Events ({result.eventLog.length})</h3>
          <div style={{ 
            maxHeight: '200px',
            overflowY: 'auto',
            border: '1px solid var(--border)',
            borderRadius: '4px',
            padding: '8px'
          }}>
            {result.eventLog.slice(0, 30).map((event: EventRecord, i: number) => (
              <p key={i} style={{ 
                fontFamily: 'var(--mono)',
                fontSize: '12px',
                margin: '2px 0',
                padding: '2px 4px',
                backgroundColor: 'var(--code-bg)'
              }}>
                Tick {event.tick}: {event.action} — {event.event}
              </p>
            ))}
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => {
              setState(s => ({
                ...s,
                simulationResult: null,
                screen: 'station'
              }));
            }}
            style={{
              padding: '12px 24px',
              flex: 1,
              fontWeight: '500',
              fontSize: '16px'
            }}
          >
            RETURN TO STATION
          </button>
          <button
            onClick={() => setState(s => ({ ...s, screen: 'agent_blueprint' }))}
            style={{
              padding: '12px 24px',
              flex: 1,
              fontWeight: '500',
              fontSize: '16px'
            }}
          >
            VIEW AGENT BLUEPRINT
          </button>
        </div>
      </div>
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
