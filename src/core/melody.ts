import { EDO } from './pitch.ts'
import { makeRng } from './random.ts'
import type { Clip, NoteEvent } from './clip.ts'
import type { ScaleShape } from './scale.ts'

export interface MelodyParams {
  seed: string
  bars: number
  bpm: number
  beatsPerBar: number
  /** slots per beat */
  subdivision: 1 | 2 | 3 | 4
  /** 0..1 — chance a slot starts a note */
  density: number
  /** how far the walk may leap, in scale degrees */
  maxLeap: number
  /** octaves above the root the melody may reach */
  octaves: number
  /** 0..1 — extra pull back toward the tonic */
  rootBias: number
  /** 0..1 — note length as a fraction of the gap to the next onset */
  legato: number
}

export const DEFAULT_MELODY: Omit<MelodyParams, 'seed'> = {
  bars: 2,
  bpm: 100,
  beatsPerBar: 4,
  subdivision: 2,
  density: 0.65,
  maxLeap: 3,
  octaves: 2,
  rootBias: 0.2,
  legato: 0.9,
}

/**
 * a melody is a pure function of (params, shape, rootStep). nothing is sampled
 * from the clock or Math.random, so the same seed always yields the same notes
 * — which is what makes a shared url reproduce a clip exactly.
 */
export function buildMelodyClip(
  params: MelodyParams,
  shape: ScaleShape,
  rootStep: number,
  name: string,
): Clip {
  const rng = makeRng(params.seed)
  const degrees = shape.degrees
  const span = degrees.length * params.octaves

  const slots = params.bars * params.beatsPerBar * params.subdivision
  const slotBeats = 1 / params.subdivision

  // walk over a degree index that runs across octaves, so index d maps to
  // degree (d mod n) in octave floor(d / n)
  let cursor = rng.int(Math.max(1, degrees.length))
  const onsets: { slot: number; index: number }[] = []

  for (let slot = 0; slot < slots; slot++) {
    if (!rng.chance(params.density)) continue
    const leap = rng.int(params.maxLeap) + 1
    const dir = rng.chance(0.5) ? 1 : -1
    let next = cursor + leap * dir
    if (rng.chance(params.rootBias)) next = Math.round(next / degrees.length) * degrees.length
    cursor = Math.max(0, Math.min(span - 1, next))
    onsets.push({ slot, index: cursor })
  }

  const notes: NoteEvent[] = onsets.map((o, i) => {
    const nextSlot = i + 1 < onsets.length ? onsets[i + 1].slot : slots
    const gap = (nextSlot - o.slot) * slotBeats
    const octave = Math.floor(o.index / degrees.length)
    return {
      step: rootStep + degrees[o.index % degrees.length] + octave * EDO,
      start: o.slot * slotBeats,
      duration: Math.max(slotBeats * 0.5, gap * params.legato),
      velocity: 0.6 + rng.next() * 0.35,
    }
  })

  return {
    name,
    bpm: params.bpm,
    beatsPerBar: params.beatsPerBar,
    lengthBeats: params.bars * params.beatsPerBar,
    notes,
  }
}

/** compact url encoding, so the browser address bar is the share link. */
export function encodeMelodyParams(p: MelodyParams): Record<string, string> {
  return {
    seed: p.seed,
    bars: String(p.bars),
    bpm: String(p.bpm),
    sub: String(p.subdivision),
    den: p.density.toFixed(2),
    leap: String(p.maxLeap),
    oct: String(p.octaves),
    bias: p.rootBias.toFixed(2),
    leg: p.legato.toFixed(2),
  }
}

/** tolerant of missing or malformed values — anything unparseable falls back. */
export function decodeMelodyParams(q: Record<string, string | undefined>): MelodyParams {
  const num = (v: string | undefined, fallback: number) => {
    const n = Number(v)
    return Number.isFinite(n) ? n : fallback
  }
  const sub = num(q.sub, DEFAULT_MELODY.subdivision)
  return {
    seed: q.seed && q.seed.length > 0 ? q.seed : 'quarter',
    bars: Math.max(1, Math.min(8, Math.round(num(q.bars, DEFAULT_MELODY.bars)))),
    bpm: Math.max(20, Math.min(300, Math.round(num(q.bpm, DEFAULT_MELODY.bpm)))),
    beatsPerBar: DEFAULT_MELODY.beatsPerBar,
    subdivision: ([1, 2, 3, 4].includes(sub) ? sub : DEFAULT_MELODY.subdivision) as 1 | 2 | 3 | 4,
    density: clamp01(num(q.den, DEFAULT_MELODY.density)),
    maxLeap: Math.max(1, Math.min(8, Math.round(num(q.leap, DEFAULT_MELODY.maxLeap)))),
    octaves: Math.max(1, Math.min(4, Math.round(num(q.oct, DEFAULT_MELODY.octaves)))),
    rootBias: clamp01(num(q.bias, DEFAULT_MELODY.rootBias)),
    legato: clamp01(num(q.leg, DEFAULT_MELODY.legato)),
  }
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n))
}
