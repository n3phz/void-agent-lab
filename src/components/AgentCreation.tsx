import { useState } from 'react';
import type { AgentType } from '../core/types';
import type { GameState } from '../gameState';
import { createAgent } from '../gameState';
import scoutShipSVG from '../assets/tactical/scout-ship.svg';
import haulerShipSVG from '../assets/tactical/hauler-ship.svg';
import { StationShell } from './StationShell';

interface AgentCreationProps {
  state: GameState;
  setState: React.Dispatch<React.SetStateAction<GameState>>;
}

const AGENT_OPTIONS: {
  type: AgentType;
  role: string;
  nav: number;
  ops: number;
  hull: number;
  cargo: number;
  cost: number;
}[] = [
  { type: 'SCOUT', role: 'Reconnaissance', nav: 75, ops: 55, hull: 35, cargo: 20, cost: 800 },
  { type: 'HAULER', role: 'Heavy Transport', nav: 45, ops: 50, hull: 70, cargo: 30, cost: 1000 },
];

function agentCost(type: AgentType): number {
  return type === 'SCOUT' ? 800 : 1000;
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'nav' | 'caution' | 'safe';
}) {
  const token = `--void-${tone}`;
  return (
    <div className="ac__stat">
      <span className="ac__stat-label mono">{label}</span>
      <span
        className="ac__stat-value value-transition mono"
        style={{ color: `var(${token})` }}
      >
        {value}
      </span>
    </div>
  );
}

export function AgentCreation({ state, setState }: AgentCreationProps) {
  const [type, setType] = useState<AgentType>('SCOUT');
  const [name, setName] = useState('');

  const stats = AGENT_OPTIONS.find((o) => o.type === type)!;
  const cost = agentCost(type);
  const canAfford = state.credits >= cost;

  const handleCreate = () => {
    if (!name.trim() || !canAfford) return;
    const result = createAgent(type, name.trim(), state.credits);
    if (result) {
      setState((s) => ({
        ...s,
        credits: result.remainingCredits,
        agents: [...s.agents, result.agent],
        selectedAgentIndex: s.agents.length,
        screen: 'station',
      }));
    }
  };

  return (
    <StationShell
      state={state}
      statusText="CREATE AGENT — COMMISSIONING STATION"
      screenClass="creation-root"
    >
      <div className="ac">
        {/* Left: form */}
        <div className="ac__col">
          <section className="void-panel void-panel--raised panel-enter" style={{ animationDelay: '40ms' }}>
            <div className="void-panel__header">
              <h2 className="void-panel__title">UNIT IDENTIFICATION</h2>
              <span className="mono ac__credits-readout">
                CREDITS: <span className="value-transition" style={{ color: 'var(--void-safe)' }}>{state.credits.toLocaleString()} CR</span>
              </span>
            </div>

            <label className="ac__field">
              <span className="ac__field-label mono">DESIGNATION</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="ENTER UNIT DESIGNATION"
                className="void-input"
                maxLength={32}
                aria-label="Agent name"
              />
            </label>
          </section>

          <section className="void-panel void-panel--raised panel-enter" style={{ animationDelay: '80ms' }}>
            <div className="void-panel__header">
              <h2 className="void-panel__title">VESSEL TYPE</h2>
            </div>

            <div className="ac__options" role="radiogroup" aria-label="Agent type selection">
              {AGENT_OPTIONS.map((opt) => {
                const isSelected = type === opt.type;
                return (
                  <button
                    key={opt.type}
                    type="button"
                    className={`ac__option${isSelected ? ' is-selected' : ''}`}
                    onClick={() => setType(opt.type)}
                    aria-pressed={isSelected}
                    role="radio"
                  >
                    <div className="ac__option-head">
                      <span className="ac__option-name mono">{opt.type}</span>
                      <span className="ac__option-role mono">{opt.role}</span>
                      <span className="ac__option-cost mono">{opt.cost.toLocaleString()} CR</span>
                    </div>
                    <div className="ac__option-stats">
                      <Stat label="NAV" value={opt.nav} tone="nav" />
                      <Stat label="OPS" value={opt.ops} tone="caution" />
                      <Stat label="HULL" value={opt.hull} tone={opt.hull >= 60 ? 'safe' : 'caution'} />
                      <Stat label="CARGO" value={opt.cargo} tone="safe" />
                    </div>
                    <div className="ac__option-check" aria-hidden="true">
                      {isSelected ? '◈' : '◇'}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="void-panel void-panel--raised panel-enter" style={{ animationDelay: '120ms' }}>
            <div className="void-panel__header">
              <h2 className="void-panel__title">STATS REFERENCE</h2>
            </div>
            <ul className="ac__stats-info">
              <li><strong>NAV</strong> — Anomaly scan success chance</li>
              <li><strong>OPS</strong> — Hostile encounter and bribe success</li>
              <li><strong>HULL</strong> — Damage resistance (max {stats.hull})</li>
              <li><strong>CARGO</strong> — Max cargo units</li>
            </ul>
          </section>
        </div>

        {/* Right: commissioning preview */}
        <div className="ac__col">
          <section className="void-panel void-panel--raised panel-enter ac__preview" style={{ animationDelay: '80ms' }}>
            <div className="void-panel__header">
              <h2 className="void-panel__title">COMMISSIONING STATION</h2>
              <span
                className={`void-status ${canAfford ? 'void-status--active' : 'void-status--danger'} mono`}
                style={{ fontSize: 'var(--text-xs)' }}
              >
                {canAfford ? 'FUNDED' : 'INSUFFICIENT CREDITS'}
              </span>
            </div>

            {/* Vessel bay */}
            <div className="ac__vessel-stage">
              <div className="ac__vessel-grid" aria-hidden="true" />
              <img
                src={type === 'SCOUT' ? scoutShipSVG : haulerShipSVG}
                alt={`${type} vessel`}
                className="ac__vessel"
                style={{
                  filter: type === 'SCOUT'
                    ? 'drop-shadow(0 0 10px var(--void-nav))'
                    : 'drop-shadow(0 0 10px var(--void-caution))',
                }}
              />
              <div
                className="ac__vessel-id mono"
                style={{
                  position: 'absolute',
                  top: 'var(--space-2)',
                  right: 'var(--space-3)',
                  fontSize: 'var(--text-xs)',
                  color: 'var(--text-muted)',
                }}
              >
                {name.trim() || 'UNNAMED UNIT'}
              </div>
            </div>

            {/* Live readout */}
            <dl className="ac__specs" key={type}>
              {([
                ['TYPE', type],
                ['NAV', stats.nav],
                ['OPS', stats.ops],
                ['HULL', stats.hull],
                ['CARGO', stats.cargo],
                ['COST', `${stats.cost} CR`],
              ] as const).map(([label, value]) => (
                <div key={label} className="ac__spec">
                  <dt className="ac__spec-label mono">{label}</dt>
                  <dd className={`ac__spec-value mono value-transition${label === 'NAV' ? ' ab__attr-value--nav' : label === 'OPS' ? ' ab__attr-value--caution' : label === 'COST' ? ' ab__attr-value--caution' : ' ab__attr-value--safe'}`}>
                    {value}
                  </dd>
                </div>
              ))}
            </dl>

            {/* Commission button */}
            <button
              className="void-btn void-btn--primary ac__create-btn"
              onClick={handleCreate}
              disabled={!canAfford || !name.trim()}
              aria-label={`Create ${type} agent`}
            >
              <span>COMMISSION {type}</span>
            </button>

            {!canAfford && (
              <p className="ac__insufficient mono" style={{ fontSize: 'var(--text-xs)', color: 'var(--void-danger)', marginTop: 'var(--space-2)' }}>
                INSUFFICIENT CREDITS — AVAILABLE: {state.credits} CR · REQUIRED: {cost} CR
              </p>
            )}
          </section>
        </div>
      </div>

      <div className="ac__nav">
        <button
          className="void-btn void-btn--ghost"
          onClick={() => setState((s) => ({ ...s, screen: 'station' }))}
        >
          ← RETURN TO STATION
        </button>
      </div>
    </StationShell>
  );
}
