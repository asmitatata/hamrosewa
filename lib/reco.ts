import { CITIES } from "@/lib/constants";
import type { ProviderDoc, UserSignal } from "@/lib/types";

export type ScoredWorker = {
  uid: string;
  name?: string;
  city?: string;
  primaryService?: string;
  ratingAvg?: number;
  ratingCount?: number;
  score: number;
};

// Haversine distance in km between two lat/lng
function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(x: number) {
  return (x * Math.PI) / 180;
}

// Choose k using a tiny heuristic similar to the Python script
function chooseK(n: number): number {
  if (n <= 2) return 1;
  if (n <= 6) return 2;
  return 3; // modest default for small datasets
}

// Simple KMeans implementation for small n and low dimensions (lat,lng,ratingWeighted)
function kmeans(
  X: number[][],
  k: number,
  opts: { maxIter?: number; seed?: number } = {}
): { labels: number[]; centroids: number[][] } {
  const maxIter = opts.maxIter ?? 50;
  if (k <= 1 || X.length === 0) return { labels: X.map(() => 0), centroids: [meanVec(X)] };

  // Initialize centroids by picking k distinct points
  const rng = mulberry32((opts.seed ?? 42) >>> 0);
  const indices = Array.from({ length: X.length }, (_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  let centroids = indices.slice(0, Math.min(k, X.length)).map((i) => X[i].slice());

  let labels = new Array<number>(X.length).fill(0);
  for (let iter = 0; iter < maxIter; iter++) {
    // Assign
    let changed = false;
    for (let i = 0; i < X.length; i++) {
      const dists = centroids.map((c) => sqDist(X[i], c));
      const best = argmin(dists);
      if (labels[i] !== best) {
        labels[i] = best;
        changed = true;
      }
    }
    // Recompute centroids
    const groups: number[][][] = Array.from({ length: centroids.length }, () => []);
    for (let i = 0; i < X.length; i++) groups[labels[i]].push(X[i]);
    const newCentroids = groups.map((g, idx) => (g.length ? meanVec(g) : centroids[idx]));
    // Check convergence
    let moved = false;
    for (let i = 0; i < centroids.length; i++) {
      if (sqDist(centroids[i], newCentroids[i]) > 1e-10) { moved = true; break; }
    }
    centroids = newCentroids;
    if (!changed || !moved) break;
  }
  return { labels, centroids };
}

function meanVec(points: number[][]): number[] {
  if (points.length === 0) return [0, 0, 0];
  const m = points[0].length;
  const sums = new Array(m).fill(0);
  for (const p of points) for (let i = 0; i < m; i++) sums[i] += p[i];
  return sums.map((s) => s / points.length);
}

function sqDist(a: number[], b: number[]) {
  let s = 0;
  for (let i = 0; i < a.length; i++) { const d = a[i] - b[i]; s += d * d; }
  return s;
}

function argmin(arr: number[]) {
  let idx = 0;
  for (let i = 1; i < arr.length; i++) if (arr[i] < arr[idx]) idx = i;
  return idx;
}

function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function scoreWorkers(
  workers: Array<{ uid: string; name?: string; city?: string; primaryService?: string; ratingAvg?: number; ratingCount?: number }>,
  opts: { city?: keyof typeof CITIES; service?: string }
): ScoredWorker[] {
  const targetCity = opts.city;
  const maxDistanceKm = 25; // cap for normalization across valley
  return workers.map((w) => {
    const rating = Math.max(0, Math.min(5, w.ratingAvg ?? 0));
    const ratingNorm = rating / 5; // 0..1

    let distanceKm = 0;
    if (targetCity) {
      const tgt = CITIES[targetCity];
      if (w.city && w.city in CITIES) {
        const wc = CITIES[w.city as keyof typeof CITIES];
        distanceKm = haversine(tgt.lat, tgt.lng, wc.lat, wc.lng);
      } else {
        // unknown worker city -> penalize
        distanceKm = maxDistanceKm;
      }
    }

    const distanceNorm = Math.max(0, Math.min(1, distanceKm / maxDistanceKm));
    // weights: prioritize rating, then distance
    const score = 0.7 * ratingNorm + 0.3 * (1 - distanceNorm);

    return { ...w, score } as ScoredWorker;
  }).sort((a, b) => b.score - a.score);
}

// Personalized scoring with signals and provider attributes
export function rankProviders(
  providers: ProviderDoc[],
  opts: { city?: keyof typeof CITIES; service?: string; signals?: UserSignal[] }
): Array<ProviderDoc & { score: number }> {
  // Build feature vectors: [lat, lng, ratingWeighted]
  const rows = providers.map((p) => {
    const base = CITIES[p.city as keyof typeof CITIES];
    const lat = p.lat ?? base?.lat;
    const lng = p.lng ?? base?.lng;
    const rating = Math.max(0, Math.min(5, p.ratingAvg ?? 0));
    const ratingCount = Math.max(0, p.ratingCount ?? 0);
    const ratingWeighted = rating * Math.min(1, ratingCount / 20);
    return { p, lat: lat ?? 0, lng: lng ?? 0, rating, ratingCount, ratingWeighted };
  });

  const X = rows.map((r) => [r.lat, r.lng, r.ratingWeighted]);
  const k = chooseK(X.length);
  const { labels, centroids } = kmeans(X, k, { seed: 42 });

  // Nearest cluster to selected city center (only if city is provided)
  const targetCity = opts.city as keyof typeof CITIES | undefined;
  const tgt = targetCity ? CITIES[targetCity] : undefined;
  let subset: Array<ReturnType<typeof Object.assign> & { cluster: number }>; // typed loosely for brevity
  const items = rows.map((r, i) => ({ ...r, cluster: labels[i] }));
  if (tgt && centroids.length) {
    const dists = centroids.map((c) => haversine(tgt.lat, tgt.lng, c[0], c[1]));
    const targetCluster = argmin(dists);
    subset = items.filter((r) => r.cluster === targetCluster);
    if (subset.length === 0) subset = items; 
  } else {
    // No city provided -> score across all items (no cluster restriction)
    subset = items;
  }

  // Normalize distance and rating
  const maxDistanceKm = 25;
  const scored = subset.map((r) => {
    let distanceKm = 0;
    if (tgt) distanceKm = haversine(tgt.lat, tgt.lng, r.lat, r.lng);
    const distanceNorm = Math.max(0, Math.min(1, distanceKm / maxDistanceKm));
    const ratingNorm = r.rating / 5;
    const score = 0.7 * ratingNorm + 0.3 * (1 - distanceNorm);
    return { ...r.p, score } as ProviderDoc & { score: number };
  });

  return scored.sort((a, b) => b.score - a.score);
}

export async function rankProvidersViaAPI(
  providers: ProviderDoc[],
  opts: { city?: keyof typeof CITIES; service?: string }
): Promise<Array<ProviderDoc & { score: number }>> {
  try {
    const res = await fetch("/api/recommend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ providers, city: opts.city, service: opts.service }),
    });
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();
    return (data.items || []) as Array<ProviderDoc & { score: number }>;
  } catch {
    // Fallback to local scoring if API is unavailable
    return rankProviders(providers, { city: opts.city, service: opts.service });
  }
}
