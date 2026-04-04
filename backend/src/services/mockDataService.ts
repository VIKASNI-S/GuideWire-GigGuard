/** In-memory mock weather/traffic when UI "Demo Mode" toggle is ON. Separate from DEMO_MODE env. */

export type ScenarioKey =
  | "normal"
  | "heavy_rain"
  | "heatwave"
  | "flood"
  | "aqi_crisis"
  | "traffic_jam";

export interface MockWeather {
  rainfallMmLastHour: number;
  temperatureC: number;
  aqi: number;
  windSpeedKmh: number;
  scenario: ScenarioKey;
  description: string;
  triggerType: string;
}

export interface MockTraffic {
  currentSpeed: number;
  freeFlowSpeed: number;
  congestion: number;
  roadClosure: boolean;
  scenario: ScenarioKey;
  description: string;
}

export const MOCK_SCENARIOS: Record<
  ScenarioKey,
  { weather: MockWeather; traffic: MockTraffic }
> = {
  normal: {
    weather: {
      rainfallMmLastHour: 2,
      temperatureC: 28,
      aqi: 55,
      windSpeedKmh: 10,
      scenario: "normal",
      description: "Clear skies, no disruption",
      triggerType: "none",
    },
    traffic: {
      currentSpeed: 42,
      freeFlowSpeed: 50,
      congestion: 0.16,
      roadClosure: false,
      scenario: "normal",
      description: "Light traffic, normal conditions",
    },
  },

  heavy_rain: {
    weather: {
      rainfallMmLastHour: 52,
      temperatureC: 27,
      aqi: 65,
      windSpeedKmh: 38,
      scenario: "heavy_rain",
      description: "Heavy rainfall alert — 52mm/hr detected",
      triggerType: "heavy_rain",
    },
    traffic: {
      currentSpeed: 12,
      freeFlowSpeed: 50,
      congestion: 0.76,
      roadClosure: false,
      scenario: "heavy_rain",
      description: "Severe slowdown due to waterlogging",
    },
  },

  heatwave: {
    weather: {
      rainfallMmLastHour: 0,
      temperatureC: 46,
      aqi: 185,
      windSpeedKmh: 8,
      scenario: "heatwave",
      description: "Extreme heatwave — 46°C, unsafe outdoor conditions",
      triggerType: "extreme_heat",
    },
    traffic: {
      currentSpeed: 38,
      freeFlowSpeed: 50,
      congestion: 0.24,
      roadClosure: false,
      scenario: "heatwave",
      description: "Moderate traffic, workers avoiding peak hours",
    },
  },

  flood: {
    weather: {
      rainfallMmLastHour: 98,
      temperatureC: 25,
      aqi: 72,
      windSpeedKmh: 55,
      scenario: "flood",
      description: "Flash flood warning — 98mm/hr, roads inundated",
      triggerType: "heavy_rain",
    },
    traffic: {
      currentSpeed: 0,
      freeFlowSpeed: 50,
      congestion: 1,
      roadClosure: true,
      scenario: "flood",
      description: "ROAD CLOSED — major arterials flooded",
    },
  },

  aqi_crisis: {
    weather: {
      rainfallMmLastHour: 0,
      temperatureC: 31,
      aqi: 335,
      windSpeedKmh: 4,
      scenario: "aqi_crisis",
      description: "Severe air pollution — AQI 335, hazardous outdoor activity",
      triggerType: "poor_air_quality",
    },
    traffic: {
      currentSpeed: 28,
      freeFlowSpeed: 50,
      congestion: 0.44,
      roadClosure: false,
      scenario: "aqi_crisis",
      description: "Reduced visibility affecting delivery speed",
    },
  },

  traffic_jam: {
    weather: {
      rainfallMmLastHour: 3,
      temperatureC: 30,
      aqi: 70,
      windSpeedKmh: 12,
      scenario: "traffic_jam",
      description: "Normal weather but severe urban congestion",
      triggerType: "peak_hour_traffic",
    },
    traffic: {
      currentSpeed: 6,
      freeFlowSpeed: 50,
      congestion: 0.88,
      roadClosure: false,
      scenario: "traffic_jam",
      description: "Severe traffic jam — major arterial gridlock",
    },
  },
};

let activeScenario: ScenarioKey = "normal";
let demoModeActive = false;

export function getActiveScenario(): ScenarioKey {
  return activeScenario;
}

export function setActiveScenario(scenario: ScenarioKey): void {
  activeScenario = scenario;
  console.log(`[MOCK] Active scenario set to: ${scenario}`);
}

export function isDemoModeActive(): boolean {
  return demoModeActive;
}

export function setDemoMode(active: boolean): void {
  demoModeActive = active;
  if (!active) activeScenario = "normal";
  console.log(`[MOCK] Demo mode: ${active ? "ON" : "OFF"}`);
}

export function getMockWeather(): MockWeather {
  return MOCK_SCENARIOS[activeScenario].weather;
}

export function getMockTraffic(): MockTraffic {
  return MOCK_SCENARIOS[activeScenario].traffic;
}
