import type { Rules, FuelThreshold, AnomalyResponse, HostileReaction } from '../core/types';
import { THRESHOLDS } from '../core/types';
import type { GameState } from '../gameState';
import { getAgentName } from '../gameState';
import { StationShell } from './StationShell';

interface AgentConfigurationProps {
  state: GameState;
  setState: React.Dispatch<React.SetStateAction<GameState>>;
}

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

export function AgentConfiguration({ state, setState }: AgentConfigurationProps) {
  const rules = state.rules;

  const handleRuleChange = (category: keyof Rules, value: string) => {
    setState(s => ({ ...s, rules: { ...s.rules, [category]: value as Rules[typeof category] } }));
  };

  const selectedAgent = state.selectedAgentIndex !== null && state.agents[state.selectedAgentIndex]
    ? state.agents[state.selectedAgentIndex]
    : null;

  const getOptionClass = (value: string, selected: string, tone?: 'caution' | 'safe') => {
    if (value !== selected) return 'ar__option';
    if (tone === 'caution') return 'ar__option is-selected--caution';
    if (tone === 'safe') return 'ar__option is-selected--safe';
    return 'ar__option is-selected';
  };

  return (
    <StationShell state={state} statusText="AGENT RULES — TACTICAL PROTOCOLS" screenClass="rules-root">
      <div className="rules-root">
        <div className="ar">
          {/* Left: Protocol Modules */}
          <div className="ar__col">
            {/* ENGAGEMENT PROTOCOL */}
            <section className="ar__module panel-enter" style={{ animationDelay: '40ms' }}>
              <div className="ar__module-header">
                <div className="ar__module-icon">⚔</div>
                <div>
                  <h3 className="ar__module-title">ENGAGEMENT PROTOCOL</h3>
                  <div className="ar__module-subtitle mono">HOSTILE REACTION</div>
                </div>
              </div>
              <div className="ar__options" role="radiogroup" aria-label="Hostile reaction selection">
                {HOSTILE_REACTIONS.map((reaction) => (
                  <label key={reaction} className={getOptionClass(reaction, rules.hostileReaction)}>
                    <input
                      type="radio"
                      name="hostileReaction"
                      checked={rules.hostileReaction === reaction}
                      onChange={() => handleRuleChange('hostileReaction', reaction)}
                      className="sr-only"
                    />
                    <div className="ar__option-row">
                      <span className="ar__option-label">{reaction.replace(/_/g, ' ')}</span>
                      <div className="ar__option-meta">
                        <span className="ar__option-check">
                          {reaction === rules.hostileReaction ? '◈' : ''}
                        </span>
                      </div>
                    </div>
                    <div className="ar__option-desc">{hostileSummary[reaction]}</div>
                  </label>
                ))}
              </div>
            </section>

            {/* ANOMALY INVESTIGATION */}
            <section className="ar__module panel-enter" style={{ animationDelay: '80ms' }}>
              <div className="ar__module-header">
                <div className="ar__module-icon ar__module-icon--caution">◇</div>
                <div>
                  <h3 className="ar__module-title">ANOMALY INVESTIGATION</h3>
                  <div className="ar__module-subtitle mono">SENSOR RESPONSE</div>
                </div>
              </div>
              <div className="ar__options" role="radiogroup" aria-label="Anomaly response selection">
                {ANOMALY_RESPONSES.map((response) => (
                  <label key={response} className={getOptionClass(response, rules.anomalyResponse, response === 'INVESTIGATE_LOW_RISK' || response === 'INVESTIGATE_ANY_RISK' ? 'caution' : undefined)}>
                    <input
                      type="radio"
                      name="anomalyResponse"
                      checked={rules.anomalyResponse === response}
                      onChange={() => handleRuleChange('anomalyResponse', response)}
                      className="sr-only"
                    />
                    <div className="ar__option-row">
                      <span className="ar__option-label">{response.replace(/_/g, ' ')}</span>
                      <div className="ar__option-meta">
                        <span className="ar__option-check">
                          {response === rules.anomalyResponse ? '◈' : ''}
                        </span>
                      </div>
                    </div>
                    <div className="ar__option-desc">{anomalySummary[response]}</div>
                  </label>
                ))}
              </div>
            </section>

            {/* RESOURCE MANAGEMENT */}
            <section className="ar__module panel-enter" style={{ animationDelay: '120ms' }}>
              <div className="ar__module-header">
                <div className="ar__module-icon ar__module-icon--safe">◈</div>
                <div>
                  <h3 className="ar__module-title">RESOURCE MANAGEMENT</h3>
                  <div className="ar__module-subtitle mono">FUEL THRESHOLD</div>
                </div>
              </div>
              <div className="ar__options" role="radiogroup" aria-label="Fuel threshold selection">
                {FUEL_LEVELS.map((level) => (
                  <label key={level} className={getOptionClass(level, rules.fuelThreshold, level === 'CONSERVATIVE' || level === 'BALANCED' ? 'safe' : 'caution')}>
                    <input
                      type="radio"
                      name="fuelThreshold"
                      checked={rules.fuelThreshold === level}
                      onChange={() => handleRuleChange('fuelThreshold', level)}
                      className="sr-only"
                    />
                    <div className="ar__option-row">
                      <span className="ar__option-label">{level}</span>
                      <div className="ar__option-meta">
                        <span className="mono" style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                          {THRESHOLDS[level]}%
                        </span>
                        <span className="ar__option-check">
                          {level === rules.fuelThreshold ? '◈' : ''}
                        </span>
                      </div>
                    </div>
                    <div className="ar__option-desc">
                      Auto-return to station when fuel drops to ≤ {THRESHOLDS[level]}%.
                    </div>
                  </label>
                ))}
              </div>
            </section>
          </div>

          {/* Right: Summary Panel */}
          <div className="ar__col">
            <section className="ar__summary panel-enter" style={{ animationDelay: '80ms' }}>
              <div className="ar__summary-header">
                <span className="ar__summary-title">CURRENT CONFIGURATION</span>
              </div>
              <div className="ar__summary-body">
                {selectedAgent && (
                  <div className="ar__summary-item">
                    <div className="ar__summary-label">UNIT</div>
                    <div className="ar__summary-value">{getAgentName(selectedAgent)} · {selectedAgent.type} · LVL {selectedAgent.level}</div>
                  </div>
                )}

                <div className="ar__summary-item">
                  <div className="ar__summary-label">HOSTILE REACTION</div>
                  <div className="ar__summary-value">
                    {rules.hostileReaction.replace(/_/g, ' ')}
                  </div>
                  <div className="ar__summary-desc">{hostileSummary[rules.hostileReaction]}</div>
                </div>

                <div className="ar__summary-item">
                  <div className="ar__summary-label">ANOMALY RESPONSE</div>
                  <div className="ar__summary-value">
                    {rules.anomalyResponse.replace(/_/g, ' ')}
                  </div>
                  <div className="ar__summary-desc">{anomalySummary[rules.anomalyResponse]}</div>
                </div>

                <div className="ar__summary-item">
                  <div className="ar__summary-label">FUEL THRESHOLD</div>
                  <div className="ar__summary-value">
                    <span style={{ color: rules.fuelThreshold === 'CONSERVATIVE' || rules.fuelThreshold === 'BALANCED' ? 'var(--void-safe)' : 'var(--void-caution)' }}>
                      {rules.fuelThreshold}
                    </span>
                    <span style={{ color: 'var(--text-muted)', marginLeft: 'var(--space-2)' }}>
                      (≤ {THRESHOLDS[rules.fuelThreshold]}%)
                    </span>
                  </div>
                  <div className="ar__summary-desc">Auto-return when fuel drops below threshold.</div>
                </div>
              </div>
            </section>
          </div>
        </div>

        {/* Footer Nav */}
        <div className="ar__nav">
          <button
            className="void-btn void-btn--ghost"
            onClick={() => setState(s => ({ ...s, screen: 'station' }))}
          >
            ← RETURN TO STATION
          </button>
          <button
            className="void-btn void-btn--caution"
            onClick={() => setState(s => ({ ...s, screen: 'station' }))}
          >
            SAVE & RETURN
          </button>
        </div>
      </div>
    </StationShell>
  );
}
