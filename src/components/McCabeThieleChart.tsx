import React, { useMemo } from 'react';
import { solveBubblePoint } from '../simulation/simulationEngine';
import type { SimulationResult, ChemicalSystem } from '../simulation/simulationEngine';

interface McCabeThieleChartProps {
  result: SimulationResult | null;
  system: ChemicalSystem;
  inputs: {
    zF: number;
    q: number;
    R: number;
    D: number;
    F: number;
    P: number;
    thermoModel: 'ideal' | 'nrtl';
  };
}

export const McCabeThieleChart: React.FC<McCabeThieleChartProps> = ({
  result,
  system,
  inputs,
}) => {
  const { zF, q, R, P, thermoModel } = inputs;
  const xD = result?.xD ?? 0.95;
  const xB = result?.xB ?? 0.05;

  // Viewport sizes
  const width = 400;
  const height = 400;
  const margin = 40;
  const plotWidth = width - 2 * margin;
  const plotHeight = height - 2 * margin;

  // Map composition (0..1) to SVG coordinates
  const mapX = (x: number) => margin + x * plotWidth;
  const mapY = (y: number) => margin + (1 - y) * plotHeight;

  // 1. Generate Equilibrium Curve data points (100 points from x = 0 to 1)
  const eqPoints = useMemo(() => {
    const points: { x: number; y: number }[] = [];
    const steps = 60;
    for (let i = 0; i <= steps; i++) {
      const x = i / steps;
      // Solve for bubble point at this x to get equilibrium vapor fraction y
      const bubble = solveBubblePoint(x, P, system, thermoModel);
      points.push({ x, y: bubble.y });
    }
    return points;
  }, [system, P, thermoModel]);

  // Create SVG path string for the equilibrium curve
  const eqPathD = useMemo(() => {
    return eqPoints
      .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${mapX(p.x)} ${mapY(p.y)}`)
      .join(' ');
  }, [eqPoints]);

  // 2. Compute lines intersection (ROL and q-line)
  // ROL: y = (R/(R+1))*x + xD/(R+1)
  // q-line: y = (q/(q-1))*x - zF/(q-1)  (for q != 1)
  // Intersection point xI:
  const { xI, yI } = useMemo(() => {
    let xInt = zF;
    let yInt = (R / (R + 1)) * zF + xD / (R + 1);

    if (Math.abs(q - 1.0) > 1e-4) {
      // For q != 1
      xInt = (xD * (q - 1) + zF * (R + 1)) / (q + R);
      yInt = (R / (R + 1)) * xInt + xD / (R + 1);
    } else {
      // For q == 1 (Saturated liquid, vertical line)
      xInt = zF;
      yInt = (R / (R + 1)) * zF + xD / (R + 1);
    }
    
    // Clamp to logical limits
    xInt = Math.max(0, Math.min(1, xInt));
    yInt = Math.max(0, Math.min(1, yInt));

    return { xI: xInt, yI: yInt };
  }, [zF, q, R, xD]);

  // 3. Generate Staircase Step Coordinates
  const stepPathD = useMemo(() => {
    if (!result || !result.success || result.stages.length === 0) return '';
    const stages = result.stages;
    
    let path = `M ${mapX(xD)} ${mapY(xD)}`; // Start at top condenser on diagonal
    
    for (let i = 1; i < stages.length; i++) {
      const curr = stages[i];
      // Horizontal segment to equilibrium curve
      path += ` L ${mapX(curr.x)} ${mapY(curr.y)}`;
      
      // Vertical segment to operating line
      if (i === stages.length - 1) {
        // Last stage (reboiler), connect to diagonal/bottoms draw point
        path += ` L ${mapX(xB)} ${mapY(xB)}`;
      } else {
        const next = stages[i + 1];
        path += ` L ${mapX(curr.x)} ${mapY(next.y)}`;
      }
    }
    return path;
  }, [result, xD, xB]);

  // Grid lines (every 0.1)
  const gridTicks = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9];

  return (
    <div className="flex flex-col h-full p-5 glass rounded-2xl text-slate-100 min-h-[500px]">
      <div>
        <h3 className="text-lg font-semibold tracking-wide text-white">McCabe-Thiele Diagram</h3>
        <p className="text-xs text-slate-400">Vapor (y) vs. Liquid (x) operating window</p>
      </div>

      <div className="relative flex-grow flex items-center justify-center mt-4">
        {/* SVG Plot */}
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full max-w-[360px] h-auto aspect-square">
          {/* Grid lines */}
          {gridTicks.map(val => (
            <React.Fragment key={val}>
              {/* Vertical grids */}
              <line
                x1={mapX(val)}
                y1={margin}
                x2={mapX(val)}
                y2={height - margin}
                stroke="#334155"
                strokeWidth="0.5"
                strokeDasharray="2 2"
              />
              {/* Horizontal grids */}
              <line
                x1={margin}
                y1={mapY(val)}
                x2={width - margin}
                y2={mapY(val)}
                stroke="#334155"
                strokeWidth="0.5"
                strokeDasharray="2 2"
              />
              {/* X-axis tick labels */}
              <text x={mapX(val)} y={height - margin + 14} fill="#64748b" className="text-[9px]" textAnchor="middle">
                {val.toFixed(1)}
              </text>
              {/* Y-axis tick labels */}
              <text x={margin - 8} y={mapY(val) + 3} fill="#64748b" className="text-[9px]" textAnchor="end">
                {val.toFixed(1)}
              </text>
            </React.Fragment>
          ))}

          {/* Border Axes */}
          <rect
            x={margin}
            y={margin}
            width={plotWidth}
            height={plotHeight}
            fill="none"
            stroke="#475569"
            strokeWidth="1.5"
          />

          {/* Diagonal Line (y = x) */}
          <line
            x1={mapX(0)}
            y1={mapY(0)}
            x2={mapX(1)}
            y2={mapY(1)}
            stroke="#475569"
            strokeWidth="1.5"
            strokeDasharray="4 4"
          />

          {/* VLE Equilibrium Curve */}
          <path
            d={eqPathD}
            fill="none"
            stroke="#22d3ee"
            strokeWidth="2.5"
            className="drop-shadow-[0_0_4px_rgba(34,211,238,0.4)]"
          />

          {/* 4. Operating Lines & Feed q-line */}
          {result?.success && (
            <>
              {/* Rectifying Operating Line (ROL) */}
              {/* From (xD, xD) to (xI, yI) */}
              <line
                x1={mapX(xD)}
                y1={mapY(xD)}
                x2={mapX(xI)}
                y2={mapY(yI)}
                stroke="#a855f7"
                strokeWidth="2"
                className="drop-shadow-[0_0_3px_rgba(168,85,247,0.4)]"
              />

              {/* Stripping Operating Line (SOL) */}
              {/* From (xB, xB) to (xI, yI) */}
              <line
                x1={mapX(xB)}
                y1={mapY(xB)}
                x2={mapX(xI)}
                y2={mapY(yI)}
                stroke="#6366f1"
                strokeWidth="2"
              />

              {/* Feed q-line */}
              {/* From (zF, zF) to (xI, yI) */}
              <line
                x1={mapX(zF)}
                y1={mapY(zF)}
                x2={mapX(xI)}
                y2={mapY(yI)}
                stroke="#10b981"
                strokeWidth="2"
                strokeDasharray="3 2"
              />

              {/* Staircase Steps */}
              <path
                d={stepPathD}
                fill="none"
                stroke="#fbbf24"
                strokeWidth="2.5"
                className="drop-shadow-[0_0_5px_rgba(251,191,36,0.5)]"
              />

              {/* Key compositions markers on Diagonal */}
              {/* xD (Distillate) */}
              <circle cx={mapX(xD)} cy={mapY(xD)} r="4" fill="#a855f7" />
              <text x={mapX(xD)} y={mapY(xD) - 8} fill="#c084fc" className="text-[9px] font-bold" textAnchor="middle">
                xD
              </text>

              {/* xB (Bottoms) */}
              <circle cx={mapX(xB)} cy={mapY(xB)} r="4" fill="#6366f1" />
              <text x={mapX(xB)} y={mapY(xB) + 14} fill="#818cf8" className="text-[9px] font-bold" textAnchor="middle">
                xB
              </text>

              {/* zF (Feed) */}
              <circle cx={mapX(zF)} cy={mapY(zF)} r="4" fill="#10b981" />
              <text x={mapX(zF)} y={mapY(zF) + 14} fill="#34d399" className="text-[9px] font-bold" textAnchor="middle">
                zF
              </text>
            </>
          )}

          {/* End/Start Ticks */}
          <text x={margin} y={height - margin + 14} fill="#64748b" className="text-[9px]" textAnchor="middle">0</text>
          <text x={width - margin} y={height - margin + 14} fill="#64748b" className="text-[9px]" textAnchor="middle">1.0</text>
          <text x={margin - 8} y={margin + 3} fill="#64748b" className="text-[9px]" textAnchor="end">1.0</text>
          <text x={margin - 8} y={height - margin + 3} fill="#64748b" className="text-[9px]" textAnchor="end">0</text>

          {/* Axis Labels */}
          <text x={width / 2} y={height - 8} fill="#94a3b8" className="text-[10px] font-semibold" textAnchor="middle">
            Liquid Mole Fraction, x
          </text>
          <text
            x="12"
            y={height / 2}
            fill="#94a3b8"
            className="text-[10px] font-semibold"
            textAnchor="middle"
            transform={`rotate(-90, 12, ${height / 2})`}
          >
            Vapor Mole Fraction, y
          </text>
        </svg>
      </div>

      {/* Legend */}
      <div className="mt-4 pt-3 border-t border-slate-700/50 flex flex-wrap justify-center gap-x-4 gap-y-1 text-[10px]">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 bg-cyan-400"></div>
          <span className="text-slate-300">VLE Curve</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 bg-purple-500"></div>
          <span className="text-slate-300">Rectifying (ROL)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 bg-indigo-500"></div>
          <span className="text-slate-300">Stripping (SOL)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 border-t border-dashed border-emerald-500"></div>
          <span className="text-slate-300">q-Line</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 bg-amber-400"></div>
          <span className="text-slate-300">Column Stages ({result?.stages?.length ? result.stages.length - 1 : 0})</span>
        </div>
      </div>
    </div>
  );
};
