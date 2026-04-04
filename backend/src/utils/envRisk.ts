export interface EnvRiskInput {
  currentRainfallMm: number;
  planRainfallThresholdMm: number;
  currentTempC: number;
  currentAqi: number;
  windSpeedKmh: number;
}

/** Composite environmental risk 0–100 per product spec */
export function computeEnvironmentalRisk(input: EnvRiskInput): number {
  const {
    currentRainfallMm,
    planRainfallThresholdMm,
    currentTempC,
    currentAqi,
    windSpeedKmh,
  } = input;

  const rainfallScore = Math.min(
    100,
    (currentRainfallMm / Math.max(planRainfallThresholdMm, 0.1)) * 50
  );
  const tempScore = Math.max(0, (currentTempC - 35) * 5);
  const aqiScore = Math.min(100, (currentAqi / 500) * 100);
  const windScore = Math.min(100, (windSpeedKmh / 80) * 100);

  return (
    rainfallScore * 0.4 +
    tempScore * 0.25 +
    aqiScore * 0.25 +
    windScore * 0.1
  );
}

export function riskLevelLabel(score: number): "Low" | "Medium" | "High" {
  if (score <= 35) return "Low";
  if (score <= 65) return "Medium";
  return "High";
}
