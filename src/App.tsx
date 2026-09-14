import { useState, useMemo, useEffect } from 'react';
import { 
  BookOpen, 
  Sliders, 
  Gauge, 
  Activity, 
  Sun, 
  Moon
} from 'lucide-react';
import { 
  runColumnSimulation, 
  CHEMICAL_SYSTEMS
} from './simulation/simulationEngine';
import type { SimulationInputs } from './simulation/simulationEngine';
import { ColumnFlowsheet } from './components/ColumnFlowsheet';
import { McCabeThieleChart } from './components/McCabeThieleChart';
import { ProfileCharts } from './components/ProfileCharts';
import { OperatorQuizzes } from './components/OperatorQuizzes';
import type { QuizChallenge } from './components/OperatorQuizzes';
import { TheoryDrawer } from './components/TheoryDrawer';

export default function App() {
  // 1. Theme Configuration
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('color-scheme');
    if (saved) return saved as 'light' | 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }
    localStorage.setItem('color-scheme', theme);
  }, [theme]);

  // 2. Simulation State Inputs
  const [inputs, setInputs] = useState<SimulationInputs>({
    systemId: 'benzene-toluene',
    thermoModel: 'ideal',
    N: 18,
    Nfeed: 9,
    F: 100,
    zF: 0.50,
    q: 1.0, // Saturated liquid
    P: 101.3, // 1 atm
    R: 2.0, // Reflux ratio
    D: 50, // Distillate flow rate
  });

  // 3. Educational theory drawer state
  const [isTheoryOpen, setIsTheoryOpen] = useState(false);

  // 4. Run simulation in real-time
  const simulationResult = useMemo(() => {
    return runColumnSimulation(inputs);
  }, [inputs]);

  // 5. Preset Scenarios Handler
  const applyPreset = (type: 'steady' | 'upset' | 'cooling' | 'flooding' | 'azeotrope') => {
    switch (type) {
      case 'steady':
        setInputs({
          systemId: 'benzene-toluene',
          thermoModel: 'ideal',
          N: 18,
          Nfeed: 9,
          F: 100,
          zF: 0.50,
          q: 1.0,
          P: 101.3,
          R: 2.0,
          D: 50,
        });
        break;
      case 'upset':
        setInputs({
          systemId: 'benzene-toluene',
          thermoModel: 'ideal',
          N: 18,
          Nfeed: 9,
          F: 100,
          zF: 0.25, // sudden drop in feed quality
          q: 1.0,
          P: 101.3,
          R: 2.5,
          D: 28, // adjust D to match lower feed inventory
        });
        break;
      case 'cooling':
        setInputs({
          systemId: 'benzene-toluene',
          thermoModel: 'ideal',
          N: 18,
          Nfeed: 9,
          F: 100,
          zF: 0.50,
          q: 1.0,
          P: 220.0, // Cooling water failure -> massive pressure spike
          R: 0.2,   // Condenser cannot condense -> reflux drops to near zero
          D: 70,    // Distillate draw continues, pulling impurities
        });
        break;
      case 'flooding':
        setInputs({
          systemId: 'methanol-water',
          thermoModel: 'ideal',
          N: 18,
          Nfeed: 9,
          F: 120,
          zF: 0.50,
          q: 1.0,
          P: 90.0, // Low pressure increases vapor volume
          R: 4.5,  // High reflux increases internal traffic
          D: 60,   // High boilup needed to draw 60 kmol/h distillate
        });
        break;
      case 'azeotrope':
        setInputs({
          systemId: 'ethanol-water',
          thermoModel: 'nrtl', // Crucial for non-ideal VLE representation
          N: 24,
          Nfeed: 12,
          F: 100,
          zF: 0.40,
          q: 1.0,
          P: 101.3,
          R: 3.5,
          D: 40,
        });
        break;
    }
  };

  // 6. Callback when a quiz challenge setup is clicked
  const handleApplyChallengeSetup = (challenge: QuizChallenge) => {
    setInputs(prev => ({
      ...prev,
      systemId: challenge.systemId,
      N: challenge.setup.N,
      Nfeed: challenge.setup.Nfeed,
      F: challenge.setup.F,
      zF: challenge.setup.zF,
      q: challenge.setup.q,
      P: challenge.setup.P,
      // Default guess parameters to let operator solve it
      R: 1.5,
      D: challenge.setup.F * challenge.setup.zF, // match theoretical split
    }));
  };

  const activeSystem = CHEMICAL_SYSTEMS.find(s => s.id === inputs.systemId) || CHEMICAL_SYSTEMS[0];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 transition-colors duration-300 font-sans flex flex-col light:bg-slate-50 light:text-slate-900">
      
      {/* HEADER SECTION */}
      <header className="border-b border-slate-900 bg-slate-900/60 backdrop-blur-md sticky top-0 z-30 px-6 py-4 flex justify-between items-center light:border-slate-200 light:bg-white/70">
        <div className="flex items-center gap-3">
          <div className="bg-cyan-500/10 p-2 rounded-xl border border-cyan-500/20">
            <Activity className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white light:text-slate-900">
              Distillation Column Digital Twin
            </h1>
            <p className="text-xs text-slate-400">
              Operator Training Platform & Real-Time Thermodynamics Simulator
            </p>
          </div>
        </div>

        {/* Action Controls & Theme Toggle */}
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsTheoryOpen(true)}
            className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 hover:text-white rounded-xl border border-slate-700/50 transition-all cursor-pointer"
          >
            <BookOpen className="w-4 h-4" />
            Theory & Info
          </button>

          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="w-4.5 h-4.5" /> : <Moon className="w-4.5 h-4.5" />}
          </button>
        </div>
      </header>

      {/* WORKSPACE CONTENT */}
      <main className="flex-grow p-6 space-y-6 max-w-7xl mx-auto w-full">
        
        {/* OPERATIONAL SCENARIOS PRESETS */}
        <section className="glass p-5 rounded-2xl border border-slate-800/80">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold tracking-wider text-slate-300 uppercase">Operational Training Scenarios</h2>
              <p className="text-xs text-slate-400 mt-0.5">Deploy preset disturbance situations to practice recovery</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button 
                onClick={() => applyPreset('steady')}
                className="text-xs bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-white font-medium px-3.5 py-1.5 rounded-xl transition-all cursor-pointer"
              >
                Normal Steady State
              </button>
              <button 
                onClick={() => applyPreset('upset')}
                className="text-xs bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-white font-medium px-3.5 py-1.5 rounded-xl transition-all cursor-pointer"
              >
                Feed composition drop
              </button>
              <button 
                onClick={() => applyPreset('cooling')}
                className="text-xs bg-red-950/40 hover:bg-red-900/60 border border-red-800 text-red-300 font-medium px-3.5 py-1.5 rounded-xl transition-all cursor-pointer animate-pulse"
              >
                ⚠️ Cooling Water Failure
              </button>
              <button 
                onClick={() => applyPreset('flooding')}
                className="text-xs bg-amber-950/40 hover:bg-amber-900/60 border border-amber-800 text-amber-300 font-medium px-3.5 py-1.5 rounded-xl transition-all cursor-pointer"
              >
                ⚠️ Flooding Upset
              </button>
              <button 
                onClick={() => applyPreset('azeotrope')}
                className="text-xs bg-cyan-950/40 hover:bg-cyan-900/60 border border-cyan-800 text-cyan-300 font-medium px-3.5 py-1.5 rounded-xl transition-all cursor-pointer"
              >
                Azeotropic Limit (EtOH-H2O)
              </button>
            </div>
          </div>
        </section>

        {/* TWO-COLUMN GRID LAYOUT */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT PANEL: SLIDERS & PARAMETER CONTROLS (lg:col-span-4) */}
          <section className="lg:col-span-4 space-y-6">
            
            {/* 1. COLUMN HARDWARE CONFIGURATION */}
            <div className="glass p-5 rounded-2xl border border-slate-800/80 space-y-4">
              <h3 className="text-sm font-semibold tracking-wider text-slate-300 uppercase flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-cyan-400" /> Column Configuration
              </h3>
              
              {/* Chemical system selector */}
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Chemical System</label>
                <select
                  value={inputs.systemId}
                  onChange={(e) => setInputs(prev => ({ ...prev, systemId: e.target.value }))}
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 cursor-pointer"
                >
                  {CHEMICAL_SYSTEMS.map(sys => (
                    <option key={sys.id} value={sys.id}>{sys.name}</option>
                  ))}
                </select>
              </div>

              {/* Thermo Package Switcher */}
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1.5">Thermodynamic Package</label>
                <div className="grid grid-cols-2 gap-2 bg-slate-950/80 p-1 border border-slate-800 rounded-xl">
                  <button
                    onClick={() => setInputs(prev => ({ ...prev, thermoModel: 'ideal' }))}
                    className={`py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                      inputs.thermoModel === 'ideal'
                        ? 'bg-cyan-500 text-slate-950 shadow'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Ideal (Raoult's Law)
                  </button>
                  <button
                    onClick={() => setInputs(prev => ({ ...prev, thermoModel: 'nrtl' }))}
                    className={`py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                      inputs.thermoModel === 'nrtl'
                        ? 'bg-cyan-500 text-slate-950 shadow'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Non-Ideal (NRTL)
                  </button>
                </div>
              </div>

              {/* Physical size controls */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Total Stages (N)</label>
                  <input
                    type="number"
                    min="5"
                    max="35"
                    value={inputs.N}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 10;
                      setInputs(prev => {
                        const newN = Math.max(5, Math.min(35, val));
                        // Ensure feed stage stays inside column bounds
                        const newFeed = Math.min(newN - 1, prev.Nfeed);
                        return { ...prev, N: newN, Nfeed: newFeed };
                      });
                    }}
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Feed Stage (Nfeed)</label>
                  <input
                    type="number"
                    min="2"
                    max={inputs.N - 1}
                    value={inputs.Nfeed}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 5;
                      setInputs(prev => ({
                        ...prev,
                        Nfeed: Math.max(2, Math.min(prev.N - 1, val)),
                      }));
                    }}
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono"
                  />
                </div>
              </div>
            </div>

            {/* 2. OPERATIONAL ADJUSTMENT SLIDERS */}
            <div className="glass p-5 rounded-2xl border border-slate-800/80 space-y-5">
              <h3 className="text-sm font-semibold tracking-wider text-slate-300 uppercase flex items-center gap-1.5">
                <Gauge className="w-4 h-4 text-cyan-400" /> Operational Controls
              </h3>

              {/* Slider 1: Reflux Ratio R */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Reflux Ratio (R)</span>
                  <span className="font-mono font-bold text-cyan-400">{inputs.R.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="12.0"
                  step="0.05"
                  value={inputs.R}
                  onChange={(e) => setInputs(prev => ({ ...prev, R: parseFloat(e.target.value) }))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                />
                <span className="text-[9px] text-slate-500 block">Controls reflux flow back to column. Higher R = purer products but more energy.</span>
              </div>

              {/* Slider 2: Distillate flow rate D */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Distillate Draw (D)</span>
                  <span className="font-mono font-bold text-cyan-400">{inputs.D.toFixed(1)} kmol/h</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max={Math.min(95, inputs.F - 5)}
                  step="0.5"
                  value={inputs.D}
                  onChange={(e) => setInputs(prev => ({ ...prev, D: parseFloat(e.target.value) }))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                />
                <span className="text-[9px] text-slate-500 block">Distillate draw rate. Limits bottoms flow ($B = F - D$). Adjust to split feed composition.</span>
              </div>

              {/* Slider 3: Feed Flow Rate F */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Feed Flow (F)</span>
                  <span className="font-mono font-bold text-slate-300">{inputs.F.toFixed(0)} kmol/h</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="200"
                  step="5"
                  value={inputs.F}
                  onChange={(e) => {
                    const nextF = parseFloat(e.target.value);
                    // Distillate draw must adjust to be lower than feed rate
                    const nextD = Math.min(inputs.D, nextF - 10);
                    setInputs(prev => ({ ...prev, F: nextF, D: nextD }));
                  }}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                />
              </div>

              {/* Slider 4: Feed Composition zF */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Feed LK Fraction (zF)</span>
                  <span className="font-mono font-bold text-slate-300">{(inputs.zF * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min="0.10"
                  max="0.90"
                  step="0.01"
                  value={inputs.zF}
                  onChange={(e) => setInputs(prev => ({ ...prev, zF: parseFloat(e.target.value) }))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                />
              </div>

              {/* Slider 5: Feed Quality q */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Feed Thermal State (q)</span>
                  <span className="font-mono font-bold text-slate-300">{inputs.q.toFixed(2)} ({inputs.q === 1 ? 'Sat Liq' : inputs.q === 0 ? 'Sat Vap' : inputs.q > 1 ? 'Subcooled' : 'Flashed'})</span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="1.5"
                  step="0.05"
                  value={inputs.q}
                  onChange={(e) => setInputs(prev => ({ ...prev, q: parseFloat(e.target.value) }))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                />
              </div>

              {/* Slider 6: Column top pressure P */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Column Pressure (P)</span>
                  <span className="font-mono font-bold text-slate-300">{inputs.P.toFixed(1)} kPa</span>
                </div>
                <input
                  type="range"
                  min="50.0"
                  max="300.0"
                  step="1.0"
                  value={inputs.P}
                  onChange={(e) => setInputs(prev => ({ ...prev, P: parseFloat(e.target.value) }))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                />
              </div>
            </div>
          </section>

          {/* RIGHT PANEL: DYNAMIC INTERACTIVE VISUALIZATIONS (lg:col-span-8) */}
          <section className="lg:col-span-8 space-y-6">
            
            {/* GRID OF FLOWSHEET & MCCABE-THIELE SIDE-BY-SIDE */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Flowsheet Digital Twin */}
              <ColumnFlowsheet 
                result={simulationResult}
                system={activeSystem}
                N={inputs.N}
                Nfeed={inputs.Nfeed}
                R={inputs.R}
                D={inputs.D}
                F={inputs.F}
                q={inputs.q}
                zF={inputs.zF}
              />
              
              {/* McCabe-Thiele Diagram */}
              <McCabeThieleChart 
                result={simulationResult}
                system={activeSystem}
                inputs={inputs}
              />
            </div>

            {/* STAGE PROFILES PLOTS */}
            <ProfileCharts 
              result={simulationResult}
              system={activeSystem}
            />

            {/* OPERATOR QUIZZES AND CHALLENGE SYSTEM */}
            <OperatorQuizzes 
              result={simulationResult}
              onApplyChallengeSetup={handleApplyChallengeSetup}
            />

          </section>

        </div>
      </main>

      {/* REFERENCE GUIDE DRAWER */}
      <TheoryDrawer 
        isOpen={isTheoryOpen}
        onClose={() => setIsTheoryOpen(false)}
      />

      {/* FOOTER */}
      <footer className="border-t border-slate-900 bg-slate-950 text-center py-6 text-xs text-slate-500 mt-12 light:border-slate-200 light:bg-slate-100">
        <p>© 2026 Distillation Column Digital Twin Project. All rights reserved.</p>
        <p className="mt-1 text-[10px] text-slate-600">
          Engineered using React, Vite, Tailwind CSS, Lucide, Recharts, and KaTeX physics renderers.
        </p>
      </footer>

    </div>
  );
}
