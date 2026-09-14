import React, { useState, useEffect } from 'react';
import { Target, CheckCircle2, XCircle, HelpCircle, Award } from 'lucide-react';
import type { SimulationResult } from '../simulation/simulationEngine';

export interface QuizChallenge {
  id: string;
  name: string;
  description: string;
  systemId: string;
  targetPurity: number; // xD must be >= this
  maxDuty: number;      // Qr must be <= this in kW
  checkHydraulics: boolean; // Must not have weeping or flooding
  targetBottomsLoss?: number; // xB must be <= this
  setup: {
    N: number;
    Nfeed: number;
    F: number;
    zF: number;
    q: number;
    P: number;
  };
  hint: string;
}

export const QUIZ_CHALLENGES: QuizChallenge[] = [
  {
    id: 'purity-opt',
    name: 'Challenge 1: High Purity Distillation',
    description: 'Optimize separation for the Benzene-Toluene system. Achieve high distillate purity while minimizing energy consumption in the reboiler.',
    systemId: 'benzene-toluene',
    targetPurity: 0.95,
    maxDuty: 950, // kW
    checkHydraulics: true,
    setup: {
      N: 18,
      Nfeed: 9,
      F: 100,
      zF: 0.5,
      q: 1.0, // Saturated liquid
      P: 101.3,
    },
    hint: 'Increase Reflux Ratio (R) to improve separation, but monitor Reboiler Duty (Qr) closely. Finding the right balance of Distillate Draw (D) will help keep the reboiler from consuming too much steam.'
  },
  {
    id: 'feed-upset',
    name: 'Challenge 2: Feed Composition Disturbance',
    description: 'An upstream catalyst failure has dropped the light component feed concentration to 25%. Maintain a viable distillate product quality with low energy overhead.',
    systemId: 'benzene-toluene',
    targetPurity: 0.90,
    maxDuty: 1100, // kW
    checkHydraulics: true,
    setup: {
      N: 18,
      Nfeed: 9,
      F: 100,
      zF: 0.25, // Heavy upset
      q: 1.0,
      P: 101.3,
    },
    hint: 'With less light key in the feed, you must reduce the Distillate Flow rate (D) to prevent pulling heavy components into the overheads, and raise Reflux Ratio (R) to boost vapor scrubbing.'
  },
  {
    id: 'throughput-limit',
    name: 'Challenge 3: High Throughput Hydraulics',
    description: 'The plant manager has boosted feed throughput to 150 kmol/h on the Methanol-Water column. Achieve 92% purity without flooding the trays.',
    systemId: 'methanol-water',
    targetPurity: 0.92,
    maxDuty: 1600, // kW
    checkHydraulics: true,
    targetBottomsLoss: 0.08, // xB <= 0.08
    setup: {
      N: 20,
      Nfeed: 10,
      F: 150, // High feed
      zF: 0.5,
      q: 1.0,
      P: 120.0, // Slightly higher pressure helps expand tray capacity
    },
    hint: 'Higher feed rates push vapor velocities close to the flooding limit. Use a higher Column Pressure (P) to compress the vapor volume (reducing velocity), and adjust R and D to balance purity and tray load.'
  }
];

interface OperatorQuizzesProps {
  result: SimulationResult | null;
  onApplyChallengeSetup: (challenge: QuizChallenge) => void;
}

export const OperatorQuizzes: React.FC<OperatorQuizzesProps> = ({
  result,
  onApplyChallengeSetup,
}) => {
  const [selectedChallengeId, setSelectedChallengeId] = useState<string>('');
  const [showHint, setShowHint] = useState<boolean>(false);

  const activeChallenge = QUIZ_CHALLENGES.find(c => c.id === selectedChallengeId);

  // Check goals in real-time
  const checkStatus = () => {
    if (!activeChallenge || !result || !result.success) {
      return {
        purityPass: false,
        dutyPass: false,
        hydraulicsPass: false,
        bottomsPass: true,
        allPassed: false,
      };
    }

    const purityPass = result.xD >= activeChallenge.targetPurity;
    const dutyPass = result.Qr <= activeChallenge.maxDuty;
    
    let hydraulicsPass = true;
    if (activeChallenge.checkHydraulics) {
      hydraulicsPass = !result.hydraulicStatus.floodingWarning && !result.hydraulicStatus.weepingWarning;
    }

    let bottomsPass = true;
    if (activeChallenge.targetBottomsLoss !== undefined) {
      bottomsPass = result.xB <= activeChallenge.targetBottomsLoss;
    }

    const allPassed = purityPass && dutyPass && hydraulicsPass && bottomsPass;

    return {
      purityPass,
      dutyPass,
      hydraulicsPass,
      bottomsPass,
      allPassed,
    };
  };

  const { purityPass, dutyPass, hydraulicsPass, bottomsPass, allPassed } = checkStatus();

  // Reset hint when changing challenges
  useEffect(() => {
    setShowHint(false);
  }, [selectedChallengeId]);

  return (
    <div className="flex flex-col h-full p-5 glass rounded-2xl text-slate-100 min-h-[420px]">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-amber-400" />
          <h3 className="text-lg font-semibold tracking-wide text-white font-sans">Operator Training Challenges</h3>
        </div>
        {activeChallenge && (
          <button
            onClick={() => onApplyChallengeSetup(activeChallenge)}
            className="text-[10px] bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-2.5 py-1 rounded-md transition-colors shadow-lg shadow-amber-500/10 cursor-pointer"
          >
            Apply Challenge Setup
          </button>
        )}
      </div>

      {/* Selector Grid */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {QUIZ_CHALLENGES.map(c => (
          <button
            key={c.id}
            onClick={() => setSelectedChallengeId(c.id === selectedChallengeId ? '' : c.id)}
            className={`py-2 px-3 text-xs rounded-xl font-medium border text-center transition-all cursor-pointer ${
              c.id === selectedChallengeId
                ? 'bg-amber-500/15 border-amber-500 text-amber-300'
                : 'bg-slate-800/40 border-slate-700/50 text-slate-400 hover:text-slate-200 hover:border-slate-600'
            }`}
          >
            {c.id === 'purity-opt' ? 'Challenge 1' : c.id === 'feed-upset' ? 'Challenge 2' : 'Challenge 3'}
          </button>
        ))}
      </div>

      {/* Active Challenge Workspace */}
      {!activeChallenge ? (
        <div className="flex-grow flex flex-col items-center justify-center p-6 text-center text-slate-500 border border-dashed border-slate-800 rounded-xl">
          <Award className="w-8 h-8 mb-2 text-slate-600 animate-bounce" />
          <p className="text-xs font-semibold">No challenge selected.</p>
          <p className="text-[10px] text-slate-600 max-w-[220px] mt-0.5">
            Select a training challenge above to load objectives, test your operations, and earn your certificate!
          </p>
        </div>
      ) : (
        <div className="flex-grow flex flex-col justify-between space-y-4">
          {/* Challenge Description */}
          <div>
            <span className="text-xs font-bold text-amber-400 block mb-1">{activeChallenge.name}</span>
            <p className="text-xs text-slate-400">{activeChallenge.description}</p>
          </div>

          {/* Goal checklist cards */}
          <div className="space-y-2 bg-slate-950/30 border border-slate-800/60 p-3.5 rounded-xl">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block mb-2">Target Objectives</span>
            
            {/* Goal 1: Distillate Purity */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 flex items-center gap-1.5">
                • Distillate purity (xD) &ge; {(activeChallenge.targetPurity * 100).toFixed(0)}%
              </span>
              <span className="flex items-center gap-1 font-mono font-medium">
                {result?.success ? `${(result.xD * 100).toFixed(1)}%` : '---'}
                {purityPass ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-500" />
                )}
              </span>
            </div>

            {/* Goal 2: Reboiler Duty */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 flex items-center gap-1.5">
                • Reboiler Duty (Qr) &le; {activeChallenge.maxDuty} kW
              </span>
              <span className="flex items-center gap-1 font-mono font-medium">
                {result?.success ? `${result.Qr.toFixed(0)} kW` : '---'}
                {dutyPass ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-500" />
                )}
              </span>
            </div>

            {/* Goal 3: Bottoms loss (optional) */}
            {activeChallenge.targetBottomsLoss !== undefined && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 flex items-center gap-1.5">
                  • Bottoms loss (x_LK) &le; {(activeChallenge.targetBottomsLoss * 100).toFixed(0)}%
                </span>
                <span className="flex items-center gap-1 font-mono font-medium">
                  {result?.success ? `${(result.xB * 100).toFixed(1)}%` : '---'}
                  {bottomsPass ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-500" />
                  )}
                </span>
              </div>
            )}

            {/* Goal 4: Column Hydraulics */}
            {activeChallenge.checkHydraulics && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 flex items-center gap-1.5">
                  • Avoid Flooding & Weeping
                </span>
                <span className="flex items-center gap-1 font-mono font-medium">
                  {result?.success
                    ? result.hydraulicStatus.floodingWarning
                      ? 'Flooding'
                      : result.hydraulicStatus.weepingWarning
                      ? 'Weeping'
                      : 'Stable'
                    : '---'}
                  {hydraulicsPass ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-500" />
                  )}
                </span>
              </div>
            )}
          </div>

          {/* Tips / Help */}
          <div className="text-xs">
            <button
              onClick={() => setShowHint(!showHint)}
              className="flex items-center gap-1 text-[11px] text-amber-400 hover:text-amber-300 font-medium transition-colors cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5" /> {showHint ? 'Hide Operator Advisory' : 'Show Operator Advisory'}
            </button>
            {showHint && (
              <div className="mt-1.5 p-3 bg-slate-800/40 border border-slate-700/30 rounded-lg text-slate-400 leading-normal text-[11px]">
                {activeChallenge.hint}
              </div>
            )}
          </div>

          {/* Live grading card */}
          <div className={`p-4 rounded-xl flex items-center justify-between border ${
            allPassed 
              ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-200' 
              : 'bg-slate-950/40 border-slate-800/60 text-slate-400'
          }`}>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider opacity-60">Live Operator Grade</span>
              <div className="text-lg font-black tracking-wide">
                {allPassed ? 'GRADE A: CERTIFIED' : 'GRADE F: IN TRAINING'}
              </div>
            </div>
            {allPassed ? (
              <div className="bg-emerald-500 text-slate-950 p-1.5 rounded-lg">
                <Award className="w-7 h-7" />
              </div>
            ) : (
              <div className="bg-slate-800 text-slate-500 p-1.5 rounded-lg">
                <Target className="w-7 h-7" />
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
};
