import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import type { SimulationResult, ChemicalSystem } from '../simulation/simulationEngine';

interface ProfileChartsProps {
  result: SimulationResult | null;
  system: ChemicalSystem;
}

export const ProfileCharts: React.FC<ProfileChartsProps> = ({ result, system }) => {
  if (!result || !result.success || result.stages.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 glass rounded-2xl text-slate-400 text-sm font-medium">
        No active profile data. Check column inputs.
      </div>
    );
  }

  // Prepare chart data. Stage 1 is condenser, Stage N is reboiler.
  const data = result.stages.map(s => ({
    stage: s.stageIndex,
    stageLabel: s.stageIndex === 1 ? '1 (Condenser)' : s.stageIndex === result.stages.length ? `${s.stageIndex} (Reboiler)` : `${s.stageIndex}`,
    temperature: parseFloat(s.T.toFixed(2)),
    x_LK: parseFloat(s.x.toFixed(4)),
    y_LK: parseFloat(s.y.toFixed(4)),
  }));

  const comp1Name = system.comp1.name;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
      {/* 1. Temperature Profile Chart */}
      <div className="p-5 glass rounded-2xl flex flex-col min-h-[300px]">
        <div className="mb-3">
          <h3 className="text-base font-semibold text-white">Temperature Profile</h3>
          <p className="text-[11px] text-slate-400">Boiling point temperature vs. Column stage</p>
        </div>
        <div className="flex-grow w-full h-60">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
              <XAxis 
                dataKey="stage" 
                stroke="#64748b" 
                fontSize={10} 
                tickLine={false} 
              />
              <YAxis 
                stroke="#64748b" 
                fontSize={10} 
                tickLine={false} 
                domain={['auto', 'auto']}
                unit="°C"
              />
              <Tooltip
                contentStyle={{
                  background: 'rgba(15, 23, 42, 0.9)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '12px',
                  color: '#e2e8f0',
                  fontSize: '11px',
                }}
                labelFormatter={(label) => `Stage ${label}`}
              />
              <Line
                type="monotone"
                dataKey="temperature"
                name="Temperature"
                stroke="#ef4444"
                strokeWidth={2}
                dot={{ r: 3, strokeWidth: 1 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 2. Composition Profile Chart */}
      <div className="p-5 glass rounded-2xl flex flex-col min-h-[300px]">
        <div className="mb-3">
          <h3 className="text-base font-semibold text-white">Composition Profile</h3>
          <p className="text-[11px] text-slate-400">Mole fraction of {comp1Name} (Light Key) vs. Stage</p>
        </div>
        <div className="flex-grow w-full h-60">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
              <XAxis 
                dataKey="stage" 
                stroke="#64748b" 
                fontSize={10} 
                tickLine={false} 
              />
              <YAxis 
                stroke="#64748b" 
                fontSize={10} 
                tickLine={false} 
                domain={[0, 1.0]}
                tickFormatter={(val) => val.toFixed(1)}
              />
              <Tooltip
                contentStyle={{
                  background: 'rgba(15, 23, 42, 0.9)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '12px',
                  color: '#e2e8f0',
                  fontSize: '11px',
                }}
                labelFormatter={(label) => `Stage ${label}`}
              />
              <Legend 
                wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} 
              />
              <Line
                type="monotone"
                dataKey="x_LK"
                name={`Liquid (x) - ${comp1Name}`}
                stroke="#6366f1"
                strokeWidth={2}
                dot={{ r: 3, strokeWidth: 1 }}
                activeDot={{ r: 5 }}
              />
              <Line
                type="monotone"
                dataKey="y_LK"
                name={`Vapor (y) - ${comp1Name}`}
                stroke="#06b6d4"
                strokeWidth={1.5}
                strokeDasharray="4 2"
                dot={{ r: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
