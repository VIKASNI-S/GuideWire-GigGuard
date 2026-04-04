export type RiskCurrentPayload = {
  environmentalRiskScore: number;
  riskScore: number;
  riskLevel: "Low" | "Medium" | "High";
  rainfall: number;
  temperature: number;
  aqi: number;
  windSpeed: number;
  congestion: number;
  congestionPercent: number;
  roadName: string;
  thresholds: {
    rainfall: number;
    temperature: number;
    aqi: number;
    congestion: number;
    wind: number;
  };
  triggers: {
    rainfall: boolean;
    temperature: boolean;
    aqi: boolean;
    congestion: boolean;
    wind: boolean;
  };
  timestamp: string;
  istHour?: number;
  isPeakTrafficHour?: boolean;
  weather?: { rainfallMmLastHour: number };
  traffic?: unknown;
  city?: string;
};
