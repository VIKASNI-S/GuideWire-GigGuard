const weatherCache = new Map<string, { at: number; data: unknown }>();
const trafficCache = new Map<string, { at: number; data: unknown }>();

const TTL_MS = 8 * 60 * 1000;

export function getCachedWeather<T>(key: string): T | null {
  const hit = weatherCache.get(key);
  if (!hit || Date.now() - hit.at > TTL_MS) return null;
  return hit.data as T;
}

export function setCachedWeather(key: string, data: unknown): void {
  weatherCache.set(key, { at: Date.now(), data });
}

export function getCachedTraffic<T>(key: string): T | null {
  const hit = trafficCache.get(key);
  if (!hit || Date.now() - hit.at > TTL_MS) return null;
  return hit.data as T;
}

export function setCachedTraffic(key: string, data: unknown): void {
  trafficCache.set(key, { at: Date.now(), data });
}
