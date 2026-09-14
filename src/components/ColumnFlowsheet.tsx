import React from 'react';
import { AlertTriangle, Flame, Wind } from 'lucide-react';
import type { SimulationResult, ChemicalSystem } from '../simulation/simulationEngine';

interface ColumnFlowsheetProps {
  result: SimulationResult | null;
  system: ChemicalSystem;
  N: number;
  Nfeed: number;
  R: number;
  D: number;
  F: number;
  q: number;
  zF: number;
}

export const ColumnFlowsheet: React.FC<ColumnFlowsheetProps> = ({
  result,
  system,
  N,
  Nfeed,
  R,
  D,
  F,
  q,
  zF,
}) => {
  if (!result || !result.success) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-slate-400 glass rounded-2xl min-h-[500px]">
        <AlertTriangle className="w-12 h-12 mb-4 text-amber-500 animate-pulse" />
        <p className="text-center font-medium">Column is currently inoperative.</p>
        <p className="text-sm text-center text-slate-500 mt-1 max-w-xs">
          {result?.errorMsg || "Configure operating parameters inside the stable operating envelope to start simulation."}
        </p>
      </div>
    );
  }

  const { stages, xD, xB, Qc, Qr } = result;

  // Let's map our mathematical trays to a fixed set of visual trays for drawing (e.g., 8 visual trays)
  // to keep the SVG layout stable and clean, regardless of N (which can be 5 to 30)
  const visualTraysCount = 8;
  const trays = Array.from({ length: visualTraysCount }, (_, i) => {
    // Map visual tray index (0 is top tray, visualTraysCount-1 is bottom tray)
    // to actual stages in the simulation (excluding stage 1: condenser and stage N: reboiler)
    const stageIdx = Math.round(1 + ((i + 1) * (N - 2)) / (visualTraysCount + 1));
    const stageData = stages.find(s => s.stageIndex === stageIdx) || stages[Math.min(stages.length - 1, stageIdx)];
    
    // Check if this visual tray represents the feed entry zone
    // The feed zone is where the actual feed stage (Nfeed) maps
    const nextStageIdx = Math.round(1 + ((i + 2) * (N - 2)) / (visualTraysCount + 1));
    const isFeedZone = Nfeed >= stageIdx && Nfeed < nextStageIdx;

    return {
      visualIndex: i,
      stageIndex: stageIdx,
      data: stageData,
      isFeedZone,
    };
  });

  // Check if flooding or weeping occurs on the displayed trays
  const { weepingStages, floodingStages } = result.hydraulicStatus;

  // Helper to interpolate composition color:
  // Component 1 (light key, e.g. Ethanol/Benzene) -> Cyan-ish (#06b6d4)
  // Component 2 (heavy key, e.g. Water/Toluene) -> Purple/Indigo (#6366f1)
  const getCompositionColor = (x: number) => {
    // R: (1-x)*99 + x*6
    // G: (1-x)*102 + x*182
    // B: (1-x)*241 + x*212
    const r = Math.round((1 - x) * 99 + x * 6);
    const g = Math.round((1 - x) * 102 + x * 182);
    const b = Math.round((1 - x) * 241 + x * 212);
    return `rgb(${r}, ${g}, ${b})`;
  };

  return (
    <div className="relative flex flex-col h-full p-5 glass rounded-2xl text-slate-100 min-h-[580px] overflow-hidden select-none">
      {/* Title Header */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-lg font-semibold tracking-wide text-white">Flowsheet Digital Twin</h3>
          <p className="text-xs text-slate-400">Dynamic hydraulics & thermodynamic visualization</p>
        </div>
        <div className="flex gap-2">
          {result.hydraulicStatus.floodingWarning && (
            <span className="flex items-center gap-1 text-[10px] px-2 py-1 bg-red-950/80 border border-red-800 text-red-400 rounded-md font-semibold animate-pulse">
              <AlertTriangle className="w-3.5 h-3.5" /> FLOODING
            </span>
          )}
          {result.hydraulicStatus.weepingWarning && (
            <span className="flex items-center gap-1 text-[10px] px-2 py-1 bg-amber-950/80 border border-amber-800 text-amber-400 rounded-md font-semibold animate-pulse">
              <AlertTriangle className="w-3.5 h-3.5" /> WEEPING
            </span>
          )}
        </div>
      </div>

      {/* SVG Container */}
      <div className="relative flex-grow flex items-center justify-center p-2">
        <svg viewBox="0 0 540 460" className="w-full h-full max-h-[440px] drop-shadow-2xl">
          {/* Defs for gradients & markers */}
          <defs>
            <linearGradient id="feedGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#e2e8f0" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#06b6d4" />
            </linearGradient>
            <linearGradient id="condGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#06b6d4" />
            </linearGradient>
            <linearGradient id="reboGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#f59e0b" />
            </linearGradient>
          </defs>

          {/* BACKGROUND STEAM / VAPOR PULSE (Dynamic Animation) */}
          <rect
            x="220"
            y="65"
            width="60"
            height="325"
            rx="30"
            fill="#38bdf8"
            className="animate-vapor-pulse pointer-events-none"
          />

          {/* COLUMN BODY */}
          {/* Main Shell Outline */}
          <rect
            x="220"
            y="60"
            width="60"
            height="330"
            rx="30"
            fill="none"
            stroke="#94a3b8"
            strokeWidth="3.5"
          />

          {/* VISUAL TRAYS */}
          {trays.map((tray, idx) => {
            const yPos = 90 + idx * 36;
            const x = tray.data?.x ?? 0.5;
            const T = tray.data?.T ?? 80;
            const trayColor = getCompositionColor(x);
            
            // Check if this tray is flooding or weeping
            const isFlooding = floodingStages.includes(tray.stageIndex);
            const isWeeping = weepingStages.includes(tray.stageIndex);

            return (
              <g key={tray.stageIndex} className="group">
                {/* Tray metal line */}
                {/* Rectifying downcomers alternate sides */}
                <line
                  x1={idx % 2 === 0 ? "220" : "230"}
                  y1={yPos}
                  x2={idx % 2 === 0 ? "270" : "280"}
                  y2={yPos}
                  stroke="#64748b"
                  strokeWidth="2"
                />

                {/* Liquid holdup on the tray */}
                <rect
                  x={idx % 2 === 0 ? "222" : "230"}
                  y={yPos - 6}
                  width="48"
                  height="6"
                  fill={trayColor}
                  opacity={isFlooding ? 0.95 : 0.75}
                  className={isFlooding ? "animate-pulse" : ""}
                />

                {/* Downcomer liquid drop */}
                <line
                  x1={idx % 2 === 0 ? "272" : "228"}
                  y1={yPos}
                  x2={idx % 2 === 0 ? "272" : "228"}
                  y2={yPos + 30}
                  stroke={trayColor}
                  strokeWidth="2.5"
                  strokeDasharray="4 4"
                  className="animate-liquid-drip"
                  style={{ strokeDashoffset: idx * 5 }}
                />

                {/* Bubbles on Tray (Vapor bubbling through liquid) */}
                <g className="animate-bubble-rise" style={{ animationDelay: `${idx * 0.25}s` }}>
                  <circle cx={idx % 2 === 0 ? "235" : "245"} cy={yPos - 2} r="1.5" fill="#e0f2fe" opacity="0.6" />
                  <circle cx={idx % 2 === 0 ? "250" : "260"} cy={yPos - 4} r="1" fill="#e0f2fe" opacity="0.8" />
                  <circle cx={idx % 2 === 0 ? "260" : "270"} cy={yPos - 1} r="2" fill="#e0f2fe" opacity="0.5" />
                </g>

                {/* Hydraulic Alert Highlights on Flowsheet */}
                {isFlooding && (
                  <rect
                    x="222"
                    y={yPos - 24}
                    width="56"
                    height="24"
                    fill="rgba(239, 68, 68, 0.15)"
                    stroke="#ef4444"
                    strokeWidth="1.5"
                    strokeDasharray="2 2"
                  />
                )}
                {isWeeping && (
                  <rect
                    x="222"
                    y={yPos - 6}
                    width="56"
                    height="8"
                    fill="rgba(245, 158, 11, 0.1)"
                    stroke="#f59e0b"
                    strokeWidth="1"
                  />
                )}

                {/* Hover Tooltip Info on stage */}
                <title>{`Stage ${tray.stageIndex}
Composition: ${(x * 100).toFixed(1)}% Light Component
Temperature: ${T.toFixed(1)}°C
Flows: L=${tray.data?.flowL.toFixed(1)} kmol/h, V=${tray.data?.flowV.toFixed(1)} kmol/h`}</title>
              </g>
            );
          })}

          {/* FEED ENTRY LINE (Left to Center) */}
          {(() => {
            // Find where the feed zone visual tray is located
            const feedVisualTray = trays.find(t => t.isFeedZone) || trays[Math.floor(visualTraysCount / 2)];
            const feedY = 90 + feedVisualTray.visualIndex * 36;
            return (
              <g>
                {/* Horizontal pipe from left to column */}
                <path
                  d={`M 100,${feedY} L 220,${feedY}`}
                  fill="none"
                  stroke="url(#feedGrad)"
                  strokeWidth="3.5"
                  markerEnd="url(#arrow)"
                />
                
                {/* Feed Label */}
                <text x="55" y={feedY + 4} fill="#06b6d4" className="text-[11px] font-bold" textAnchor="middle">
                  FEED
                </text>
                <text x="55" y={feedY + 16} fill="#94a3b8" className="text-[9px]" textAnchor="middle">
                  {F.toFixed(0)} kmol/h ({zF.toFixed(2)})
                </text>
                <text x="55" y={feedY + 26} fill="#64748b" className="text-[8px]" textAnchor="middle">
                  q = {q.toFixed(1)} ({q === 1 ? 'Liq' : q === 0 ? 'Vap' : 'Mix'})
                </text>

                {/* Feed entry flange/dot */}
                <circle cx="220" cy={feedY} r="4" fill="#06b6d4" />
              </g>
            );
          })()}

          {/* OVERHEAD CONDENSER (Top Right) */}
          <g>
            {/* Vapor Line out from top */}
            <path d="M 250,60 L 250,35 L 370,35" fill="none" stroke="#f1f5f9" strokeWidth="2.5" />
            <text x="300" y="28" fill="#94a3b8" className="text-[8px] italic">Vapor Stream</text>

            {/* Condenser Box (Circle or cylinder) */}
            <circle cx="370" cy="35" r="16" fill="url(#condGrad)" stroke="#cbd5e1" strokeWidth="1.5" />
            <Wind className="w-5 h-5 text-white absolute" style={{ transform: 'translate(360px, 25px)' }} />
            
            {/* Cooling Water Indicators */}
            <path d="M 370,10 L 370,20" fill="none" stroke="#60a5fa" strokeWidth="2" markerEnd="url(#arrow)" />
            <path d="M 370,50 L 370,60" fill="none" stroke="#ef4444" strokeWidth="2" />
            <text x="382" y="16" fill="#60a5fa" className="text-[8px]">CW In</text>
            <text x="382" y="58" fill="#ef4444" className="text-[8px]">CW Out</text>

            {/* Condenser Duty Label */}
            <text x="320" y="15" fill="#38bdf8" className="text-[10px] font-semibold">
              Qc: {Qc.toFixed(1)} kW
            </text>

            {/* Reflux Drum (Horizontal vessel below condenser) */}
            <rect x="345" y="80" width="50" height="24" rx="8" fill="#334155" stroke="#cbd5e1" strokeWidth="1.5" />
            
            {/* Pipeline condenser to drum */}
            <path d="M 370,51 L 370,80" fill="none" stroke="#cbd5e1" strokeWidth="2" />

            {/* Reflux liquid line returning to column */}
            <path d="M 345,92 L 275,92 L 275,85" fill="none" stroke="#6366f1" strokeWidth="2" />
            <path d="M 275,85 L 275,88 L 272,88" fill="none" stroke="#6366f1" strokeWidth="2" />
            <text x="310" y="86" fill="#a5b4fc" className="text-[8px]">Reflux (R={R.toFixed(1)})</text>

            {/* Distillate Draw Line (Right side) */}
            <path d="M 395,92 L 470,92" fill="none" stroke="#06b6d4" strokeWidth="2.5" />
            
            {/* Distillate Label */}
            <text x="475" y="90" fill="#06b6d4" className="text-[11px] font-bold" textAnchor="start">
              DISTILLATE
            </text>
            <text x="475" y="102" fill="#e2e8f0" className="text-[10px] font-semibold" textAnchor="start">
              Purity: {(xD * 100).toFixed(1)}% {system.comp1.name}
            </text>
            <text x="475" y="114" fill="#94a3b8" className="text-[9px]" textAnchor="start">
              Flow: {D.toFixed(1)} kmol/h
            </text>
          </g>

          {/* REBOILER (Bottom Right) */}
          <g>
            {/* Liquid out from column bottom to reboiler */}
            <path d="M 250,390 L 250,420 L 350,420" fill="none" stroke="#4f46e5" strokeWidth="2" />
            
            {/* Reboiler Vessel */}
            <circle cx="370" cy="420" r="18" fill="url(#reboGrad)" stroke="#fca5a5" strokeWidth="1.5" />
            <Flame className="w-5 h-5 text-white absolute" style={{ transform: 'translate(360px, 410px)' }} />

            {/* Heating Steam loop */}
            <path d="M 370,442 L 370,452" fill="none" stroke="#f43f5e" strokeWidth="2" />
            <path d="M 370,398 L 370,388" fill="none" stroke="#f97316" strokeWidth="2" />
            <text x="382" y="450" fill="#f43f5e" className="text-[8px]">Condensate</text>
            <text x="382" y="394" fill="#f97316" className="text-[8px]">Steam In</text>

            {/* Reboiler Duty Label */}
            <text x="320" y="445" fill="#f43f5e" className="text-[10px] font-semibold">
              Qr: {Qr.toFixed(1)} kW
            </text>

            {/* Vapor boilup line returning to column */}
            <path d="M 353,415 L 275,415 L 275,378" fill="none" stroke="#f97316" strokeWidth="2" />
            <text x="290" y="410" fill="#fed7aa" className="text-[8px]">Boilup</text>

            {/* Bottoms Draw Line */}
            <path d="M 388,420 L 470,420" fill="none" stroke="#6366f1" strokeWidth="2.5" />

            {/* Bottoms Label */}
            <text x="475" y="418" fill="#6366f1" className="text-[11px] font-bold" textAnchor="start">
              BOTTOMS
            </text>
            <text x="475" y="430" fill="#e2e8f0" className="text-[10px] font-semibold" textAnchor="start">
              Purity: {((1 - xB) * 100).toFixed(1)}% {system.comp2.name}
            </text>
            <text x="475" y="442" fill="#94a3b8" className="text-[9px]" textAnchor="start">
              Flow: {(F - D).toFixed(1)} kmol/h (x_LK: {(xB * 100).toFixed(1)}%)
            </text>
          </g>

          {/* COLUMN SHELL DECORATIVE MARKS */}
          <g opacity="0.3">
            <line x1="220" y1="120" x2="225" y2="120" stroke="#fff" strokeWidth="1" />
            <line x1="280" y1="120" x2="275" y2="120" stroke="#fff" strokeWidth="1" />
            <line x1="220" y1="200" x2="225" y2="200" stroke="#fff" strokeWidth="1" />
            <line x1="280" y1="200" x2="275" y2="200" stroke="#fff" strokeWidth="1" />
            <line x1="220" y1="280" x2="225" y2="280" stroke="#fff" strokeWidth="1" />
            <line x1="280" y1="280" x2="275" y2="280" stroke="#fff" strokeWidth="1" />
          </g>

          {/* SVG Marker definition for arrows */}
          <defs>
            <marker id="arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#06b6d4" />
            </marker>
          </defs>
        </svg>
      </div>

      {/* Hydraulic parameters footer */}
      <div className="mt-4 pt-3 border-t border-slate-700/50 grid grid-cols-3 gap-2 text-center text-xs">
        <div className="bg-slate-800/40 p-2 rounded-lg border border-slate-700/30">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mb-0.5">Molar Flow L/V</div>
          <div className="text-white font-mono font-medium">
            {(result.stages[1]?.flowL || 0).toFixed(0)} / {(result.stages[1]?.flowV || 0).toFixed(0)}
          </div>
        </div>
        <div className="bg-slate-800/40 p-2 rounded-lg border border-slate-700/30">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mb-0.5">Boilup Ratio V_B</div>
          <div className="text-white font-mono font-medium">{result.V_B.toFixed(2)}</div>
        </div>
        <div className="bg-slate-800/40 p-2 rounded-lg border border-slate-700/30">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mb-0.5">Hydraulic Load</div>
          <div className={`font-mono font-bold ${
            result.hydraulicStatus.floodingWarning ? 'text-red-400' :
            result.hydraulicStatus.weepingWarning ? 'text-amber-400' : 'text-emerald-400'
          }`}>
            {(result.hydraulicStatus.averageLoad * 100).toFixed(0)}%
          </div>
        </div>
      </div>
    </div>
  );
};
