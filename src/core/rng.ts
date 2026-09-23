// Deterministic xorshift32 RNG — no Math.random() usage.
export function createRng(seed: number): () => number {
  let s = seed | 0;
  if (s === 0) s = 0x6d0b_5e17;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return (s >>> 0) / 4294967296;
  };
}

export function clamp01(v: number): number {
  if (v <= 0) return 0;
  if (v >= 1) return 1;
  return v;
}
