export function ConvertEcPhToNPK({
  temperature,
  moisture,
  ec,
  ph,
  soilType,
  actual_n,
  actual_p,
  actual_k,
  n_months_ago
}: SoilParams): { N: number; P: number; K: number } {
  // EC adjustment based on soil type
  let ecAdjustmentFactor: number;
  switch (soilType) {
    case "Sandy":
      ecAdjustmentFactor = 1.1;
      break;
    case "Loamy":
      ecAdjustmentFactor = 1.0;
      break;
    case "Clay":
      ecAdjustmentFactor = 0.85;
      break;
    case "Silty":
      ecAdjustmentFactor = 0.9;
      break;
    case "Peaty":
      ecAdjustmentFactor = 1.1;
      break;
    case "Chalky":
      ecAdjustmentFactor = 0.9;
      break;
    case "Saline":
      ecAdjustmentFactor = 0.6;
      break;
    default:
      ecAdjustmentFactor = 1.0;
  }

  // Adjust EC
  const adjustedEC = ec * ecAdjustmentFactor;

  // Stronger bias factor calculation (non-linear, stronger towards lab data)
  const alpha = n_months_ago ? Math.max(0.1, Math.exp(-0.3 * n_months_ago)) : 0.5;

  // pH adjustments
  const pHAdjustmentN = ph >= 6 ? 10 * (ph - 6) : 0;
  const pHAdjustmentP = ph >= 6 ? 15 * (ph - 6) : 0;
  const pHAdjustmentK = ph >= 6 ? 5 * (ph - 6) : 0;

  // Formula-based estimates (from EC, moisture, pH)
  let estimatedN = 0.1 * adjustedEC + 0.5 * moisture + pHAdjustmentN;
  let estimatedP = 0.05 * adjustedEC + 0.2 * moisture + pHAdjustmentP;
  let estimatedK = 0.2 * adjustedEC + 0.3 * moisture + pHAdjustmentK;

  // Ensure estimated values are not negative
  estimatedN = Math.max(0, estimatedN);
  estimatedP = Math.max(0, estimatedP);
  estimatedK = Math.max(0, estimatedK);

  // If lab data is provided, bias the calculation towards those values
  const N = actual_n !== undefined ? alpha * estimatedN + (1 - alpha) * actual_n : estimatedN;
  const P = actual_p !== undefined ? alpha * estimatedP + (1 - alpha) * actual_p : estimatedP;
  const K = actual_k !== undefined ? alpha * estimatedK + (1 - alpha) * actual_k : estimatedK;

  // Return the estimated NPK values
  return {
    N: parseFloat(N.toFixed(2)),
    P: parseFloat(P.toFixed(2)),
    K: parseFloat(K.toFixed(2))
  };
}
