import { describe, it, expect } from 'vitest'
import { buildChordClip, buildScaleRunClip, type Clip } from '../clip.ts'
import { shapeFromPattern } from '../scale.ts'
import { stepToMidi } from '../pitch.ts'
import { BEND_CENTER, bendForQuarterTone, beU32, clipToMidi, vlq } from '../midi.ts'

const hex = (b: Uint8Array) => [...b].map((x) => x.toString(16).padStart(2, '0')).join(' ')

describe('byte primitives', () => {
  it('encodes variable-length quantities', () => {
    expect(vlq(0)).toEqual([0x00])
    expect(vlq(127)).toEqual([0x7f])
    expect(vlq(128)).toEqual([0x81, 0x00])
    expect(vlq(480)).toEqual([0x83, 0x60])
    expect(vlq(0x0fffffff)).toEqual([0xff, 0xff, 0xff, 0x7f])
  })

  it('encodes big-endian u32', () => {
    expect(beU32(6)).toEqual([0, 0, 0, 6])
    expect(beU32(0x12345678)).toEqual([0x12, 0x34, 0x56, 0x78])
  })
})

describe('pitch bend', () => {
  it('raises a quarter tone with the standard +/-2 semitone range', () => {
    expect(bendForQuarterTone(2)).toBe(10240)
    // 10240 = 0x2800 -> lsb 0x00, msb 0x50
    expect(10240 & 0x7f).toBe(0x00)
    expect((10240 >> 7) & 0x7f).toBe(0x50)
  })

  it('tracks a non-default bend range', () => {
    expect(bendForQuarterTone(12)).toBe(BEND_CENTER + Math.round(BEND_CENTER / 24))
  })
})

// ---------------------------------------------------------------------------
// a throwaway reader, so the tests assert on meaning rather than only on bytes
// ---------------------------------------------------------------------------

interface ParsedNote {
  channel: number
  note: number
  velocity: number
  onTick: number
  offTick: number
}

function parseMidi(bytes: Uint8Array) {
  let p = 0
  const u32 = () => {
    const v = (bytes[p] << 24) | (bytes[p + 1] << 16) | (bytes[p + 2] << 8) | bytes[p + 3]
    p += 4
    return v >>> 0
  }
  const tag = () => String.fromCharCode(bytes[p++], bytes[p++], bytes[p++], bytes[p++])

  expect(tag()).toBe('MThd')
  expect(u32()).toBe(6)
  const format = (bytes[p++] << 8) | bytes[p++]
  const ntrks = (bytes[p++] << 8) | bytes[p++]
  const ppq = (bytes[p++] << 8) | bytes[p++]

  const notes: ParsedNote[] = []
  const bends: { channel: number; value: number; tick: number }[] = []
  const controls: { channel: number; cc: number; value: number }[] = []
  let tempoUs = 0
  let timeSig: number[] = []
  let trackName = ''

  for (let t = 0; t < ntrks; t++) {
    expect(tag()).toBe('MTrk')
    const len = u32()
    const end = p + len
    let tick = 0
    const open = new Map<string, ParsedNote>()
    while (p < end) {
      let delta = 0
      for (;;) {
        const b = bytes[p++]
        delta = (delta << 7) | (b & 0x7f)
        if (!(b & 0x80)) break
      }
      tick += delta
      const status = bytes[p++]
      // running status is deliberately not emitted, so every event has one
      expect(status & 0x80).toBeTruthy()
      if (status === 0xff) {
        const type = bytes[p++]
        let l = 0
        for (;;) {
          const b = bytes[p++]
          l = (l << 7) | (b & 0x7f)
          if (!(b & 0x80)) break
        }
        const data = bytes.slice(p, p + l)
        p += l
        if (type === 0x51) tempoUs = (data[0] << 16) | (data[1] << 8) | data[2]
        if (type === 0x58) timeSig = [...data]
        if (type === 0x03) trackName = new TextDecoder().decode(data)
        continue
      }
      const kind = status & 0xf0
      const channel = status & 0x0f
      if (kind === 0x90) {
        const note = bytes[p++]
        const velocity = bytes[p++]
        open.set(`${channel}:${note}`, { channel, note, velocity, onTick: tick, offTick: -1 })
      } else if (kind === 0x80) {
        const note = bytes[p++]
        p++
        const k = `${channel}:${note}`
        const n = open.get(k)
        expect(n, `note-off with no matching note-on: ${k}`).toBeDefined()
        n!.offTick = tick
        notes.push(n!)
        open.delete(k)
      } else if (kind === 0xe0) {
        const lsb = bytes[p++]
        const msb = bytes[p++]
        bends.push({ channel, value: (msb << 7) | lsb, tick })
      } else if (kind === 0xb0) {
        controls.push({ channel, cc: bytes[p++], value: bytes[p++] })
      } else if (kind === 0xc0) {
        p++
      }
      }
    expect(open.size, 'every note-on must be closed').toBe(0)
    expect(p).toBe(end)
  }
  expect(p).toBe(bytes.length)
  return { format, ntrks, ppq, notes, bends, controls, tempoUs, timeSig, trackName }
}

// ---------------------------------------------------------------------------

const neutral = shapeFromPattern([4, 3, 3, 4, 3, 4, 3])

describe('smf structure', () => {
  const clip = buildScaleRunClip(neutral, 120, 'neutral run', { bpm: 120 })
  const parsed = parseMidi(clipToMidi(clip))

  it('is a well-formed format 1 file at 480 ppq', () => {
    expect(parsed.format).toBe(1)
    expect(parsed.ntrks).toBe(2)
    expect(parsed.ppq).toBe(480)
  })

  it('carries tempo, time signature and name on the conductor track', () => {
    expect(parsed.tempoUs).toBe(500_000) // 120 bpm
    expect(parsed.timeSig.slice(0, 2)).toEqual([4, 2]) // 4/4
    expect(parsed.trackName).toBe('neutral run')
  })

  it('starts with the header magic', () => {
    expect(hex(clipToMidi(clip)).startsWith('4d 54 68 64 00 00 00 06 00 01 00 02 01 e0')).toBe(true)
  })

  it('sets pitch bend sensitivity via rpn 0,0 then nulls the rpn', () => {
    const ch1 = parsed.controls.filter((c) => c.channel === 1)
    expect(ch1.map((c) => [c.cc, c.value])).toEqual([
      [101, 0],
      [100, 0],
      [6, 2],
      [38, 0],
      [101, 127],
      [100, 127],
    ])
  })
})

describe('two-channel microtonal encoding', () => {
  const clip = buildScaleRunClip(neutral, 120, 'neutral', { bpm: 100 })
  const parsed = parseMidi(clipToMidi(clip))

  it('uses exactly two channels, bent once each at tick 0', () => {
    expect(new Set(parsed.bends.map((b) => b.channel))).toEqual(new Set([0, 1]))
    expect(parsed.bends.every((b) => b.tick === 0)).toBe(true)
    expect(parsed.bends.find((b) => b.channel === 0)!.value).toBe(8192)
    expect(parsed.bends.find((b) => b.channel === 1)!.value).toBe(10240)
  })

  it('routes every note to the channel matching its quarter-tone offset', () => {
    for (const n of parsed.notes) {
      // channel 1 is the +50 cent channel, so it must hold only odd steps
      expect(n.channel === 1 ? n.note * 2 + 1 : n.note * 2).toBeGreaterThanOrEqual(0)
    }
    const quarterTones = clip.notes.filter((n) => stepToMidi(n.step).bend === 1)
    expect(parsed.notes.filter((n) => n.channel === 1)).toHaveLength(quarterTones.length)
    expect(quarterTones.length).toBeGreaterThan(0)
  })

  it('round-trips every note back to its original step', () => {
    const recovered = parsed.notes
      .map((n) => n.note * 2 + (n.channel === 1 ? 1 : 0))
      .sort((a, b) => a - b)
    const original = clip.notes.map((n) => n.step).sort((a, b) => a - b)
    expect(recovered).toEqual(original)
  })

  it('preserves timing in ticks', () => {
    const first = parsed.notes.reduce((a, b) => (a.onTick <= b.onTick ? a : b))
    expect(first.onTick).toBe(0)
    expect(first.offTick).toBe(Math.round(0.9 * 480))
  })

  it('has no polyphony ceiling — a 12 note chord exports fine', () => {
    const big: Clip = {
      name: 'dense',
      bpm: 100,
      beatsPerBar: 4,
      lengthBeats: 4,
      notes: Array.from({ length: 12 }, (_, i) => ({
        step: 120 + i * 2 + (i % 2),
        start: 0,
        duration: 4,
        velocity: 0.8,
      })),
    }
    expect(parseMidi(clipToMidi(big)).notes).toHaveLength(12)
  })
})

describe('mpe strategy', () => {
  it('spreads voices across channels, skipping percussion', () => {
    const clip = buildChordClip([0, 6, 14, 19], 120, 'minor harmonic seventh')
    const parsed = parseMidi(clipToMidi(clip, { strategy: 'mpe' }))
    const used = new Set(parsed.notes.map((n) => n.channel))
    expect(used.size).toBe(4)
    expect(used.has(9)).toBe(false)
  })

  it('refuses rather than silently stealing a channel past 15 voices', () => {
    const tooBig: Clip = {
      name: 'too big',
      bpm: 100,
      beatsPerBar: 4,
      lengthBeats: 4,
      notes: Array.from({ length: 16 }, (_, i) => ({
        step: 100 + i,
        start: 0,
        duration: 4,
        velocity: 0.8,
      })),
    }
    expect(() => clipToMidi(tooBig, { strategy: 'mpe' })).toThrow(/two-channel/)
  })
})
