/**
 * Mulberry32 deterministic PRNG so train/test splits are 100% reproducible from a user seed.
 */
export function createSeededRng(seed: number): () => number {
  let a = Math.floor(seed) >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seededShuffleIndices(length: number, seed: number): number[] {
  const rng = createSeededRng(seed);
  const indices = Array.from({ length }, (_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = indices[i];
    indices[i] = indices[j];
    indices[j] = tmp;
  }
  return indices;
}

export function createNormalSampler(seed: number): () => number {
  const rng = createSeededRng(seed);
  let spare: number | null = null;
  return () => {
    if (spare !== null) {
      const val = spare;
      spare = null;
      return val;
    }
    let u = 0;
    let v = 0;
    while (u === 0) u = rng();
    while (v === 0) v = rng();
    const mag = Math.sqrt(-2.0 * Math.log(u));
    spare = mag * Math.sin(2.0 * Math.PI * v);
    return mag * Math.cos(2.0 * Math.PI * v);
  };
}
