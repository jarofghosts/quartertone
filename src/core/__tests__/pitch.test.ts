import { describe, it, expect } from 'vitest'
import {
  EDO,
  A4_STEP,
  NOTE_NAMES_24,
  asciiPcName,
  centsOf,
  midiToStep,
  mod,
  octaveOf,
  parsePcName,
  pcName,
  pitchClass,
  stepName,
  stepToFreq,
  stepToMidi,
} from '../pitch.ts'

describe('pitch basics', () => {
  it('has 24 distinct pitch class names', () => {
    expect(NOTE_NAMES_24).toHaveLength(EDO)
    expect(new Set(NOTE_NAMES_24).size).toBe(EDO)
  })

  it('puts a4 at 440hz', () => {
    expect(stepToFreq(A4_STEP)).toBeCloseTo(440, 10)
  })

  it('doubles frequency every 24 steps', () => {
    expect(stepToFreq(A4_STEP + EDO)).toBeCloseTo(880, 10)
    expect(stepToFreq(A4_STEP - EDO)).toBeCloseTo(220, 10)
  })

  it('makes a quarter tone 50 cents', () => {
    expect(centsOf(1)).toBe(50)
    expect(centsOf(EDO)).toBe(1200)
  })

  it('handles negative steps without sign leakage', () => {
    expect(mod(-1, EDO)).toBe(23)
    expect(pitchClass(-1)).toBe(23)
    expect(pitchClass(-25)).toBe(23)
  })

  it('places middle c at step 120 / octave 4', () => {
    expect(midiToStep(60)).toBe(120)
    expect(octaveOf(120)).toBe(4)
    expect(stepName(120)).toBe('c4')
  })
})

describe('naming', () => {
  it('matches the linnstrument convention', () => {
    // quarter tones are an arrow on the note below, never a flat of the note above
    expect(pcName(3)).toBe('c#↑')
    expect(pcName(7)).toBe('d#↑')
    expect(pcName(9)).toBe('e↑')
  })

  it('offers the maqam half-sharp spelling as an alternate', () => {
    expect(pcName(3, 'quarter')).toBe('d-')
    expect(pcName(1, 'quarter')).toBe('c+')
    expect(pcName(8, 'quarter')).toBe('e')
  })

  it('strips characters that break filenames and urls', () => {
    expect(asciiPcName(3)).toBe('csup')
    expect(asciiPcName(0)).toBe('c')
    for (let pc = 0; pc < EDO; pc++) {
      expect(asciiPcName(pc)).toMatch(/^[a-z]+$/)
    }
    expect(new Set(Array.from({ length: EDO }, (_, i) => asciiPcName(i))).size).toBe(EDO)
  })

  it('round-trips every name in every spelling', () => {
    for (let pc = 0; pc < EDO; pc++) {
      expect(parsePcName(pcName(pc, 'arrows'))).toBe(pc)
      expect(parsePcName(pcName(pc, 'quarter'))).toBe(pc)
      expect(parsePcName(pcName(pc, 'steps'))).toBe(pc)
      expect(parsePcName(asciiPcName(pc))).toBe(pc)
    }
    expect(parsePcName('nonsense')).toBeNull()
  })
})

// this is the contract that stops browser playback and midi export from
// drifting apart. the synth calls stepToFreq; the exporter calls stepToMidi.
// if these two ever disagree, a scale would sound one way in the page and
// another way in the downloaded file.
describe('synth/export pitch agreement', () => {
  it('agrees for every step across the midi range', () => {
    for (let step = 0; step <= 255; step++) {
      const { note, bend } = stepToMidi(step)
      const viaMidi = 440 * Math.pow(2, (note + bend * 0.5 - 69) / 12)
      expect(stepToFreq(step)).toBeCloseTo(viaMidi, 9)
    }
  })

  it('only ever needs two bend states', () => {
    const bends = new Set<number>()
    for (let step = 0; step <= 255; step++) bends.add(stepToMidi(step).bend)
    expect([...bends].sort()).toEqual([0, 1])
  })
})
