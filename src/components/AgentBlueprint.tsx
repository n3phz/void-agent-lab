import type { Agent } from '../core/types';
import type { GameState } from '../gameState';
import { getAgentName, recoverDestroyedAgent, refuelAgent, repairAgent } from '../gameState';
import haulerShipSVG from '../assets/tactical/hauler-ship.svg';
import scoutShipSVG from '../assets/tactical/scout-ship.svg';
import { StationShell } from './StationShell';

interface AgentBlueprintProps {
  state: GameState;
  setState: React.Dispatch<React.SetStateAction<GameState>>;
}

export function AgentBlueprint({ state, setState }: AgentBlueprintProps) {
  const agent =
    state.selectedAgentIndex !== null && state.selectedAgentIndex < state.agents.length
      ? state.agents[state.selectedAgentIndex]
      : null;

  if (!agent) {
    return (
      <StationShell state={state} statusText="AGENT BLUEPRINT - HANGAR BAY" screenClass="blueprint-root">
        <section className="void-panel void-panel--raised panel-enter ab__empty">
          <div className="void-empty__icon">◇</div>
          <h2 className="void-panel__title" style={{ marginBottom: 'var(--space-2)' }}>
            NO VESSEL BAY ASSIGNED
          </h2>
          <p className="mono" style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
            Select an agent at Station Command to open its hangar bay.
          </p>
          <button
            className="void-btn void-btn--primary"
            onClick={() => setState((s) => ({ ...s, screen: 'station' }))}
          >
            ← RETURN TO STATION
          </button>
        </section>
      </StationShell>
    );
  }

  const isDestroyed = agent.hullCurrent <= 0;
  const isLowHull = agent.hullCurrent < 30;
  const isLowFuel = agent.fuel < 30;
  const needsUpgrade = agent.xp >= 50;

  const status = isDestroyed ? 'DESTROYED' : needsUpgrade ? 'LEVEL UP READY' : 'ACTIVE';
  const statusClass = isDestroyed
    ? 'void-status--destroyed'
    : needsUpgrade
      ? 'void-status--levelup'
      : 'void-status--active';

  const repairCost = agent.hullCurrent < 100 ? Math.ceil(100 - agent.hullCurrent) : 0;
  const refuelCost = agent.fuel < 100 ? Math.ceil(100 - agent.fuel) : 0;
  const recoveryCost = isDestroyed ? Math.ceil(30 - agent.hullCurrent) : 0;

  const navMod = Math.round((agent.nav / 100) * 100) / 100;
  const opsMod = Math.round((agent.ops / 100) * 100) / 100;
  const shipSVG = agent.type === 'SCOUT' ? scoutShipSVG : haulerShipSVG;

  const shipGlow = isDestroyed
    ? 'drop-shadow(0 0 16px var(--void-danger))'
    : isLowHull
      ? 'drop-shadow(0 0 12px var(--void-caution))'
      : isLowFuel
        ? 'drop-shadow(0 0 8px var(--void-caution))'
        : 'drop-shadow(0 0 12px var(--void-nav))';

  return (
    <StationShell state={state} statusText="AGENT BLUEPRINT - HANGAR BAY" screenClass="blueprint-root">
      <div className="ab">
        {/* Column A: identity, condition, traits, maintenance */}
        <div className="ab__col">
          <section className="void-panel void-panel--raised panel-enter" style={{ animationDelay: '40ms' }}>
            <div className="void-panel__header">
              <h2 className="void-panel__title">UNIT IDENTITY</h2>
              <span className={`void-status ${statusClass} mono`} style={{ fontSize: 'var(--text-xs)' }}>
                {status}
              </span>
            </div>

            <div className="ab__identity">
              <h3 className="ab__name">{getAgentName(agent)}</h3>
              <div className="ab__designation mono">
                {agent.type} · LEVEL {agent.level} · UNIT {state.selectedAgentIndex! + 1}
              </div>
            </div>

            <div className="void-bar">
              <div className="void-bar__label-row">
                <span className="void-bar__label">XP PROGRESSION</span>
                <span className="void-bar__value value-transition">
                  {agent.xp} / 50
                </span>
              </div>
              <div className="void-bar__track" style={{ height: '6px' }}>
                <div
                  className={`void-bar__fill ${needsUpgrade ? 'void-bar__fill--safe' : 'void-bar__fill--nav'}`}
                  style={{ width: `${Math.min(100, (agent.xp / 50) * 100)}%` }}
                />
              </div>
            </div>

            <p className="ab__hint mono">
              {needsUpgrade
                ? 'Level up available — deploy a mission to apply upgrade'
                : `${50 - agent.xp} XP to next level`}
            </p>
          </section>

          <section className="void-panel void-panel--raised panel-enter" style={{ animationDelay: '80ms' }}>
            <div className="void-panel__header">
              <h2 className="void-panel__title">CONDITION</h2>
            </div>

            <div className="ab__condition">
              <div className="void-bar">
                <div className="void-bar__label-row">
                  <span className="void-bar__label">HULL INTEGRITY</span>
                  <span
                    className="void-bar__value value-transition"
                    style={{ color: isLowHull || isDestroyed ? 'var(--void-danger)' : undefined }}
                  >
                    {agent.hullCurrent.toFixed(1)}%
                  </span>
                </div>
                <div className="void-bar__track" style={{ height: '8px' }}>
                  <div
                    className={`void-bar__fill ${
                      isDestroyed || isLowHull
                        ? 'void-bar__fill--danger void-bar__fill--critical'
                        : isLowHull
                          ? 'void-bar__fill--caution'
                          : 'void-bar__fill--nav'
                    }`}
                    style={{ width: `${Math.max(0, agent.hullCurrent)}%` }}
                  />
                </div>
              </div>

              <div className="void-bar">
                <div className="void-bar__label-row">
                  <span className="void-bar__label">FUEL RESERVES</span>
                  <span
                    className="void-bar__value value-transition"
                    style={{ color: isLowFuel ? 'var(--void-caution)' : undefined }}
                  >
                    {agent.fuel.toFixed(1)}%
                  </span>
                </div>
                <div className="void-bar__track" style={{ height: '8px' }}>
                  <div
                    className={`void-bar__fill ${isLowFuel ? 'void-bar__fill--caution' : 'void-bar__fill--nav'}`}
                    style={{ width: `${Math.max(0, agent.fuel)}%` }}
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="void-panel void-panel--raised panel-enter" style={{ animationDelay: '120ms' }}>
            <div className="void-panel__header">
              <h2 className="void-panel__title">ACTIVE TRAITS</h2>
            </div>
            {agent.traits.slice(1).length === 0 ? (
              <div className="void-empty">
                <div className="void-empty__icon">◇</div>
                <p className="mono" style={{ color: 'var(--text-muted)' }}>
                  NO TRAITS ACQUIRED
                </p>
              </div>
            ) : (
              <div className="ab__traits">
                {agent.traits.slice(1).map((trait, i) => (
                  <span
                    key={i}
                    className="void-status void-status--active mono"
                    style={{ fontSize: 'var(--text-xs)', animationDelay: `${40 * (i + 1)}ms` }}
                  >
                    {trait}
                  </span>
                ))}
              </div>
            )}
          </section>

          <section className="void-panel void-panel--raised panel-enter" style={{ animationDelay: '160ms' }}>
            <div className="void-panel__header">
              <h2 className="void-panel__title">MAINTENANCE</h2>
            </div>
            <div className="ab__maintenance">
              <button
                className="void-btn void-btn--primary"
                onClick={() => applyMaintenance(setState, state, agent, repairAgent, repairCost)}
                disabled={repairCost === 0 || state.credits < repairCost}
              >
                <span>REPAIR</span>
                <span className="void-btn__cost mono">{repairCost} CR</span>
              </button>
              <button
                className="void-btn"
                onClick={() => applyMaintenance(setState, state, agent, refuelAgent, refuelCost)}
                disabled={refuelCost === 0 || state.credits < refuelCost}
              >
                <span>REFUEL</span>
                <span className="void-btn__cost mono">{refuelCost} CR</span>
              </button>
              {isDestroyed && (
                <button
                  className="void-btn void-btn--danger"
                  onClick={() => applyMaintenance(setState, state, agent, recoverDestroyedAgent, recoveryCost)}
                  disabled={recoveryCost === 0 || state.credits < recoveryCost}
                >
                  <span>RECOVER</span>
                  <span className="void-btn__cost mono">{recoveryCost} CR</span>
                </button>
              )}
            </div>
          </section>
        </div>

        {/* Column B: vessel bay, attributes, service record */}
        <div className="ab__col">
          <section
            className="void-panel void-panel--raised panel-enter ab__bay"
            style={{ animationDelay: '40ms' }}
          >
            <div className="void-panel__header">
              <h2 className="void-panel__title">HANGAR BAY</h2>
              <span className="mono ab__bay-id">
                {agent.type}-{String(state.selectedAgentIndex! + 1).padStart(2, '0')}
              </span>
            </div>

            <div className="ab__bay-stage">
              <div className="ab__bay-grid" aria-hidden="true" />
              <img src={shipSVG} alt={`${agent.type} vessel`} className="ab__ship" style={{ filter: shipGlow }} />
              <div className="ab__bay-readout mono">
                <span>HULL {agent.hullCurrent.toFixed(1)}%</span>
                <span>FUEL {agent.fuel.toFixed(1)}%</span>
                <span>LVL {agent.level}</span>
              </div>
            </div>

            <div className="ab__specs">
              <Spec label="TYPE" value={agent.type} />
              <Spec label="NAV" value={String(agent.nav)} />
              <Spec label="OPS" value={String(agent.ops)} />
              <Spec label="HULL MAX" value={String(agent.hull)} />
              <Spec label="CARGO" value={`${agent.cargoUsed}/${agent.cargo}`} />
              <Spec label="CREDITS" value={`${agent.credits.toLocaleString()} CR`} />
            </div>
          </section>

          <section className="void-panel void-panel--raised panel-enter" style={{ animationDelay: '80ms' }}>
            <div className="void-panel__header">
              <h2 className="void-panel__title">ATTRIBUTES</h2>
            </div>
            <div className="ab__attributes">
              <Attribute
                label="NAV"
                value={String(agent.nav)}
                tone="nav"
                hint={`Anomaly scan bonus +${navMod}x`}
              />
              <Attribute
                label="OPS"
                value={String(agent.ops)}
                tone="caution"
                hint={`Bribe/hostile modifier +${opsMod}x`}
              />
              <Attribute
                label="HULL"
                value={String(agent.hull)}
                tone={isLowHull ? 'danger' : 'primary'}
                hint={`Damage resistance · ${agent.hullCurrent.toFixed(1)}% current`}
              />
              <Attribute
                label="CARGO"
                value={String(agent.cargo)}
                tone="safe"
                hint={`Max cargo units · ${agent.cargoUsed} used`}
              />
            </div>
          </section>

          <section className="void-panel void-panel--raised panel-enter" style={{ animationDelay: '120ms' }}>
            <div className="void-panel__header">
              <h2 className="void-panel__title">SERVICE RECORD</h2>
              <span className="mono ab__record-count">
                {state.missionHistory.length} MISSION{state.missionHistory.length !== 1 ? 'S' : ''}
              </span>
            </div>

            {state.missionHistory.length === 0 ? (
              <div className="void-empty">
                <div className="void-empty__icon">◆</div>
                <p className="mono" style={{ color: 'var(--text-muted)' }}>
                  NO MISSIONS RECORDED
                </p>
              </div>
            ) : (
              <ul className="ab__record">
                {state.missionHistory
                  .slice()
                  .reverse()
                  .map((m, i) => {
                    const positive = m.netResult >= 0;
                    return (
                      <li
                        key={i}
                        className="ab__record-row panel-enter"
                        style={{ animationDelay: `${Math.min(i * 30, 300)}ms` }}
                      >
                        <span className="ab__record-type mono">
                          {m.agent.type} · {m.outcome.toUpperCase()}
                        </span>
                        <span
                          className="ab__record-net mono value-transition"
                          style={{ color: positive ? 'var(--void-safe)' : 'var(--void-danger)' }}
                        >
                          {positive ? '+' : ''}
                          {m.netResult.toLocaleString()} CR
                        </span>
                        <span className="ab__record-xp mono value-transition">+{m.xpEarned} XP</span>
                      </li>
                    );
                  })}
              </ul>
            )}
          </section>
        </div>
      </div>

      <div className="ab__nav">
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

// ---------- helpers ----------

function applyMaintenance(
  setState: React.Dispatch<React.SetStateAction<GameState>>,
  state: GameState,
  agent: Agent,
  fn: typeof repairAgent,
  cost: number,
) {
  if (state.credits <= 0 || cost === 0) return;
  const res = fn(agent, state.credits);
  if (!res.canAfford) return;
  setState((s) => {
    const updatedAgents = [...s.agents];
    updatedAgents[s.selectedAgentIndex ?? 0] = res.agent;
    return { ...s, credits: s.credits - res.spent, agents: updatedAgents };
  });
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div className="ab__spec">
      <div className="ab__spec-label mono">{label}</div>
      <div className="ab__spec-value mono value-transition">{value}</div>
    </div>
  );
}

function Attribute({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint: string;
  tone: 'nav' | 'caution' | 'safe' | 'danger' | 'primary';
}) {
  return (
    <div className="ab__attr">
      <div className="ab__attr-label mono">{label}</div>
      <div className={`ab__attr-value mono value-transition ab__attr-value--${tone}`}>{value}</div>
      <div className="ab__attr-hint mono">{hint}</div>
    </div>
  );
}
