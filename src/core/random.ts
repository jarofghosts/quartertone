/**
 * a small seeded prng, so a melody is reproducible from its seed alone and a
 * shared link always regenerates the same clip. Math.random is never used in
 * core/ for exactly this reason.
 */
export interface Rng {
  next(): number
  int(maxExclusive: number): number
  pick<T>(xs: readonly T[]): T
  chance(p: number): boolean
}

/** xmur3 string hash — turns a seed string into a well-mixed 32-bit state. */
function xmur3(str: string): () => number {
  let h = 1779033703 ^ str.length
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507)
    h = Math.imul(h ^ (h >>> 13), 3266489909)
    h ^= h >>> 16
    return h >>> 0
  }
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function makeRng(seed: string): Rng {
  const next = mulberry32(xmur3(seed)())
  return {
    next,
    int: (maxExclusive) => Math.floor(next() * maxExclusive),
    pick: (xs) => xs[Math.floor(next() * xs.length)],
    chance: (p) => next() < p,
  }
}

/** eight lowercase base36 characters — short enough to live in a url. */
export function randomSeed(): string {
  let s = ''
  for (let i = 0; i < 8; i++) s += Math.floor(Math.random() * 36).toString(36)
  return s
}
