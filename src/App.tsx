"use client";

import './App.css';
import { useState, useEffect } from 'react';



import type { GameState } from './gameState';
import { loadState, saveState } from './gameState';

import { AgentBlueprint } from './components/AgentBlueprint';
import { AgentCreation } from './components/AgentCreation';
import { AgentConfiguration } from './components/AgentConfiguration';
import { MissionSelection } from './components/MissionSelection';
import { Station } from './components/Station';
import { Simulation } from './components/Simulation';
import { MissionReport } from './components/MissionReport';
// ============ Station Screen ============
// ============ Mission Selection Screen ============

// ============ Simulation Screen ============

// ============ Mission Report Screen ============

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
