/**
 * Simulation Engine for Distillation Column Digital Twin
 * 
 * This engine handles the thermodynamics (Antoine, NRTL activity coefficients)
 * and the stage-by-stage calculations for binary distillation.
 * It uses a rating-mode solver (bisection root finder in xD) to compute 
 * the steady-state stage profiles.
 */

export interface ComponentData {
  name: string;
  formula: string;
  A: number; // Antoine constant A (mmHg)
  B: number; // Antoine constant B (mmHg)
  C: number; // Antoine constant C (°C)
  Mw: number; // Molecular weight (g/mol)
  Hvap: number; // Latent heat of vaporization (kJ/kmol)
}

export interface ChemicalSystem {
  id: string;
  name: string;
  comp1: ComponentData; // Light Key (LK)
  comp2: ComponentData; // Heavy Key (HK)
  nrtl: {
    alpha: number;
    a12: number; // Binary interaction parameter g12 - g22 in Kelvin
    a21: number; // Binary interaction parameter g21 - g11 in Kelvin
  };
}

export type ThermoModel = 'ideal' | 'nrtl';

export interface SimulationInputs {
  systemId: string;
  thermoModel: ThermoModel;
  N: number;       // Total stages (including condenser and reboiler)
  Nfeed: number;   // Feed stage index (1-based, typically near N/2)
  zF: number;      // Feed light key mole fraction
  q: number;       // Feed thermal state (1 = sat liquid, 0 = sat vapor)
  P: number;       // Column top pressure (kPa)
  R: number;       // Reflux ratio (L/D)
  D: number;       // Distillate flow rate (kmol/h)
  F: number;       // Feed flow rate (kmol/h, default 100)
}

export interface StageData {
  stageIndex: number; // 1 to N
  x: number;          // Liquid mole fraction (light key)
  y: number;          // Vapor mole fraction (light key)
  T: number;          // Temperature (°C)
  gamma1: number;     // Activity coefficient (light key)
  gamma2: number;     // Activity coefficient (heavy key)
  flowL: number;      // Liquid flow rate leaving stage (kmol/h)
  flowV: number;      // Vapor flow rate leaving stage (kmol/h)
}

export interface SimulationResult {
  success: boolean;
  stages: StageData[];
  xD: number;
  xB: number;
  Qc: number; // Condenser duty (kW)
  Qr: number; // Reboiler duty (kW)
  V_B: number; // Boilup ratio
  errorMsg: string;
  hydraulicStatus: {
    weepingStages: number[];
    floodingStages: number[];
    weepingWarning: boolean;
    floodingWarning: boolean;
    averageLoad: number;
  };
}

// ==========================================
// 1. DATABASE OF CHEMICAL SYSTEMS
// ==========================================

export const COMPONENTS = {
  benzene: {
    name: 'Benzene',
    formula: 'C6H6',
    A: 6.90565,
    B: 1211.033,
    C: 220.79,
    Mw: 78.11,
    Hvap: 30720,
  },
  toluene: {
    name: 'Toluene',
    formula: 'C7H8',
    A: 6.95464,
    B: 1343.943,
    C: 219.377,
    Mw: 92.14,
    Hvap: 33180,
  },
  ethanol: {
    name: 'Ethanol',
    formula: 'C2H5OH',
    A: 8.04494,
    B: 1554.3,
    C: 222.65,
    Mw: 46.07,
    Hvap: 38560,
  },
  water: {
    name: 'Water',
    formula: 'H2O',
    A: 7.96681,
    B: 1668.21,
    C: 228.0,
    Mw: 18.02,
    Hvap: 40650,
  },
  methanol: {
    name: 'Methanol',
    formula: 'CH3OH',
    A: 7.87863,
    B: 1473.11,
    C: 230.0,
    Mw: 32.04,
    Hvap: 35210,
  }
};

export const CHEMICAL_SYSTEMS: ChemicalSystem[] = [
  {
    id: 'benzene-toluene',
    name: 'Benzene - Toluene (Ideal / Near-Ideal)',
    comp1: COMPONENTS.benzene,
    comp2: COMPONENTS.toluene,
    nrtl: {
      alpha: 0.3,
      a12: 0.0, // Perfectly ideal interaction
      a21: 0.0,
    }
  },
  {
    id: 'ethanol-water',
    name: 'Ethanol - Water (Azeotropic / Non-Ideal)',
    comp1: COMPONENTS.ethanol,
    comp2: COMPONENTS.water,
    // NRTL Parameters in Kelvin (g_ij - g_jj)
    // Produces minimum-boiling azeotrope around x ≈ 0.89 mole fraction at 1 atm.
    nrtl: {
      alpha: 0.3,
      a12: 315.79, // ~627.53 cal/mol
      a21: -44.22, // ~-87.87 cal/mol
    }
  },
  {
    id: 'methanol-water',
    name: 'Methanol - Water (Industrial Mix)',
    comp1: COMPONENTS.methanol,
    comp2: COMPONENTS.water,
    nrtl: {
      alpha: 0.3,
      a12: -102.6,
      a21: 286.4,
    }
  }
];

// ==========================================
// 2. THERMODYNAMICS & EQUILIBRIUM SOLVERS
// ==========================================

/**
 * Calculates pure component saturation pressure using the Antoine Equation.
 * Antoine Eq: log10(Psat / mmHg) = A - B / (T + C)
 * @param comp Component parameters
 * @param T Temperature in °C
 * @returns Saturation pressure in kPa
 */
export function antoinePsat(comp: ComponentData, T: number): number {
  const logPsat = comp.A - comp.B / (T + comp.C);
  const Psat_mmHg = Math.pow(10, logPsat);
  return Psat_mmHg * 0.1333224; // 1 mmHg = 0.1333224 kPa
}

/**
 * Calculates pure component boiling point at a given pressure.
 * @param comp Component parameters
 * @param P Pressure in kPa
 * @returns Boiling point temperature in °C
 */
export function getBoilingPoint(comp: ComponentData, P: number): number {
  const P_mmHg = P / 0.1333224;
  return comp.B / (comp.A - Math.log10(P_mmHg)) - comp.C;
}

/**
 * Calculates liquid phase activity coefficients using the NRTL model.
 * @param x1 mole fraction of component 1
 * @param T temperature in °C
 * @param system chemical system containing NRTL parameters
 */
export function calculateNRTL(
  x1: number,
  T: number,
  system: ChemicalSystem
): { gamma1: number; gamma2: number } {
  // Clamp x1 to physical boundaries to prevent numerical instabilities
  const x1_c = Math.max(1e-12, Math.min(1 - 1e-12, x1));
  const x2_c = 1 - x1_c;
  const T_K = T + 273.15; // NRTL requires absolute temperature in Kelvin

  const { alpha, a12, a21 } = system.nrtl;

  // tau_ij = a_ij / T
  const tau12 = a12 / T_K;
  const tau21 = a21 / T_K;

  // G_ij = exp(-alpha * tau_ij)
  const G12 = Math.exp(-alpha * tau12);
  const G21 = Math.exp(-alpha * tau21);

  // denominators
  const denom1 = x1_c + x2_c * G21;
  const denom2 = x2_c + x1_c * G12;

  // ln(gamma_1) = x2^2 * [ tau21 * (G21 / (x1 + x2 * G21))^2 + (tau12 * G12) / (x2 + x1 * G12)^2 ]
  const term1 = tau21 * Math.pow(G21 / denom1, 2);
  const term2 = (tau12 * G12) / Math.pow(denom2, 2);
  const lnGamma1 = x2_c * x2_c * (term1 + term2);

  // ln(gamma_2) = x1^2 * [ tau12 * (G12 / (x2 + x1 * G12))^2 + (tau21 * G21) / (x1 + x2 * G21)^2 ]
  const term3 = tau12 * Math.pow(G12 / denom2, 2);
  const term4 = (tau21 * G21) / Math.pow(denom1, 2);
  const lnGamma2 = x1_c * x1_c * (term3 + term4);

  return {
    gamma1: Math.exp(lnGamma1),
    gamma2: Math.exp(lnGamma2),
  };
}

/**
 * Solves the Bubble Point Temperature of a binary mixture at a specified pressure.
 * Bubble Point Eq: P = x1 * gamma1 * Psat1(T) + x2 * gamma2 * Psat2(T)
 * Uses a robust bisection search bounded by pure boiling points.
 */
export function solveBubblePoint(
  x1: number,
  P: number,
  system: ChemicalSystem,
  thermo: ThermoModel
): { T: number; y: number; gamma1: number; gamma2: number } {
  let T_min = getBoilingPoint(system.comp1, P);
  let T_max = getBoilingPoint(system.comp2, P);

  // Order bounds
  if (T_min > T_max) {
    const temp = T_min;
    T_min = T_max;
    T_max = temp;
  }

  // Add search margin
  T_min -= 15;
  T_max += 15;

  let T = 0.5 * (T_min + T_max);
  let gamma1 = 1.0;
  let gamma2 = 1.0;
  let y = 0.0;

  // Bisection loop
  for (let iter = 0; iter < 40; iter++) {
    T = 0.5 * (T_min + T_max);

    if (thermo === 'nrtl') {
      const gammas = calculateNRTL(x1, T, system);
      gamma1 = gammas.gamma1;
      gamma2 = gammas.gamma2;
    } else {
      gamma1 = 1.0;
      gamma2 = 1.0;
    }

    const Psat1 = antoinePsat(system.comp1, T);
    const Psat2 = antoinePsat(system.comp2, T);

    const P_calc = x1 * gamma1 * Psat1 + (1 - x1) * gamma2 * Psat2;

    if (Math.abs(P_calc - P) < 1e-6) {
      break;
    }

    if (P_calc > P) {
      T_max = T; // Calculated pressure is too high, lower the temp
    } else {
      T_min = T; // Calculated pressure is too low, raise the temp
    }
  }

  // Re-evaluate at final T
  if (thermo === 'nrtl') {
    const gammas = calculateNRTL(x1, T, system);
    gamma1 = gammas.gamma1;
    gamma2 = gammas.gamma2;
  }
  const Psat1 = antoinePsat(system.comp1, T);
  y = (x1 * gamma1 * Psat1) / P;
  y = Math.max(0, Math.min(1.0, y)); // Physical clamping

  return { T, y, gamma1, gamma2 };
}

/**
 * Solves the liquid composition (x) in equilibrium with a given vapor composition (y) at pressure P.
 * This is used for stepping down the column: n -> x_n from y_n.
 * Bisections inside [0, 1] since y(x) is monotonic for the binary systems under consideration.
 */
export function solveLiquidEquilibrium(
  y1: number,
  P: number,
  system: ChemicalSystem,
  thermo: ThermoModel
): { x: number; T: number; gamma1: number; gamma2: number } {
  let x_min = 0.0;
  let x_max = 1.0;
  let x = 0.5;
  let bubble = solveBubblePoint(x, P, system, thermo);

  for (let iter = 0; iter < 40; iter++) {
    x = 0.5 * (x_min + x_max);
    bubble = solveBubblePoint(x, P, system, thermo);

    if (Math.abs(bubble.y - y1) < 1e-7) {
      break;
    }

    if (bubble.y > y1) {
      x_max = x; // vapor fraction is too high, reduce liquid fraction x
    } else {
      x_min = x; // vapor fraction is too low, increase liquid fraction x
    }
  }

  return { x, T: bubble.T, gamma1: bubble.gamma1, gamma2: bubble.gamma2 };
}

// ==========================================
// 3. COLUMN SOLVER (RATING STEADY-STATE MODEL)
// ==========================================

/**
 * Executes a single column profile calculation for a given assumed xD.
 * Returns the computed StageData array and the resulting bottoms xB_calc.
 */
function solveColumnForxD(
  xD: number,
  inputs: SimulationInputs,
  system: ChemicalSystem
): { success: boolean; stages: StageData[]; xB_calc: number } {
  const { N, Nfeed, zF, q, P, R, D, F } = inputs;
  const B = F - D;
  
  // Bottoms composition by overall mass balance
  const xB_bal = (F * zF - D * xD) / B;

  const L = R * D;
  const V = (R + 1) * D;
  const L_prime = L + q * F;
  const V_prime = V - (1 - q) * F;

  const stages: StageData[] = [];

  // Stage 1: Total Condenser
  // Liquid leaving condenser = xD, vapor entering condenser = xD (since fully condensed)
  let y_current = xD;
  
  const condBubble = solveBubblePoint(xD, P, system, inputs.thermoModel);
  stages.push({
    stageIndex: 1,
    x: xD,
    y: xD,
    T: condBubble.T,
    gamma1: condBubble.gamma1,
    gamma2: condBubble.gamma2,
    flowL: L,
    flowV: V,
  });

  // Stepping loop from stage 2 down to stage N (Reboiler)
  for (let n = 2; n <= N; n++) {
    // Liquid fraction on stage n is in equilibrium with vapor leaving stage n (y_n)
    const eq = solveLiquidEquilibrium(y_current, P, system, inputs.thermoModel);
    
    if (isNaN(eq.x) || eq.x < 0 || eq.x > 1.0) {
      return { success: false, stages: [], xB_calc: NaN };
    }

    const isRectifying = n < Nfeed;
    const flowL = isRectifying ? L : L_prime;
    const flowV = isRectifying ? V : V_prime;

    stages.push({
      stageIndex: n,
      x: eq.x,
      y: y_current,
      T: eq.T,
      gamma1: eq.gamma1,
      gamma2: eq.gamma2,
      flowL,
      flowV,
    });

    // Compute vapor composition entering from tray below (y_{n+1}) using Operating Lines
    if (n < N) {
      if (isRectifying) {
        // Rectifying Section Operating Line (ROL)
        // y_{n+1} = (L/V) * x_n + (D/V) * xD
        y_current = (L / V) * eq.x + (D / V) * xD;
      } else {
        // Stripping Section Operating Line (SOL)
        // y_{n+1} = (L'/V') * x_n - (B/V') * xB_bal
        y_current = (L_prime / V_prime) * eq.x - (B / V_prime) * xB_bal;
      }

      // Check for unphysical operating line pinch or crossing
      if (y_current < -0.05 || y_current > 1.05 || isNaN(y_current)) {
        return { success: false, stages: [], xB_calc: NaN };
      }
      y_current = Math.max(1e-12, Math.min(1 - 1e-12, y_current));
    }
  }

  // The reboiler liquid composition is stages[N-1].x
  const xB_calc = stages[N - 1].x;
  return { success: true, stages, xB_calc };
}

/**
 * Runs a bisection solver in xD to align top-down McCabe-Thiele stepping
 * with the overall material balance bottoms composition.
 */
export function runColumnSimulation(inputs: SimulationInputs): SimulationResult {
  // Find system parameters
  const system = CHEMICAL_SYSTEMS.find(s => s.id === inputs.systemId) || CHEMICAL_SYSTEMS[0];
  
  const { F, D, zF } = inputs;
  const B = F - D;

  // 1. Establish search bounds for xD based on material balance constraints:
  // xD * D + xB * B = zF * F. Since 0 <= xB <= 1:
  // xD_max occurs when xB = 0 -> xD_max = zF * F / D
  // xD_min occurs when xB = 1 -> xD_min = (zF * F - B) / D
  const xD_max = Math.min(0.9999, (zF * F) / D);
  const xD_min = Math.max(zF + 0.0001, (zF * F - B) / D);

  if (xD_min >= xD_max) {
    return {
      success: false,
      stages: [],
      xD: 0,
      xB: 0,
      Qc: 0,
      Qr: 0,
      V_B: 0,
      errorMsg: 'Operational specs violate material balance constraint (D is too high or low).',
      hydraulicStatus: { weepingStages: [], floodingStages: [], weepingWarning: false, floodingWarning: false, averageLoad: 0 }
    };
  }

  // Bisection loop on xD
  let low = xD_min;
  let high = xD_max;
  let xD_guess = 0.5 * (low + high);
  let bestResult: SimulationResult | null = null;
  let solved = false;

  for (let iter = 0; iter < 50; iter++) {
    xD_guess = 0.5 * (low + high);
    const xB_bal = (F * zF - D * xD_guess) / B;

    const stepRes = solveColumnForxD(xD_guess, inputs, system);

    if (!stepRes.success || isNaN(stepRes.xB_calc)) {
      // Stepping failed (pinched operating lines). 
      // This usually means xD is too high to achieve with this reflux ratio.
      // So high xD is unachievable -> shrink upper search bound.
      high = xD_guess;
      continue;
    }

    // Residual is: stepped xB - mass balance xB.
    // Higher xD leads to higher stepped xB (closer to 1) and lower mass balance xB (closer to 0).
    // Therefore, residual increases monotonically with xD.
    const residual = stepRes.xB_calc - xB_bal;

    if (Math.abs(residual) < 1e-6) {
      solved = true;
      bestResult = packageResult(stepRes.stages, xD_guess, xB_bal, inputs, system);
      break;
    }

    if (residual > 0) {
      high = xD_guess; // guess was too pure, lower the ceiling
    } else {
      low = xD_guess;  // guess was not pure enough, raise the floor
    }
  }

  // Fallback: If not converged, return final guess if it was close
  if (!solved) {
    // Try to solve at current low/high boundaries
    const finalGuess = 0.5 * (low + high);
    const xB_bal = (F * zF - D * finalGuess) / B;
    const finalRes = solveColumnForxD(finalGuess, inputs, system);
    
    if (finalRes.success && !isNaN(finalRes.xB_calc)) {
      bestResult = packageResult(finalRes.stages, finalGuess, xB_bal, inputs, system);
    } else {
      return {
        success: false,
        stages: [],
        xD: 0,
        xB: 0,
        Qc: 0,
        Qr: 0,
        V_B: 0,
        errorMsg: 'Separation limits exceeded (Column pinched). Raise reflux ratio R.',
        hydraulicStatus: { weepingStages: [], floodingStages: [], weepingWarning: false, floodingWarning: false, averageLoad: 0 }
      };
    }
  }

  return bestResult!;
}

/**
 * Helper to compute heat duties, hydraulic state, and compile the final result object.
 */
function packageResult(
  stages: StageData[],
  xD: number,
  xB: number,
  inputs: SimulationInputs,
  system: ChemicalSystem
): SimulationResult {
  const { R, D, q, F, P } = inputs;

  const V = (R + 1) * D;
  const V_prime = V - (1 - q) * F;
  const B = F - D;

  // Reboiler boilup ratio V_B = V' / B
  const V_B = V_prime / B;

  // Heat duties calculations:
  // We weight latent heat of vaporization by the mole fraction of distillate/bottoms
  const Hvap_dist = xD * system.comp1.Hvap + (1 - xD) * system.comp2.Hvap; // kJ/kmol
  const Hvap_reboiler = xB * system.comp1.Hvap + (1 - xB) * system.comp2.Hvap; // kJ/kmol

  // Qc = V * Hvap_dist (kJ/h). Divide by 3600 to get kW
  const Qc = (V * Hvap_dist) / 3600;
  // Qr = V' * Hvap_reboiler (kJ/h). Divide by 3600 to get kW
  const Qr = (V_prime * Hvap_reboiler) / 3600;

  // Column Tray Hydraulics (Flooding and Weeping check)
  // Volumetric vapor loading is proportional to molar flow V divided by Pressure P.
  // We define a nominal capacity loading index.
  const weepingStages: number[] = [];
  const floodingStages: number[] = [];
  let totalLoad = 0;

  stages.forEach(s => {
    // stage 1 is condenser (no hydraulics), reboiler (no tray hydraulics)
    if (s.stageIndex === 1 || s.stageIndex === stages.length) {
      return;
    }

    // load proxy = V_stage / P * (101.3 / 60)
    const load = (s.flowV / P) * (101.3 / 60);
    totalLoad += load;

    if (load < 0.35) {
      weepingStages.push(s.stageIndex);
    } else if (load > 1.3) {
      floodingStages.push(s.stageIndex);
    }
  });

  const numTrays = stages.length - 2;
  const averageLoad = numTrays > 0 ? totalLoad / numTrays : 1.0;

  return {
    success: true,
    stages,
    xD,
    xB,
    Qc,
    Qr,
    V_B,
    errorMsg: '',
    hydraulicStatus: {
      weepingStages,
      floodingStages,
      weepingWarning: weepingStages.length > 0,
      floodingWarning: floodingStages.length > 0,
      averageLoad,
    }
  };
}
