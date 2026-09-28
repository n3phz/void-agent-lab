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

  return (
    <StationShell state={state} statusText="AGENT CONFIGURATION — OPERATIONS CONSOLE" screenClass="rules-root">
      <div className="cfg">
        {/* Left column: rule configuration */}
        <div className="cfg__col">
          <section className="void-panel void-panel--raised panel-enter" style={{ animationDelay: '40ms' }}>
            <div className="void-panel__header">
              <h2 className="void-panel__title">RULE CONFIGURATION</h2>
              <span className="mono cfg__agent-tag">
                {selectedAgent
                  ? `UNIT ${state.selectedAgentIndex! + 1} · ${selectedAgent.type} · LVL ${selectedAgent.level}`
                  : 'STATION-WIDE DEFAULTS'}
              </span>
            </div>

            {/* Fuel threshold */}
            <div className="cfg__rule-group">
              <h3 className="cfg__rule-legend">FUEL THRESHOLD</h3>
              <p className="cfg__rule-desc">When fuel drops to this percentage, the agent automatically returns to station.</p>
              <div className="cfg__options cfg__options--grid" role="radiogroup" aria-label="Fuel threshold selection">
                {FUEL_LEVELS.map((level) => (
                  <label
                    key={level}
                    className={`cfg__option ${rules.fuelThreshold === level ? 'is-selected' : ''}`}
                  >
                    <input
                      type="radio"
                      name="fuelThreshold"
                      checked={rules.fuelThreshold === level}
                      onChange={() => handleRuleChange('fuelThreshold', level)}
                      className="sr-only"
                    />
                    <span className="cfg__option-text">{level}</span>
                    <span className="cfg__option-hint mono">{THRESHOLDS[level]}%</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Anomaly response */}
            <div className="cfg__rule-group">
              <h3 className="cfg__rule-legend">ANOMALY RESPONSE</h3>
              <p className="cfg__rule-desc">How the agent handles detected anomalies.</p>
              <div className="cfg__options" role="radiogroup" aria-label="Anomaly response selection">
                {ANOMALY_RESPONSES.map((response) => (
                  <label
                    key={response}
                    className={`cfg__option ${rules.anomalyResponse === response ? 'is-selected' : ''}`}
                  >
                    <input
                      type="radio"
                      name="anomalyResponse"
                      checked={rules.anomalyResponse === response}
                      onChange={() => handleRuleChange('anomalyResponse', response)}
                      className="sr-only"
                    />
                    <span className="cfg__option-text">{response.replace(/_/g, ' ')}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Hostile reaction */}
            <div className="cfg__rule-group">
              <h3 className="cfg__rule-legend">HOSTILE REACTION</h3>
              <p className="cfg__rule-desc">How the agent responds when encountering hostiles.</p>
              <div className="cfg__options" role="radiogroup" aria-label="Hostile reaction selection">
                {HOSTILE_REACTIONS.map((reaction) => (
                  <label
                    key={reaction}
                    className={`cfg__option ${rules.hostileReaction === reaction ? 'is-selected' : ''}`}
                  >
                    <input
                      type="radio"
                      name="hostileReaction"
                      checked={rules.hostileReaction === reaction}
                      onChange={() => handleRuleChange('hostileReaction', reaction)}
                      className="sr-only"
                    />
                    <span className="cfg__option-text">{reaction.replace(/_/g, ' ')}</span>
                  </label>
                ))}
              </div>
            </div>
          </section>
        </div>

        {/* Right column: behaviour summary */}
        <div className="cfg__col">
          <section className="void-panel void-panel--raised panel-enter cfg__summary" style={{ animationDelay: '80ms' }}>
            <div className="void-panel__header">
              <h2 className="void-panel__title">BEHAVIOUR SUMMARY</h2>
              {selectedAgent && (
                <span className="mono cfg__summary-agent">
                  {getAgentName(selectedAgent)} · {selectedAgent.type} · LVL {selectedAgent.level}
                </span>
              )}
            </div>

            {/* Travel rule */}
            <div className="cfg__summary-block">
              <dt className="cfg__summary-head mono">TRAVEL</dt>
              <dd className="cfg__summary-value value-transition">{rules.fuelThreshold}</dd>
              <dd className="cfg__summary-detail">Auto-return home at ≤ {THRESHOLDS[rules.fuelThreshold]}% fuel.</dd>
            </div>

            {/* Anomaly rule */}
            <div className="cfg__summary-block">
              <dt className="cfg__summary-head mono">ANOMALIES</dt>
              <dd className="cfg__summary-value value-transition">{rules.anomalyResponse.replace(/_/g, ' ')}</dd>
              <dd className="cfg__summary-detail">{anomalySummary[rules.anomalyResponse]}</dd>
            </div>

            {/* Hostile rule */}
            <div className="cfg__summary-block">
              <dt className="cfg__summary-head mono">ENCOUNTER</dt>
              <dd className="cfg__summary-value value-transition">{rules.hostileReaction.replace(/_/g, ' ')}</dd>
              <dd className="cfg__summary-detail">{hostileSummary[rules.hostileReaction]}</dd>
            </div>
          </section>
        </div>
      </div>

      {/* Footer nav */}
      <div className="cfg__nav">
        <button
          className="void-btn void-btn--ghost"
          onClick={() => setState(s => ({ ...s, screen: 'station' }))}
        >
          ← RETURN TO STATION
        </button>
        <button
          className="void-btn void-btn--primary"
          onClick={() => setState(s => ({ ...s, screen: 'station' }))}
        >
          SAVE &amp; RETURN
        </button>
      </div>
    </StationShell>
  );
}
