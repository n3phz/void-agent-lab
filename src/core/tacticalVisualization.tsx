// VOID // AGENT LAB — Phase 11C.1: Core Tactical Artwork Integration
// Procedural SVG artwork: ships, station, markers, effects
// Simulation/determinism untouched; v9 Canvas sizing architecture preserved

import { useEffect, useRef, useState } from 'react';
import type { MissionType, AgentType, EventRecord, Rules } from './types';
import { TRAVEL_MODE } from './types';

// Canvas-safe runtime values.
// Canvas cannot resolve CSS var(...), so we use concrete strings here.
const CANVAS_FONT_MONO = 'ui-monospace, Consolas, monospace';
const CANVAS_COLOR_TEXT = '#9ca3af';
const CANVAS_COLOR_TEXT_H = '#f3f4f6';

// Asset cache for loaded SVG images
const assetCache = new Map<string, HTMLImageElement>();

function drawAsset(ctx: CanvasRenderingContext2D, path: string, x: number, y: number, size: number, rotation = 0): boolean {
  const img = assetCache.get(path);
  if (!img) return false;
  
  ctx.save();
  ctx.translate(x, y);
  if (rotation !== 0) ctx.rotate(rotation);
  ctx.drawImage(img, -size / 2, -size / 2, size, size);
  ctx.restore();
  return true;
}

// Easing functions for smooth animations
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
const easeInOutCubic = (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

export interface VisualizationState {
  phase: 'idle' | 'travel' | 'cruise' | 'mission' | 'hostile' | 'anomaly' | 'damage' | 'complete' | 'abort' | 'return';
  progress: number; // 0-1 overall
  travelProgress: number; // 0-1 travel segment
  missionProgress: number; // 0-1 mission work segment
  shipPosition: { x: number; y: number };
  anomalies: Array<{ x: number; y: number; risk: 'low' | 'high'; scanned: boolean; scanProgress: number }>;
  hostiles: Array<{ x: number; y: number; encountered: boolean; warningPulse: number }>;
  currentEvent: string;
  eventDetail: string;
  hullPct: number;
  fuelPct: number;
  scanPulse: boolean;
  scanPulseProgress: number;
  jumpFlash: boolean;
  jumpFlashProgress: number;
  damageFlash: boolean;
  damageFlashProgress: number;
  successFlash: boolean;
  successFlashProgress: number;
  dockingProgress: number;
  reducedMotion: boolean;
  anomaliesScanned: number;
  // 11C.2: Enhanced event visual state
  hostileLockOn: number; // 0-1 lock-on progress
  damageOverlay: number; // 0-1 damage emphasis
  scanBeamProgress: number; // 0-1 scan beam from ship to anomaly
  jumpPhase: 'idle' | 'charge' | 'gate' | 'burst' | 'transition' | 'complete';
  jumpPhaseProgress: number; // 0-1 within current jump phase
  dockingAlignProgress: number; // 0-1 ship alignment to station
}

interface TacticalVisualizationProps {
  agentType: AgentType;
  missionType: MissionType | null;
  missionLocation: string;
  rules: Rules;
  eventLog: EventRecord[];
  currentTick: number;
  maxTicks: number;
  isRunning: boolean;
  isComplete: boolean;
  outcome: 'success' | 'failure' | 'aborted' | 'destroyed' | null;
  finalHullPct: number;
  fuelRemainingPct: number;
  anomaliesScanned: number;
  anomaliesRequired: number;
  agentSurvives: boolean;
}

const MISSION_LOCATIONS: Record<string, { name: string; distance: number }> = {
  'KELPER-3': { name: 'KELPER-3', distance: 1 },
  'ASTEROID FIELD THETA': { name: 'ASTEROID FIELD THETA', distance: 2 },
  'DERELICT SECTOR': { name: 'DERELICT SECTOR', distance: 2 },
  'OUTPOST PRIME': { name: 'OUTPOST PRIME', distance: 3 },
  'HOME': { name: 'HOME', distance: 0 },
};

export function TacticalVisualization({
  agentType,
  missionType,
  missionLocation,
  rules,
  eventLog,
  currentTick,
  maxTicks,
  isRunning,
  isComplete,
  outcome: _outcome,
  finalHullPct: _finalHullPct,
  fuelRemainingPct: _fuelRemainingPct,
  anomaliesScanned: _anomaliesScanned,
  anomaliesRequired: _anomaliesRequired,
  agentSurvives: _agentSurvives,
}: TacticalVisualizationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);
  const [containerSize, setContainerSize] = useState<{ width: number; height: number } | null>(null);

  // ResizeObserver - single source of truth for container dimensions
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateSize = () => {
      const rect = container.getBoundingClientRect();
      const width = Math.max(rect.width, 160);
      const height = Math.max(rect.height || (width / (16 / 9)), 90);
      setContainerSize({ width, height });
    };

    updateSize();
    const observer = new ResizeObserver(() => updateSize());
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Window resize/orientationchange
  useEffect(() => {
    const handleResize = () => {
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const width = Math.max(rect.width, 160);
      const height = Math.max(rect.height || (width / (16 / 9)), 90);
      setContainerSize({ width, height });
    };
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  const [state, setState] = useState<VisualizationState>({
    phase: 'idle',
    progress: 0,
    travelProgress: 0,
    missionProgress: 0,
    shipPosition: { x: 0, y: 0 },
    anomalies: [],
    hostiles: [],
    currentEvent: 'STANDBY',
    eventDetail: '',
    hullPct: 100,
    fuelPct: 100,
    scanPulse: false,
    scanPulseProgress: 0,
    jumpFlash: false,
    jumpFlashProgress: 0,
    damageFlash: false,
    damageFlashProgress: 0,
    successFlash: false,
    successFlashProgress: 0,
    dockingProgress: 0,
    reducedMotion: false,
    anomaliesScanned: 0,
    // 11C.2
    hostileLockOn: 0,
    damageOverlay: 0,
    scanBeamProgress: 0,
    jumpPhase: 'idle',
    jumpPhaseProgress: 0,
    dockingAlignProgress: 0,
  });
  const prevEventRef = useRef<string>('');

  // Check reduced motion preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = () => setState(s => ({ ...s, reducedMotion: mediaQuery.matches }));
    handler();
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Initialize visualization parameters
  useEffect(() => {
    const location = MISSION_LOCATIONS[missionLocation] || { name: missionLocation, distance: 1 };
    const travelMode = TRAVEL_MODE[rules.travelMode ?? 'BALANCED'];
    void location.distance;
    void travelMode.cruiseTicks;

    // Generate anomaly/hostile positions based on mission type and seed
    const anomalyCount = missionType === 'PROSPECT' ? 3 : missionType === 'SALVAGE' ? 2 : 1;
    const hostileCount = missionType === 'SALVAGE' ? 2 : missionType === 'COURIER' ? 1 : 1;

    const anomalies = Array.from({ length: anomalyCount }, (_, i) => ({
      x: 0.25 + (i / Math.max(1, anomalyCount - 1)) * 0.5,
      y: 0.3 + Math.sin(i * 2.1) * 0.15,
      risk: Math.random() > 0.6 ? 'high' as const : 'low' as const,
      scanned: false,
    }));

    const hostiles = Array.from({ length: hostileCount }, (_, i) => ({
      x: 0.35 + (i / Math.max(1, hostileCount - 1)) * 0.4,
      y: 0.55 + Math.cos(i * 1.7) * 0.12,
      encountered: false,
    }));

    setState(s => ({
      ...s,
      anomalies: anomalies.map(a => ({ ...a, scanProgress: 0 })),
      hostiles: hostiles.map(h => ({ ...h, warningPulse: 0 })),
      shipPosition: { x: 0.1, y: 0.5 },
      hullPct: 100,
      fuelPct: 100,
      phase: 'idle',
      progress: 0,
      travelProgress: 0,
      missionProgress: 0,
      anomaliesScanned: 0,
    }));
  }, [missionType, missionLocation, rules.travelMode]);

  // Main animation loop - sync with simulation events
  useEffect(() => {
    if (!isRunning && !isComplete) return;

    let lastAnimationTime = performance.now();

    const tick = () => {
      if (!canvasRef.current) return;

      const now = performance.now();
      const deltaTime = Math.min((now - lastAnimationTime) / 1000, 0.1); // cap at 100ms
      lastAnimationTime = now;

      const location = MISSION_LOCATIONS[missionLocation] || { name: missionLocation, distance: 1 };
      const travelMode = TRAVEL_MODE[rules.travelMode ?? 'BALANCED'];
      const cruiseTicks = travelMode.cruiseTicks;
      const travelSegmentTicks = location.distance * (cruiseTicks + 1);
      const missionSegmentTicks = maxTicks - travelSegmentTicks;

      // Find latest event
      const latestEvent = eventLog[eventLog.length - 1];
      const eventChanged = latestEvent && latestEvent.event !== prevEventRef.current;

      if (eventChanged && latestEvent) {
        prevEventRef.current = latestEvent.event;

        // Phase transitions based on event type
        let newPhase: VisualizationState['phase'] = state.phase;
        let scanPulse = false;
        let jumpFlash = false;
        let damageFlash = false;
        let successFlash = false;

        switch (latestEvent.event) {
          case 'JUMP':
            newPhase = 'travel';
            jumpFlash = true;
            break;
          case 'CRUISE':
            newPhase = 'cruise';
            break;
          case 'MISJUMP':
            newPhase = 'travel';
            damageFlash = true;
            break;
          case 'ANOMALY_DETECTED':
            newPhase = 'anomaly';
            scanPulse = true;
            break;
          case 'ANOMALY_SCANNED':
            newPhase = 'anomaly';
            successFlash = true;
            break;
          case 'ANOMALY_INVESTIGATED_HIGH_RISK':
          case 'ANOMALY_INVESTIGATED_LOW_RISK':
            newPhase = 'anomaly';
            damageFlash = true;
            break;
          case 'HOSTILE_ENCOUNTER':
          case 'HOSTILE_FLED':
          case 'HOSTILE_DEFEATED':
          case 'HOSTILE_BRIBED':
          case 'HOSTILE_FLED_COMBAT':
            newPhase = 'hostile';
            break;
          case 'HULL_DAMAGE':
            newPhase = 'damage';
            damageFlash = true;
            break;
          case 'LEVEL_UP':
            successFlash = true;
            break;
          case 'MISSION_COMPLETE':
            newPhase = 'complete';
            successFlash = true;
            break;
          case 'MISSION_FAILED':
            newPhase = 'abort';
            break;
          case 'REACHED_HOME':
            newPhase = 'return';
            break;
          default:
            if (latestEvent.action === 'MISSION_WORK') newPhase = 'mission';
            else if (latestEvent.action === 'TRAVEL') newPhase = 'travel';
        }

        setState(s => ({
          ...s,
          phase: newPhase,
          currentEvent: latestEvent.action,
          eventDetail: latestEvent.detail,
          hullPct: latestEvent.hullPct,
          fuelPct: latestEvent.fuelPct,
          scanPulse,
          jumpFlash,
          damageFlash,
          successFlash,
          anomaliesScanned: eventLog.filter(e => e.event === 'ANOMALY_SCANNED').length,
        }));

        // Initialize flash progress values
        if (scanPulse) setState(s => ({ ...s, scanPulseProgress: 0 }));
        if (jumpFlash) setState(s => ({ ...s, jumpFlashProgress: 0 }));
        if (damageFlash) setState(s => ({ ...s, damageFlashProgress: 0 }));
        if (successFlash) setState(s => ({ ...s, successFlashProgress: 0 }));
      }

      // Update progress
      const overallProgress = Math.min(currentTick / maxTicks, 1);
      let travelProgress = 0;
      let missionProgress = 0;

      if (currentTick <= travelSegmentTicks && travelSegmentTicks > 0) {
        travelProgress = currentTick / travelSegmentTicks;
      } else if (missionSegmentTicks > 0) {
        travelProgress = 1;
        missionProgress = Math.min((currentTick - travelSegmentTicks) / missionSegmentTicks, 1);
      }

      // Update ship position along route
      const shipX = 0.1 + (0.75 * travelProgress);
      const shipY = 0.5 + Math.sin(travelProgress * Math.PI * 2) * 0.05;

      // Animate visual effects progress
      setState(s => {
        let nextState = {
          ...s,
          progress: overallProgress,
          travelProgress,
          missionProgress,
          shipPosition: { x: shipX, y: shipY },
        };

        // Animate scan pulse progress (0 to 1 over ~1.5s)
        if (s.scanPulse && s.scanPulseProgress < 1) {
          nextState = { ...nextState, scanPulseProgress: Math.min(1, s.scanPulseProgress + deltaTime * 0.67) };
        } else if (!s.scanPulse && s.scanPulseProgress > 0) {
          nextState = { ...nextState, scanPulseProgress: Math.max(0, s.scanPulseProgress - deltaTime * 0.67) };
        }

        // Animate jump flash progress (0 to 1 over ~0.8s)
        if (s.jumpFlash && s.jumpFlashProgress < 1) {
          nextState = { ...nextState, jumpFlashProgress: Math.min(1, s.jumpFlashProgress + deltaTime * 1.25) };
        } else if (!s.jumpFlash && s.jumpFlashProgress > 0) {
          nextState = { ...nextState, jumpFlashProgress: Math.max(0, s.jumpFlashProgress - deltaTime * 1.25) };
        }

        // Animate damage flash progress (0 to 1 over ~0.6s)
        if (s.damageFlash && s.damageFlashProgress < 1) {
          nextState = { ...nextState, damageFlashProgress: Math.min(1, s.damageFlashProgress + deltaTime * 1.67) };
        } else if (!s.damageFlash && s.damageFlashProgress > 0) {
          nextState = { ...nextState, damageFlashProgress: Math.max(0, s.damageFlashProgress - deltaTime * 1.67) };
        }

        // Animate success flash progress (0 to 1 over ~1s)
        if (s.successFlash && s.successFlashProgress < 1) {
          nextState = { ...nextState, successFlashProgress: Math.min(1, s.successFlashProgress + deltaTime) };
        } else if (!s.successFlash && s.successFlashProgress > 0) {
          nextState = { ...nextState, successFlashProgress: Math.max(0, s.successFlashProgress - deltaTime) };
        }

        // Animate docking progress when mission complete
        if (s.phase === 'complete' || s.phase === 'return') {
          nextState = { ...nextState, dockingProgress: Math.min(1, s.dockingProgress + deltaTime * 0.5) };
        }

        // Animate anomaly scan progress
        const scannedCount = eventLog.filter(e => e.event === 'ANOMALY_SCANNED').length;
        nextState.anomalies = s.anomalies.map((a, i) => {
          if (i < scannedCount) {
            return { ...a, scanProgress: Math.min(1, a.scanProgress + deltaTime * 0.5) };
          } else if (s.phase === 'anomaly' && i === scannedCount) {
            return { ...a, scanProgress: Math.min(1, a.scanProgress + deltaTime * 0.5) };
          }
          return a;
        });

        // 11C.2: Hostile lock-on progress
        if (s.phase === 'hostile' && s.hostileLockOn < 1 && !s.reducedMotion) {
          nextState = { ...nextState, hostileLockOn: Math.min(1, s.hostileLockOn + deltaTime * 2) };
        } else if (s.phase !== 'hostile' && s.hostileLockOn > 0) {
          nextState = { ...nextState, hostileLockOn: Math.max(0, s.hostileLockOn - deltaTime * 1.5) };
        }

        // 11C.2: Damage overlay (brief emphasis, quick decay)
        if (s.damageFlash && s.damageOverlay < 1 && !s.reducedMotion) {
          nextState = { ...nextState, damageOverlay: Math.min(1, s.damageOverlay + deltaTime * 4) };
        } else if (!s.damageFlash && s.damageOverlay > 0) {
          nextState = { ...nextState, damageOverlay: Math.max(0, s.damageOverlay - deltaTime * 2) };
        }

        // 11C.2: Scan beam from ship to anomaly
        if (s.scanPulse && s.scanBeamProgress < 1 && !s.reducedMotion) {
          nextState = { ...nextState, scanBeamProgress: Math.min(1, s.scanBeamProgress + deltaTime * 1.5) };
        } else if (!s.scanPulse && s.scanBeamProgress > 0) {
          nextState = { ...nextState, scanBeamProgress: Math.max(0, s.scanBeamProgress - deltaTime * 1) };
        }

        // 11C.2: Jump phase state machine
        if (s.jumpFlash) {
          const phaseDuration = 0.2; // each phase ~200ms
          if (s.jumpPhase === 'charge' && s.jumpPhaseProgress >= 1) {
            nextState = { ...nextState, jumpPhase: 'gate', jumpPhaseProgress: 0 };
          } else if (s.jumpPhase === 'gate' && s.jumpPhaseProgress >= 1) {
            nextState = { ...nextState, jumpPhase: 'burst', jumpPhaseProgress: 0 };
          } else if (s.jumpPhase === 'burst' && s.jumpPhaseProgress >= 1) {
            nextState = { ...nextState, jumpPhase: 'transition', jumpPhaseProgress: 0 };
          } else if (s.jumpPhase === 'transition' && s.jumpPhaseProgress >= 1) {
            nextState = { ...nextState, jumpPhase: 'complete', jumpPhaseProgress: 0 };
          }
          nextState = { ...nextState, jumpPhaseProgress: Math.min(1, s.jumpPhaseProgress + deltaTime / phaseDuration) };
        } else if (!s.jumpFlash && s.jumpPhase !== 'idle') {
          nextState = { ...nextState, jumpPhase: 'idle', jumpPhaseProgress: 0 };
        }

        // 11C.2: Docking alignment
        if ((s.phase === 'complete' || s.phase === 'return') && s.dockingAlignProgress < 1 && !s.reducedMotion) {
          nextState = { ...nextState, dockingAlignProgress: Math.min(1, s.dockingAlignProgress + deltaTime * 0.8) };
        } else if (s.phase !== 'complete' && s.phase !== 'return' && s.dockingAlignProgress > 0) {
          nextState = { ...nextState, dockingAlignProgress: Math.max(0, s.dockingAlignProgress - deltaTime * 0.5) };
        }

        // Animate hostile warning pulse
        nextState.hostiles = s.hostiles.map(h => ({
          ...h,
          warningPulse: (s.phase === 'hostile' && h.encountered) 
            ? (Math.sin(now * 0.008) + 1) * 0.5 
            : Math.max(0, h.warningPulse - deltaTime * 0.5)
        }));

        return nextState;
      });

      if (isRunning) {
        animationRef.current = requestAnimationFrame(tick);
      }
    };

    lastAnimationTime = performance.now();
    animationRef.current = requestAnimationFrame(tick);
    return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); };
  }, [isRunning, isComplete, currentTick, maxTicks, eventLog, missionLocation, rules.travelMode]);

  // Canvas rendering - single sizing/drawing path
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rawWidth = containerSize?.width;
    const rawHeight = containerSize?.height;
    const logicalWidth = typeof rawWidth === 'number' && Number.isFinite(rawWidth) && rawWidth > 0 ? rawWidth : 320;
    const logicalHeight = typeof rawHeight === 'number' && Number.isFinite(rawHeight) && rawHeight > 0 ? rawHeight : (logicalWidth / (16 / 9));
    const safeWidth = Math.max(160, logicalWidth);
    const safeHeight = Math.max(90, logicalHeight);

    canvas.width = Math.floor(safeWidth * dpr);
    canvas.height = Math.floor(safeHeight * dpr);
    canvas.style.width = `${safeWidth}px`;
    canvas.style.height = `${safeHeight}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const draw = async () => {
      if (!ctx) return;
      const w = safeWidth;
      const h = safeHeight;

      // Clear
      ctx.clearRect(0, 0, w, h);

      // Background gradient
      const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
      bgGrad.addColorStop(0, '#0a0a0f');
      bgGrad.addColorStop(0.5, '#0f0f1a');
      bgGrad.addColorStop(1, '#0a0a0f');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      // Station - SVG artwork
      const stationX = 0.08 * w;
      const stationY = 0.5 * h;
      const stationSize = Math.min(w, h) * 0.18;

      // Station glow
      const stationGlow = ctx.createRadialGradient(stationX, stationY, 0, stationX, stationY, stationSize * 1.5);
      stationGlow.addColorStop(0, 'rgba(170, 59, 255, 0.15)');
      stationGlow.addColorStop(1, 'rgba(170, 59, 255, 0)');
      ctx.fillStyle = stationGlow;
      ctx.fillRect(0, 0, w, h);

      // Station SVG artwork
      drawAsset(ctx, '/src/assets/tactical/station.svg', stationX, stationY, stationSize);

      // Station label
      ctx.font = `10px ${CANVAS_FONT_MONO}`;
      ctx.fillStyle = CANVAS_COLOR_TEXT;
      ctx.fillText('STATION', stationX, stationY + stationSize * 1.2);

      // Destination - SVG artwork
      const destX = 0.88 * w;
      const destY = 0.5 * h;
      const destSize = Math.min(w, h) * 0.12;

      const destGlow = ctx.createRadialGradient(destX, destY, 0, destX, destY, destSize * 1.3);
      destGlow.addColorStop(0, 'rgba(255, 150, 50, 0.12)');
      destGlow.addColorStop(1, 'rgba(255, 150, 50, 0)');
      ctx.fillStyle = destGlow;
      ctx.fillRect(0, 0, w, h);

      // Destination SVG artwork
      let destPath = '/src/assets/tactical/marker-destination.svg';
      if (missionType === 'PROSPECT') destPath = '/src/assets/tactical/marker-anomaly.svg';
      drawAsset(ctx, destPath, destX, destY, destSize);

      ctx.font = `10px ${CANVAS_FONT_MONO}`;
      ctx.fillStyle = CANVAS_COLOR_TEXT;
      ctx.fillText(missionLocation, destX, destY + destSize * 1.1);

      // Route line
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.moveTo(stationX + stationSize * 0.5, stationY);
      ctx.lineTo(destX - destSize * 0.5, destY);
      ctx.strokeStyle = 'rgba(170, 59, 255, 0.35)';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.setLineDash([]);

      // Travel progress indicator on route
      if (state.travelProgress > 0 && state.travelProgress < 1) {
        const progX = stationX + stationSize * 0.5 + (destX - destSize * 0.5 - stationX - stationSize * 0.5) * state.travelProgress;
        const progY = stationY + Math.sin(state.travelProgress * Math.PI * 2) * 0.05 * h;

        ctx.beginPath();
        ctx.arc(progX, progY, 6, 0, Math.PI * 2);
        ctx.fillStyle = state.jumpFlash ? 'rgba(255, 255, 255, 0.9)' : 'rgba(170, 59, 255, 0.8)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(170, 59, 255, 0.6)';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Anomaly markers - SVG artwork
      await Promise.all(state.anomalies.map(async (anomaly, i) => {
        const ax = anomaly.x * w;
        const ay = anomaly.y * h;
        const scanned = state.anomaliesScanned > i || (state.phase === 'anomaly' && i === state.anomaliesScanned - 1);
        // Base marker - SVG artwork
        let markerPath = '/src/assets/tactical/marker-anomaly.svg';
        const baseSize = scanned ? 24 : 16;

        drawAsset(ctx, markerPath, ax, ay, baseSize);

        // 11C.2: Scan beam from ship to anomaly (when scanning this anomaly)
        if (state.scanBeamProgress > 0 && !scanned && i === state.anomaliesScanned && !state.reducedMotion) {
          const shipX = state.shipPosition.x * w;
          const shipY = state.shipPosition.y * h;
          const beamProgress = easeOutCubic(state.scanBeamProgress);
          
          // Draw beam line from ship to anomaly
          ctx.beginPath();
          ctx.moveTo(shipX, shipY);
          const beamEndX = shipX + (ax - shipX) * beamProgress;
          const beamEndY = shipY + (ay - shipY) * beamProgress;
          ctx.lineTo(beamEndX, beamEndY);
          ctx.strokeStyle = `rgba(170, 59, 255, ${0.4 * (1 - state.scanBeamProgress * 0.5)})`;
          ctx.lineWidth = 2;
          ctx.setLineDash([8, 4]);
          ctx.stroke();
          ctx.setLineDash([]);
          
          // Beam head at current position
          if (beamProgress > 0.1) {
            ctx.beginPath();
            ctx.arc(beamEndX, beamEndY, 6 * beamProgress, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(170, 59, 255, ${0.6 * (1 - state.scanBeamProgress)})`;
            ctx.fill();
          }
        }

        // Scan pulse ring - animated based on scanPulseProgress
        if (state.scanPulseProgress > 0 && !scanned && i === state.anomaliesScanned) {
          const pulseAlpha = 0.4 * state.scanPulseProgress * (1 - state.scanPulseProgress);
          const pulseRadius = 30 + 30 * state.scanPulseProgress;
          ctx.beginPath();
          ctx.arc(ax, ay, pulseRadius, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(170, 59, 255, ${pulseAlpha})`;
          ctx.lineWidth = 2 * (1 - state.scanPulseProgress * 0.5);
          ctx.stroke();
          
          // Secondary inner ring
          ctx.beginPath();
          ctx.arc(ax, ay, 20 + 20 * state.scanPulseProgress, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(170, 59, 255, ${pulseAlpha * 0.6})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }

        // Risk label
        ctx.font = `9px ${CANVAS_FONT_MONO}`;
        ctx.fillStyle = anomaly.risk === 'high' ? 'rgba(255, 100, 50, 0.8)' : 'rgba(74, 222, 128, 0.8)';
        ctx.textAlign = 'center';
        ctx.fillText(anomaly.risk === 'high' ? 'HIGH' : 'LOW', ax, ay - 20);
      }));

      // Hostile markers - SVG artwork
      state.hostiles.forEach((hostile, i) => {
        const hx = hostile.x * w;
        const hy = hostile.y * h;
        const encountered = hostile.encountered || (state.phase === 'hostile' && i === 0);
        const warningPulse = hostile.warningPulse ?? 0;

        // Hostile SVG artwork
        const baseSize = 24;
        if (!state.reducedMotion) {
          ctx.shadowColor = 'rgba(255, 60, 60, 0.8)';
          ctx.shadowBlur = 20 * (encountered ? warningPulse : 0.5);
        }
        
        drawAsset(ctx, '/src/assets/tactical/marker-hostile.svg', hx, hy, baseSize);
        
        // 11C.2: Hostile lock-on treatment (restrained threat pulse + targeting indicator)
        if (encountered && state.hostileLockOn > 0 && !state.reducedMotion) {
          const lockProgress = easeInOutCubic(state.hostileLockOn);
          
          // Lock-on brackets (tactical targeting)
          const bracketSize = 18 + 6 * lockProgress;
          const bracketAlpha = 0.6 * lockProgress;
          ctx.strokeStyle = `rgba(255, 60, 60, ${bracketAlpha})`;
          ctx.lineWidth = 1.5;
          // Top-left bracket
          ctx.beginPath();
          ctx.moveTo(hx - bracketSize, hy - bracketSize);
          ctx.lineTo(hx - bracketSize, hy - bracketSize + 8);
          ctx.moveTo(hx - bracketSize, hy - bracketSize);
          ctx.lineTo(hx - bracketSize + 8, hy - bracketSize);
          ctx.stroke();
          // Top-right bracket
          ctx.beginPath();
          ctx.moveTo(hx + bracketSize, hy - bracketSize);
          ctx.lineTo(hx + bracketSize, hy - bracketSize + 8);
          ctx.moveTo(hx + bracketSize, hy - bracketSize);
          ctx.lineTo(hx + bracketSize - 8, hy - bracketSize);
          ctx.stroke();
          // Bottom-left bracket
          ctx.beginPath();
          ctx.moveTo(hx - bracketSize, hy + bracketSize);
          ctx.lineTo(hx - bracketSize, hy + bracketSize - 8);
          ctx.moveTo(hx - bracketSize, hy + bracketSize);
          ctx.lineTo(hx - bracketSize + 8, hy + bracketSize);
          ctx.stroke();
          // Bottom-right bracket
          ctx.beginPath();
          ctx.moveTo(hx + bracketSize, hy + bracketSize);
          ctx.lineTo(hx + bracketSize, hy + bracketSize - 8);
          ctx.moveTo(hx + bracketSize, hy + bracketSize);
          ctx.lineTo(hx + bracketSize - 8, hy + bracketSize);
          ctx.stroke();
          
          // Restrained threat pulse ring
          const pulseRadius = 28 + 10 * Math.sin(performance.now() * 0.006);
          ctx.beginPath();
          ctx.arc(hx, hy, pulseRadius, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(255, 60, 60, ${0.15 * lockProgress})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
        
        // Warning pulse rings (only when involved)
        if (encountered && warningPulse > 0.3 && !state.reducedMotion) {
          ctx.shadowBlur = 0;
          const pulseRadius = 30 + 20 * warningPulse;
          ctx.beginPath();
          ctx.arc(hx, hy, pulseRadius, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(255, 60, 60, ${0.2 * warningPulse * (1 - warningPulse)})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }

        ctx.font = `9px ${CANVAS_FONT_MONO}`;
        ctx.fillStyle = 'rgba(255, 80, 80, 0.8)';
        ctx.textAlign = 'center';
        ctx.fillText('HOSTILE', hx, hy + 30);
      });

      // Ship - SVG artwork
      const shipX = state.shipPosition.x * w;
      const shipY = state.shipPosition.y * h;
      const shipSize = Math.min(w, h) * 0.08;

      // Ship trail during travel - enhanced with engine glow
      if (state.phase === 'travel' || state.phase === 'cruise') {
        const trailLength = state.reducedMotion ? 3 : 8;
        for (let i = 1; i <= trailLength; i++) {
          const trailProgress = state.travelProgress - i * 0.03;
          if (trailProgress <= 0) continue;
          const tx = 0.1 + (0.75 * trailProgress);
          const ty = 0.5 + Math.sin(trailProgress * Math.PI * 2) * 0.05;
          ctx.beginPath();
          const trailSize = shipSize * 0.3 * (1 - i / trailLength);
          ctx.arc(tx * w, ty * h, trailSize, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(170, 59, 255, ${0.15 * (1 - i / trailLength)})`;
          ctx.fill();
          
          // Engine glow particles (only when not reduced motion)
          if (!state.reducedMotion && i <= 3) {
            const flicker = 0.8 + 0.2 * Math.sin(performance.now() * 0.01 + i * 2);
            ctx.beginPath();
            ctx.arc(tx * w, ty * h, trailSize * 0.6, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(170, 59, 255, ${0.3 * (1 - i / trailLength) * flicker})`;
            ctx.fill();
          }
        }
      }

      ctx.save();
      ctx.translate(shipX, shipY);

      // Rotation based on phase
      if (state.phase === 'travel') ctx.rotate(-0.05);
      else if (state.phase === 'cruise') ctx.rotate(0.03);

      // 11C.2: Damage overlay - restrained hull emphasis
      if (state.damageOverlay > 0 && !state.reducedMotion) {
        const overlayAlpha = easeOutCubic(state.damageOverlay) * 0.6;
        ctx.shadowColor = `rgba(255, 60, 60, ${0.9 * overlayAlpha})`;
        ctx.shadowBlur = 25 * overlayAlpha;
        // Subtle red tint to ship area
        ctx.fillStyle = `rgba(255, 60, 60, ${0.1 * overlayAlpha})`;
        ctx.fillRect(-shipSize, -shipSize, shipSize * 2, shipSize * 2);
      }

      // 11C.2: Jump phase visual sequence
      if (state.jumpPhase !== 'idle' && !state.reducedMotion) {
        const phaseProgress = easeInOutCubic(state.jumpPhaseProgress);
        
        switch (state.jumpPhase) {
          case 'charge': {
            // CHARGE: violet energy building at ship
            const chargeRadius = 15 + 25 * phaseProgress;
            const chargeAlpha = 0.5 * phaseProgress;
            ctx.shadowColor = `rgba(170, 59, 255, ${0.8 * chargeAlpha})`;
            ctx.shadowBlur = 30 * chargeAlpha;
            ctx.beginPath();
            ctx.arc(0, 0, chargeRadius, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(170, 59, 255, ${chargeAlpha})`;
            ctx.lineWidth = 2;
            ctx.setLineDash([5 * (1 - phaseProgress), 3]);
            ctx.stroke();
            ctx.setLineDash([]);
            break;
          }
          case 'gate': {
            // JUMP GATE ACTIVE: jump gate marker appears at ship position
            const gateScale = 0.5 + phaseProgress;
            ctx.shadowColor = `rgba(0, 212, 255, ${0.7 * phaseProgress})`;
            ctx.shadowBlur = 20 * phaseProgress;
            // Draw jump gate effect
            ctx.beginPath();
            ctx.arc(0, 0, 20 * gateScale, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(0, 212, 255, ${0.6 * phaseProgress})`;
            ctx.lineWidth = 3;
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(0, 0, 12 * gateScale, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(0, 212, 255, ${0.4 * phaseProgress})`;
            ctx.lineWidth = 1;
            ctx.stroke();
            break;
          }
          case 'burst': {
            // BURST: jump-burst effect
            const burstRadius = 30 + 60 * phaseProgress;
            const burstAlpha = 1 - phaseProgress;
            ctx.shadowColor = `rgba(170, 59, 255, ${burstAlpha})`;
            ctx.shadowBlur = 40 * burstAlpha;
            ctx.beginPath();
            ctx.arc(0, 0, burstRadius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(170, 59, 255, ${0.15 * burstAlpha})`;
            ctx.fill();
            ctx.strokeStyle = `rgba(170, 59, 255, ${0.5 * burstAlpha})`;
            ctx.lineWidth = 2;
            ctx.stroke();
            // Radial lines
            for (let i = 0; i < 8; i++) {
              const angle = (i / 8) * Math.PI * 2;
              ctx.beginPath();
              ctx.moveTo(Math.cos(angle) * 15, Math.sin(angle) * 15);
              ctx.lineTo(Math.cos(angle) * burstRadius, Math.sin(angle) * burstRadius);
              ctx.strokeStyle = `rgba(255, 255, 255, ${0.6 * burstAlpha})`;
              ctx.lineWidth = 1;
              ctx.stroke();
            }
            break;
          }
          case 'transition': {
            // SHIP TRANSITION: ship scaling/fading
            const transScale = 1 - 0.3 * phaseProgress;
            const transAlpha = 1 - phaseProgress;
            ctx.globalAlpha = transAlpha;
            ctx.scale(transScale, transScale);
            break;
          }
          case 'complete': {
            // NORMAL TRAVEL: subtle afterglow
            const afterglow = 1 - phaseProgress;
            ctx.shadowColor = `rgba(170, 59, 255, ${0.3 * afterglow})`;
            ctx.shadowBlur = 15 * afterglow;
            break;
          }
        }
      }

      // Success flash - animated progress
      if (state.successFlashProgress > 0 && !state.reducedMotion) {
        const intensity = state.successFlashProgress * (1 - state.successFlashProgress) * 2;
        ctx.shadowColor = `rgba(74, 222, 128, ${0.8 * intensity})`;
        ctx.shadowBlur = 25 * intensity;
      }

      // 11C.2: Docking approach visual with alignment
      if (state.dockingProgress > 0 && (state.phase === 'complete' || state.phase === 'return')) {
        const destX = 0.88 * w;
        const destY = 0.5 * h;
        const destSize = Math.min(w, h) * 0.12;
        const dockX = shipX / w;
        const dockY = shipY / h;
        const distanceToDest = Math.sqrt(Math.pow(destX / w - dockX, 2) + Math.pow(destY / h - dockY, 2));
        
        if (distanceToDest < 0.2 || state.dockingProgress > 0.5) {
          const alignProgress = easeOutCubic(state.dockingAlignProgress);
          
          // Docking alignment rings
          ctx.beginPath();
          ctx.arc(destX, destY, destSize * (1 + 0.5 * state.dockingProgress), 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(74, 222, 128, ${0.4 * state.dockingProgress * alignProgress})`;
          ctx.lineWidth = 2;
          ctx.setLineDash([10 * (1 - state.dockingProgress), 5]);
          ctx.stroke();
          ctx.setLineDash([]);
          
          // Approach vector indicator
          if (alignProgress > 0.3) {
            const vecX = (destX - shipX) * 0.5;
            const vecY = (destY - shipY) * 0.5;
            ctx.beginPath();
            ctx.moveTo(shipX, shipY);
            ctx.lineTo(shipX + vecX * alignProgress, shipY + vecY * alignProgress);
            ctx.strokeStyle = `rgba(74, 222, 128, ${0.5 * alignProgress})`;
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 4]);
            ctx.stroke();
            ctx.setLineDash([]);
          }
        }
      }

      // Ship SVG artwork (procedural, agent-type-specific)
      if (agentType === 'SCOUT') {
        drawAsset(ctx, '/src/assets/tactical/scout-ship.svg', 0, 0, shipSize * 1.2);
      } else if (agentType === 'HAULER') {
        drawAsset(ctx, '/src/assets/tactical/hauler-ship.svg', 0, 0, shipSize * 1.3);
      }

      ctx.restore();

      // Phase label
      ctx.font = `11px ${CANVAS_FONT_MONO}`;
      ctx.fillStyle = CANVAS_COLOR_TEXT_H;
      ctx.textAlign = 'center';
      ctx.fillText(state.phase.toUpperCase(), w / 2, 18);

      // Progress bar at bottom
      const barY = h - 30;
      const barW = w * 0.8;
      const barX = (w - barW) / 2;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.fillRect(barX, barY, barW, 8);
      ctx.fillStyle = state.phase === 'return' ? 'rgba(255, 150, 50, 0.9)' :
                      state.phase === 'complete' ? 'rgba(74, 222, 128, 0.9)' :
                      state.phase === 'abort' ? 'rgba(255, 80, 80, 0.9)' :
                      'rgba(170, 59, 255, 0.9)';
      ctx.fillRect(barX, barY, barW * state.progress, 8);

      // Current event text
      ctx.font = `11px ${CANVAS_FONT_MONO}`;
      ctx.fillStyle = CANVAS_COLOR_TEXT;
      ctx.textAlign = 'center';
      const rawEventText = `${state.currentEvent}${state.eventDetail ? ': ' + state.eventDetail : ''}`;
      const maxEventWidth = barW - 16;
      let eventText = rawEventText;
      if (ctx.measureText(eventText).width > maxEventWidth) {
        while (eventText.length > 12 && ctx.measureText(eventText + '…').width > maxEventWidth) {
          eventText = eventText.slice(0, -1);
        }
        eventText += '…';
      }
      ctx.fillText(eventText, w / 2, barY - 8);
    };

    draw();
  }, [containerSize, state, agentType, missionLocation, missionType]);

  return (
    <div ref={containerRef} className="tactical-vis-container" style={{ width: '100%', aspectRatio: '16/9', background: 'var(--code-bg)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', position: 'relative', minWidth: 0, minHeight: 0 }}>
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
    </div>
  );
}