export type SoilType = "Sandy" | "Loamy" | "Clay" | "Silty" | "Peaty" | "Chalky" | "Saline";

export interface SoilParams {
  temperature: number; // in Celsius
  moisture: number;    // as a percentage
  ec: number;          // in μS/cm
  ph: number;          // pH level
  soilType: SoilType;  // Type of soil
  actual_n?: number;    // Nitrogen (N) value from lab report (optional)
  actual_p?: number;    // Phosphorus (P) value from lab report (optional)
  actual_k?: number;    // Potassium (K) value from lab report (optional)
  n_months_ago?: number; // How many months ago the lab test occurred (optional)
}

export function estimateNPK({
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
      ecAdjustmentFactor = 1.0; // Default to no adjustment if not specified
  }

  // Adjust EC
  const adjustedEC = ec * ecAdjustmentFactor;

  // Stronger bias factor calculation (non-linear, stronger towards lab data)
  const alpha = n_months_ago ? Math.max(0.1, Math.exp(-0.3 * n_months_ago)) : 0.5;

  // Formula-based estimates (from EC, moisture, pH)
  const estimatedN = 0.1 * adjustedEC + 0.5 * moisture + 10 * (ph - 6);
  const estimatedP = 0.05 * adjustedEC + 0.2 * moisture + 15 * (ph - 6);
  const estimatedK = 0.2 * adjustedEC + 0.3 * moisture + 5 * (ph - 6);

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

// // Example usage:
// const result = estimateNPK({
//   temperature: 22.9,
//   moisture: 37.5,
//   ec: 1137,
//   ph: 6.19,
//   soilType: "Clay",
//   actual_n: 120,
//   actual_p: 60,
//   actual_k: 200,
//   n_months_ago: 2
// });

// console.log(result); // Example output with stronger bias
