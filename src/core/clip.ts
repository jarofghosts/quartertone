import type { Step } from './pitch.ts'
import { toAbsoluteSteps, type ScaleShape } from './scale.ts'

/**
 * a note event. pitch is one integer — never a frequency, never a
 * (midi note, bend) pair.
 *
 * the synth calls stepToFreq, the exporter calls stepToMidi, and neither is
 * allowed to invent its own mapping. that is what stops what you hear in the
 * page from differing from what lands in the .mid file.
 */
export interface NoteEvent {
  readonly step: Step
  /** beats from clip start */
  readonly start: number
  readonly duration: number
  /** 0..1 — the synth wants a gain, midi wants 1..127 */
  readonly velocity: number
}

export interface Clip {
  readonly name: string
  readonly bpm: number
  readonly beatsPerBar: number
  /** may exceed the last note's end, to allow trailing silence */
  readonly lengthBeats: number
  readonly notes: readonly NoteEvent[]
}

export function beatsToSeconds(beats: number, bpm: number): number {
  return (beats * 60) / bpm
}

export function clipSeconds(clip: Clip): number {
  return beatsToSeconds(clip.lengthBeats, clip.bpm)
}

export function sortedNotes(clip: Clip): NoteEvent[] {
  return [...clip.notes].sort((a, b) => a.start - b.start || a.step - b.step)
}

export function transposeClip(clip: Clip, deltaSteps: number): Clip {
  return { ...clip, notes: clip.notes.map((n) => ({ ...n, step: n.step + deltaSteps })) }
}

/** peak simultaneous voices — useful for warning before an mpe export. */
export function maxPolyphony(clip: Clip): number {
  const edges = clip.notes.flatMap((n) => [
    { t: n.start, d: 1 },
    { t: n.start + n.duration, d: -1 },
  ])
  edges.sort((a, b) => a.t - b.t || a.d - b.d)
  let cur = 0
  let peak = 0
  for (const e of edges) {
    cur += e.d
    peak = Math.max(peak, cur)
  }
  return peak
}

export interface ClipOptions {
  bpm?: number
  beatsPerBar?: number
  velocity?: number
}

const DEFAULTS = { bpm: 100, beatsPerBar: 4, velocity: 0.8 }

/** every note of the scale sounding together for one bar, plus the octave. */
export function buildScaleChordClip(
  shape: ScaleShape,
  rootStep: Step,
  name: string,
  opts: ClipOptions = {},
): Clip {
  const { bpm, beatsPerBar, velocity } = { ...DEFAULTS, ...opts }
  const steps = [...toAbsoluteSteps(shape, rootStep), rootStep + 24]
  return {
    name,
    bpm,
    beatsPerBar,
    lengthBeats: beatsPerBar,
    notes: steps.map((step) => ({ step, start: 0, duration: beatsPerBar, velocity })),
  }
}

/** the scale played up and back down, one note per beat — an audition. */
export function buildScaleRunClip(
  shape: ScaleShape,
  rootStep: Step,
  name: string,
  opts: ClipOptions & { descend?: boolean } = {},
): Clip {
  const { bpm, beatsPerBar, velocity } = { ...DEFAULTS, ...opts }
  const up = [...toAbsoluteSteps(shape, rootStep), rootStep + 24]
  const seq = opts.descend === false ? up : [...up, ...up.slice(0, -1).reverse()]
  return {
    name,
    bpm,
    beatsPerBar,
    lengthBeats: seq.length,
    notes: seq.map((step, i) => ({ step, start: i, duration: 0.9, velocity })),
  }
}

/** a single chord voicing, given as offsets in 24edo steps from its root. */
export function buildChordClip(
  offsets: readonly number[],
  rootStep: Step,
  name: string,
  opts: ClipOptions & { bars?: number } = {},
): Clip {
  const { bpm, beatsPerBar, velocity } = { ...DEFAULTS, ...opts }
  const lengthBeats = beatsPerBar * (opts.bars ?? 1)
  return {
    name,
    bpm,
    beatsPerBar,
    lengthBeats,
    notes: offsets.map((o) => ({
      step: rootStep + o,
      start: 0,
      duration: lengthBeats,
      velocity,
    })),
  }
}
