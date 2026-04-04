import axios from "axios";
import {
  getCachedTraffic,
  setCachedTraffic,
} from "./cacheService";
import { isDemoModeActive, getMockTraffic } from "./mockDataService";

export interface TrafficSnapshot {
  congestionRatio: number;
  currentSpeed: number;
  freeFlowSpeed: number;
  confidence: number;
  roadClosure: boolean;
  roadName: string;
  raw: Record<string, unknown>;
}

function extractRoadName(data: Record<string, unknown>): string {
  const fsd = data.flowSegmentData as Record<string, unknown> | undefined;
  if (!fsd) return "Flow segment";
  for (const k of ["streetName", "roadName", "address", "name"]) {
    const v = fsd[k];
    if (typeof v === "string" && v.length > 0) return v;
  }
  return "Flow segment (TomTom)";
}

export async function fetchTrafficForCoords(
  lat: number,
  lon: number
): Promise<TrafficSnapshot> {
  if (isDemoModeActive()) {
    const mock = getMockTraffic();
    const ratio = Math.min(
      1,
      Math.max(0, mock.congestion)
    );
    console.log(
      `[MOCK TRAFFIC] Scenario: ${mock.scenario} → speed=${mock.currentSpeed} congestion=${Math.round(ratio * 100)}% closure=${mock.roadClosure}`
    );
    return {
      congestionRatio: ratio,
      currentSpeed: mock.currentSpeed,
      freeFlowSpeed: mock.freeFlowSpeed,
      confidence: 1,
      roadClosure: mock.roadClosure,
      roadName: mock.roadClosure ? "Road closed (mock)" : "Mock arterial",
      raw: { mock: true, scenario: mock.scenario },
    };
  }

  const key = `${lat.toFixed(4)},${lon.toFixed(4)}`;
  const cached = getCachedTraffic<TrafficSnapshot>(key);
  if (cached) {
    console.log(`[REAL TRAFFIC] Cache hit ${key}`);
    return cached;
  }
  console.log(`[REAL TRAFFIC] Fetch TomTom ${lat},${lon}`);

  const apiKey = process.env.TOMTOM_API_KEY;
  if (!apiKey) {
    const snapshot: TrafficSnapshot = {
      congestionRatio: 0.35,
      currentSpeed: 35,
      freeFlowSpeed: 45,
      confidence: 0.8,
      roadClosure: false,
      roadName: "Mock road",
      raw: { note: "mock_no_api_key" },
    };
    setCachedTraffic(key, snapshot);
    return snapshot;
  }

  const url =
    "https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json";
  const { data } = await axios.get(url, {
    params: {
      point: `${lat},${lon}`,
      key: apiKey,
    },
  });

  const flow = data as {
    flowSegmentData?: {
      currentSpeed?: number;
      freeFlowSpeed?: number;
      confidence?: number;
      roadClosure?: boolean;
    };
  };

  const current = flow.flowSegmentData?.currentSpeed ?? 40;
  const free = Math.max(flow.flowSegmentData?.freeFlowSpeed ?? current, 1);
  const ratio = Math.min(
    1,
    Math.max(0, 1 - current / free)
  );

  const snapshot: TrafficSnapshot = {
    congestionRatio: ratio,
    currentSpeed: current,
    freeFlowSpeed: free,
    confidence: flow.flowSegmentData?.confidence ?? 0.5,
    roadClosure: Boolean(flow.flowSegmentData?.roadClosure),
    roadName: extractRoadName(data as Record<string, unknown>),
    raw: data as Record<string, unknown>,
  };

  setCachedTraffic(key, snapshot);
  return snapshot;
}
