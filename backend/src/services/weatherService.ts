import axios from "axios";
import {
  getCachedWeather,
  setCachedWeather,
} from "./cacheService";
import { isDemoModeActive, getMockWeather } from "./mockDataService";

export interface WeatherSnapshot {
  rainfallMmLastHour: number;
  temperatureC: number;
  aqi: number;
  windSpeedKmh: number;
  rawWeather: Record<string, unknown>;
  rawAir: Record<string, unknown>;
}

function aqiFromOpenWeatherMain(mainAqi: number): number {
  const map: Record<number, number> = {
    1: 40,
    2: 90,
    3: 140,
    4: 220,
    5: 380,
  };
  return map[mainAqi] ?? 150;
}

export async function fetchWeatherForCoords(
  lat: number,
  lon: number
): Promise<WeatherSnapshot> {
  if (isDemoModeActive()) {
    const mock = getMockWeather();
    console.log(
      `[MOCK WEATHER] Scenario: ${mock.scenario} → rain=${mock.rainfallMmLastHour}mm temp=${mock.temperatureC}°C aqi=${mock.aqi} wind=${mock.windSpeedKmh}`
    );
    return {
      rainfallMmLastHour: mock.rainfallMmLastHour,
      temperatureC: mock.temperatureC,
      aqi: mock.aqi,
      windSpeedKmh: mock.windSpeedKmh,
      rawWeather: { mock: true, scenario: mock.scenario },
      rawAir: {},
    };
  }

  const key = `${lat.toFixed(4)},${lon.toFixed(4)}`;
  const cached = getCachedWeather<WeatherSnapshot>(key);
  if (cached) {
    console.log(`[REAL WEATHER] Cache hit ${key}`);
    return cached;
  }
  console.log(`[REAL WEATHER] Fetch OpenWeatherMap ${lat},${lon}`);

  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey) {
    const snapshot: WeatherSnapshot = {
      rainfallMmLastHour: 2,
      temperatureC: 31,
      aqi: 120,
      windSpeedKmh: 12,
      rawWeather: { note: "mock_no_api_key" },
      rawAir: {},
    };
    setCachedWeather(key, snapshot);
    return snapshot;
  }

  const [weatherRes, airRes] = await Promise.all([
    axios.get("https://api.openweathermap.org/data/2.5/weather", {
      params: { lat, lon, appid: apiKey, units: "metric" },
    }),
    axios.get("https://api.openweathermap.org/data/2.5/air_pollution", {
      params: { lat, lon, appid: apiKey },
    }),
  ]);

  const w = weatherRes.data as {
    rain?: { "1h"?: number };
    main?: { temp?: number };
    wind?: { speed?: number };
  };

  const rain1h = w.rain?.["1h"] ?? 0;
  const temp = w.main?.temp ?? 28;
  const windMs = w.wind?.speed ?? 0;
  const windKmh = windMs * 3.6;

  const air = airRes.data as {
    list?: Array<{ main?: { aqi?: number } }>;
  };
  const mainAqi = air.list?.[0]?.main?.aqi ?? 2;
  const aqi = aqiFromOpenWeatherMain(mainAqi);

  const snapshot: WeatherSnapshot = {
    rainfallMmLastHour: rain1h,
    temperatureC: temp,
    aqi,
    windSpeedKmh: windKmh,
    rawWeather: weatherRes.data as Record<string, unknown>,
    rawAir: airRes.data as Record<string, unknown>,
  };

  setCachedWeather(key, snapshot);
  return snapshot;
}

/** Three nearby points (small offsets) for fraud cross-check */
export async function fetchWeatherTriangulation(
  lat: number,
  lon: number
): Promise<number[]> {
  const offsets = [
    [0, 0],
    [0.02, 0],
    [-0.02, 0.01],
  ] as const;
  const rains: number[] = [];
  for (const [dlat, dlon] of offsets) {
    const s = await fetchWeatherForCoords(lat + dlat, lon + dlon);
    rains.push(s.rainfallMmLastHour);
  }
  return rains;
}
