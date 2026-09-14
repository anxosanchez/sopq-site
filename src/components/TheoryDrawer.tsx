import React, { useState } from 'react';
import { X, BookOpen, Info, ShieldAlert, Thermometer } from 'lucide-react';
import katex from 'katex';

// Safe wrapper component for rendering LaTeX formulas via KaTeX
interface MathFormulaProps {
  formula: string;
  displayMode?: boolean;
}

const MathFormula: React.FC<MathFormulaProps> = ({ formula, displayMode = false }) => {
  const html = React.useMemo(() => {
    try {
      return katex.renderToString(formula, {
        displayMode,
        throwOnError: false,
      });
    } catch (e) {
      return formula;
    }
  }, [formula, displayMode]);

  return <span dangerouslySetInnerHTML={{ __html: html }} />;
};

interface TheoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TheoryDrawer: React.FC<TheoryDrawerProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'thermo' | 'math' | 'hydraulics'>('thermo');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end overflow-hidden select-none">
      {/* Backdrop overlay */}
      <div 
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div className="relative w-full max-w-xl h-full bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col z-10 transition-transform duration-300 translate-x-0">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-bold text-white tracking-wide">Theory & Reference Guide</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/20 text-sm">
          <button
            onClick={() => setActiveTab('thermo')}
            className={`flex-1 py-3 text-center border-b-2 font-medium transition-colors ${
              activeTab === 'thermo' 
                ? 'border-cyan-400 text-cyan-400' 
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Thermodynamics
          </button>
          <button
            onClick={() => setActiveTab('math')}
            className={`flex-1 py-3 text-center border-b-2 font-medium transition-colors ${
              activeTab === 'math' 
                ? 'border-cyan-400 text-cyan-400' 
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            McCabe-Thiele Math
          </button>
          <button
            onClick={() => setActiveTab('hydraulics')}
            className={`flex-1 py-3 text-center border-b-2 font-medium transition-colors ${
              activeTab === 'hydraulics' 
                ? 'border-cyan-400 text-cyan-400' 
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Column Hydraulics
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-grow overflow-y-auto p-6 space-y-6 text-slate-300 text-sm leading-relaxed scroller">
          
          {/* TAB 1: THERMODYNAMICS */}
          {activeTab === 'thermo' && (
            <div className="space-y-5">
              <div>
                <h3 className="flex items-center gap-1.5 text-base font-bold text-white mb-2">
                  <Thermometer className="w-4 h-4 text-cyan-400" />
                  Vapor-Liquid Equilibrium (VLE)
                </h3>
                <p>
                  Distillation relies on volatile components partitioning between vapor and liquid phases. 
                  At equilibrium, this is governed by the modified Raoult's Law:
                </p>
                <div className="my-3 py-2 bg-slate-950/40 rounded-xl text-center">
                  <MathFormula formula="y_i P = x_i \gamma_i P_i^{\text{sat}}(T)" displayMode={true} />
                </div>
                <p>
                  Where <MathFormula formula="y_i" /> is vapor composition, <MathFormula formula="x_i" /> is liquid composition, 
                  <MathFormula formula="P" /> is pressure, <MathFormula formula="\gamma_i" /> is liquid activity coefficient, 
                  and <MathFormula formula="P_i^{\text{sat}}(T)" /> is the pure component vapor pressure.
                </p>
              </div>

              <div className="border-t border-slate-800/80 pt-4">
                <h4 className="font-bold text-white mb-1">Antoine Equation</h4>
                <p className="mb-2">
                  Pure component vapor pressure is calculated as a function of temperature:
                </p>
                <div className="my-3 py-2 bg-slate-950/40 rounded-xl text-center">
                  <MathFormula formula="\log_{10}(P_i^{\text{sat}}) = A_i - \frac{B_i}{T + C_i}" displayMode={true} />
                </div>
                <p className="text-xs text-slate-400">
                  Constants <MathFormula formula="A, B, C" /> are unique empirical coefficients. 
                  In this twin, we use Antoine coefficients configured for pressure in mmHg and temperature in °C, converting to metric kPa dynamically.
                </p>
              </div>

              <div className="border-t border-slate-800/80 pt-4">
                <h4 className="font-bold text-white mb-2">Activity Models: Ideal vs. NRTL</h4>
                <div className="space-y-3">
                  <div className="bg-slate-950/20 p-3 rounded-lg border border-slate-800/50">
                    <span className="text-cyan-400 font-bold block mb-1">Ideal Model (Raoult's Law)</span>
                    <p className="text-xs">
                      Assumes no molecular interactions in liquid. Activity coefficients <MathFormula formula="\gamma_i = 1.0" />.
                      Suitable for structurally similar compounds like <strong>Benzene - Toluene</strong>.
                    </p>
                  </div>
                  <div className="bg-slate-950/20 p-3 rounded-lg border border-slate-800/50">
                    <span className="text-purple-400 font-bold block mb-1">Non-Ideal Model (NRTL)</span>
                    <p className="text-xs">
                      The Non-Random Two-Liquid model calculates <MathFormula formula="\gamma_i" /> using local concentrations 
                      governed by molecular attraction forces and non-random packing:
                    </p>
                    <div className="my-2 py-1.5 bg-slate-950/30 rounded text-center">
                      <MathFormula formula="\ln \gamma_1 = x_2^2 \left[ \tau_{21} \left( \frac{G_{21}}{x_1 + x_2 G_{21}} \right)^2 + \frac{\tau_{12} G_{12}}{(x_2 + x_1 G_{12})^2} \right]" displayMode={false} />
                    </div>
                    <p className="text-xs mt-2">
                      Crucial for highly polar systems like <strong>Ethanol - Water</strong>. It successfully predicts the azeotrope 
                      (separation limit where <MathFormula formula="y_1 = x_1" />), which occurs because ethanol molecules form local hydrogen-bond clusters that increase volatility relative to pure water.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: MCCABE-THIELE MATH */}
          {activeTab === 'math' && (
            <div className="space-y-5">
              <div>
                <h3 className="flex items-center gap-1.5 text-base font-bold text-white mb-2">
                  <Info className="w-4 h-4 text-cyan-400" />
                  McCabe-Thiele Assumptions
                </h3>
                <p className="mb-2">
                  The McCabe-Thiele graphical method assumes <strong>Constant Molar Overflow (CMO)</strong>:
                </p>
                <ul className="list-disc list-inside space-y-1 text-xs text-slate-400 pl-2">
                  <li>Equimolar heats of vaporization between components.</li>
                  <li>Negligible liquid heat capacities and heat of mixing.</li>
                  <li>No heat loss from the column shell (adiabatic).</li>
                </ul>
                <p className="mt-2 text-xs">
                  This implies that molar liquid and vapor rates (<MathFormula formula="L" /> and <MathFormula formula="V" />) 
                  remain constant within each column section.
                </p>
              </div>

              <div className="border-t border-slate-800/80 pt-4">
                <h4 className="font-bold text-white mb-1">Operating Lines</h4>
                <p className="mb-2 text-xs">
                  Operating lines relate vapor flowing up to liquid flowing down between adjacent stages:
                </p>
                <div className="space-y-3">
                  <div className="bg-slate-950/20 p-3 rounded-lg border border-slate-800/50">
                    <span className="text-purple-400 font-bold block mb-1">Rectifying Operating Line (ROL)</span>
                    <p className="text-xs mb-2">Governs the upper section (above feed stage) where reflux enriches the light component:</p>
                    <div className="text-center py-1.5 bg-slate-950/40 rounded">
                      <MathFormula formula="y_{n+1} = \frac{R}{R+1} x_n + \frac{x_D}{R+1}" displayMode={true} />
                    </div>
                  </div>
                  <div className="bg-slate-950/20 p-3 rounded-lg border border-slate-800/50">
                    <span className="text-indigo-400 font-bold block mb-1">Stripping Operating Line (SOL)</span>
                    <p className="text-xs mb-2">Governs the lower section (below feed stage) where vapor boilup strips out the light component:</p>
                    <div className="text-center py-1.5 bg-slate-950/40 rounded">
                      <MathFormula formula="y_{n+1} = \frac{L'}{V'} x_n - \frac{B}{V'} x_B" displayMode={true} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-800/80 pt-4">
                <h4 className="font-bold text-white mb-1">Feed Quality & the q-Line</h4>
                <p className="mb-2">
                  The feed quality factor <MathFormula formula="q" /> indicates the liquid fraction of the feed:
                </p>
                <div className="my-3 py-2 bg-slate-950/40 rounded-xl text-center">
                  <MathFormula formula="y = \frac{q}{q-1} x - \frac{z_F}{q-1}" displayMode={true} />
                </div>
                <p className="text-xs mb-3 text-slate-400">
                  The intersection of ROL and SOL must lie on this line. Its slope changes with thermal state:
                </p>
                <ul className="list-disc list-inside space-y-1 text-xs text-slate-400 pl-2">
                  <li><MathFormula formula="q = 1.0" />: Saturated liquid (vertical line).</li>
                  <li><MathFormula formula="q = 0.0" />: Saturated vapor (horizontal line).</li>
                  <li><MathFormula formula="0 < q < 1" />: Partially flashed feed mixture.</li>
                  <li><MathFormula formula="q > 1.0" />: Subcooled liquid (super-vertical slope, condensed vapor at feed tray).</li>
                </ul>
              </div>
            </div>
          )}

          {/* TAB 3: HYDRAULICS */}
          {activeTab === 'hydraulics' && (
            <div className="space-y-5">
              <div>
                <h3 className="flex items-center gap-1.5 text-base font-bold text-white mb-2">
                  <ShieldAlert className="w-4 h-4 text-cyan-400" />
                  Tower Tray Hydraulics
                </h3>
                <p>
                  Trays require a balanced counter-current flow of rising vapor and descending liquid. 
                  Vapor flows upward through holes, bubbling through the liquid pool to create contact area, while liquid flows across the tray and down via downcomer ducts.
                </p>
              </div>

              <div className="border-t border-slate-800/80 pt-4">
                <h4 className="font-bold text-red-400 mb-1">Column Flooding</h4>
                <p className="mb-2">
                  Occurs when the vapor velocity is excessive (due to high reboiler heat duty or low pressure increasing vapor volume):
                </p>
                <ul className="list-disc list-inside space-y-1 text-xs text-slate-400 pl-2">
                  <li>High upward vapor drag forces keep liquid from flowing down the downcomer.</li>
                  <li>Liquid accumulates on trays, filling the column, causing a massive pressure drop.</li>
                  <li>Separation drops to zero. Trays are liquid-logged.</li>
                </ul>
                <div className="bg-red-950/30 border border-red-900/50 p-3 rounded-lg text-xs mt-2">
                  <span className="font-semibold text-red-400 block mb-0.5">Operator Remediation:</span>
                  Decrease reboiler steam flow (heat duty) or increase operating pressure to shrink vapor volume.
                </div>
              </div>

              <div className="border-t border-slate-800/80 pt-4">
                <h4 className="font-bold text-amber-400 mb-1">Column Weeping</h4>
                <p className="mb-2">
                  Occurs when vapor velocity is too low (low boilup / reboiler duty):
                </p>
                <ul className="list-disc list-inside space-y-1 text-xs text-slate-400 pl-2">
                  <li>Upward pressure of the vapor is insufficient to support the liquid head on the tray.</li>
                  <li>Liquid drains directly down through the tray holes rather than flowing across to the downcomer.</li>
                  <li>Drastically reduces vapor-liquid contact, ruining tray efficiency and purity.</li>
                </ul>
                <div className="bg-amber-950/30 border border-amber-900/50 p-3 rounded-lg text-xs mt-2">
                  <span className="font-semibold text-amber-400 block mb-0.5">Operator Remediation:</span>
                  Increase reboiler duty (steam boilup) or lower column pressure to expand vapor volume.
                </div>
              </div>

              <div className="border-t border-slate-800/80 pt-4">
                <h4 className="font-bold text-white mb-2">Definitions & Controls</h4>
                <div className="space-y-3 text-xs">
                  <div className="flex justify-between items-start gap-3 bg-slate-950/10 p-2.5 rounded border border-slate-800/50">
                    <span className="font-bold text-slate-300 min-w-[100px]">Reflux Ratio (R)</span>
                    <span className="text-slate-400">Ratio of liquid returned as reflux to liquid drawn off as distillate product: <MathFormula formula="R = L/D" />. High R improves purity but increases cooling/heating energy.</span>
                  </div>
                  <div className="flex justify-between items-start gap-3 bg-slate-950/10 p-2.5 rounded border border-slate-800/50">
                    <span className="font-bold text-slate-300 min-w-[100px]">Boilup Ratio (V_B)</span>
                    <span className="text-slate-400">Ratio of vapor boiled up to liquid drawn off as bottoms: <MathFormula formula="V_B = V'/B" />. Governs stripping action and energy consumption.</span>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer / Status */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs text-slate-500 font-medium">
          <span>Digital Twin Physics Engine v1.0</span>
          <span className="flex items-center gap-1 text-cyan-500/80">
            <Info className="w-3.5 h-3.5" /> Operators Handbook
          </span>
        </div>

      </div>
    </div>
  );
};
