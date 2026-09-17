import { describe, it, expect } from 'vitest'
import { shapeFromPattern } from '../scale.ts'
import { EDO, mod } from '../pitch.ts'
import { makeRng, randomSeed } from '../random.ts'
import { DEFAULT_MELODY, buildMelodyClip, decodeMelodyParams, encodeMelodyParams } from '../melody.ts'
import { maxPolyphony } from '../clip.ts'

const neutral = shapeFromPattern([4, 3, 3, 4, 3, 4, 3])
const params = { ...DEFAULT_MELODY, seed: 'abc123' }

describe('seeded rng', () => {
  it('is deterministic per seed', () => {
    const a = Array.from({ length: 20 }, () => makeRng('x').next())
    const b = Array.from({ length: 20 }, () => makeRng('x').next())
    expect(a).toEqual(b)
  })

  it('differs between seeds', () => {
    expect(makeRng('x').next()).not.toBe(makeRng('y').next())
  })

  it('stays in range', () => {
    const rng = makeRng('range')
    for (let i = 0; i < 500; i++) {
      const v = rng.next()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
      expect(rng.int(7)).toBeLessThan(7)
    }
  })

  it('generates url-safe seeds', () => {
    for (let i = 0; i < 20; i++) expect(randomSeed()).toMatch(/^[a-z0-9]{8}$/)
  })
})

describe('melody generation', () => {
  it('is reproducible from the seed alone', () => {
    const a = buildMelodyClip(params, neutral, 120, 'm')
    const b = buildMelodyClip(params, neutral, 120, 'm')
    expect(a).toEqual(b)
  })

  it('changes when the seed changes', () => {
    const a = buildMelodyClip(params, neutral, 120, 'm')
    const b = buildMelodyClip({ ...params, seed: 'different' }, neutral, 120, 'm')
    expect(a.notes).not.toEqual(b.notes)
  })

  it('only uses pitch classes from the scale', () => {
    const inScale = new Set(neutral.degrees)
    for (const seed of ['a', 'b', 'c', 'd', 'e']) {
      const clip = buildMelodyClip({ ...params, seed }, neutral, 120, 'm')
      expect(clip.notes.length).toBeGreaterThan(0)
      for (const n of clip.notes) expect(inScale.has(mod(n.step - 120, EDO))).toBe(true)
    }
  })

  it('is monophonic and stays inside the bar count', () => {
    const clip = buildMelodyClip(params, neutral, 120, 'm')
    expect(maxPolyphony(clip)).toBe(1)
    for (const n of clip.notes) expect(n.start).toBeLessThan(clip.lengthBeats)
    expect(clip.lengthBeats).toBe(params.bars * params.beatsPerBar)
  })

  it('respects the octave range', () => {
    const clip = buildMelodyClip({ ...params, octaves: 1 }, neutral, 120, 'm')
    for (const n of clip.notes) {
      expect(n.step).toBeGreaterThanOrEqual(120)
      expect(n.step).toBeLessThan(120 + EDO)
    }
  })
})

describe('melody url state', () => {
  it('round-trips', () => {
    expect(decodeMelodyParams(encodeMelodyParams(params))).toEqual(params)
  })

  it('falls back on missing or junk values instead of throwing', () => {
    const p = decodeMelodyParams({ bars: 'banana', bpm: undefined, sub: '99' })
    expect(p.bars).toBe(DEFAULT_MELODY.bars)
    expect(p.bpm).toBe(DEFAULT_MELODY.bpm)
    expect(p.subdivision).toBe(DEFAULT_MELODY.subdivision)
  })

  it('clamps out-of-range values', () => {
    const p = decodeMelodyParams({ bars: '9999', den: '5', bpm: '1' })
    expect(p.bars).toBe(8)
    expect(p.density).toBe(1)
    expect(p.bpm).toBe(20)
  })
})
