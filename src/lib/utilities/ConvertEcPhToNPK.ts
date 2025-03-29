export interface SensorData {
  ec_uS_cm: number; // EC in µS/cm
  vwc: number;      // Volumetric water content in %
  ph: number;       // pH value
}

export interface EstimatedNPK {
  nitrogen_mgkg: number;
  phosphorus_mgkg: number;
  potassium_mgkg: number;
}

export function estimateNPK({ ec_uS_cm, vwc, ph }: SensorData): EstimatedNPK {
  // --- NITROGEN ---
  let nitrogen = 0;
  if (ec_uS_cm < 150) nitrogen = 10;
  else if (ec_uS_cm < 300) nitrogen = 20;
  else nitrogen = 40;

  // Penalize nitrogen if soil is very wet (leaching)
  if (vwc > 80) nitrogen *= 0.75;

  // --- PHOSPHORUS ---
  let phosphorus = 0;
  if (ph < 5.5) phosphorus = 8; // poor availability at low pH
  else if (ph < 6.5) phosphorus = 15;
  else phosphorus = 25;

  // --- POTASSIUM ---
  let potassium = 0;
  if (ec_uS_cm < 150) potassium = 30;
  else if (ec_uS_cm < 300) potassium = 45;
  else potassium = 60;

  // Boost K if soil is wet (K is mobile and more available)
  if (vwc > 70) potassium *= 1.1;

  return {
    nitrogen_mgkg: Math.round(nitrogen),
    phosphorus_mgkg: Math.round(phosphorus),
    potassium_mgkg: Math.round(potassium),
  };
}
