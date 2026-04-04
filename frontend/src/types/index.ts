export interface UserSummary {
  id: string;
  email: string;
  fullName: string;
}

export interface PlanRow {
  id: string;
  name: string;
  weeklyPremium: string;
  rainfallTriggerMm: string;
  payoutAmount: string;
  heatTriggerCelsius: string | null;
  aqiTrigger: number | null;
  trafficCongestionTrigger: string | null;
  features: Record<string, unknown> | null;
  isActive: boolean | null;
}

export interface PolicyRow {
  id: string;
  userId: string;
  planId: string | null;
  status: string | null;
  startDate: string;
  endDate: string;
  weeklyPremium: string;
  adjustedPremium: string | null;
  riskScore: number | null;
  lastPayoutAt: string | null;
  createdAt: string | null;
}

export interface PayoutHistoryRow {
  id: string;
  userId: string | null;
  amount: string | null;
  reason: string | null;
  status: string | null;
  createdAt: string | null;
}

export interface RiskScores {
  environmental: number;
  behavior: number;
  location: number;
  activity: number;
  trust: number;
  overall: number;
}
