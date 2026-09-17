import { sortedNotes, type Clip } from './clip.ts'
import { stepToMidi } from './pitch.ts'

// ---------------------------------------------------------------------------
// byte primitives
// ---------------------------------------------------------------------------

/** variable-length quantity: 7 bits per byte, big-endian, continuation bit set
    on every byte but the last. */
export function vlq(value: number): number[] {
  if (value < 0) throw new Error(`vlq cannot encode ${value}`)
  const out = [value & 0x7f]
  let v = value >>> 7
  while (v > 0) {
    out.unshift((v & 0x7f) | 0x80)
    v >>>= 7
  }
  return out
}

export function beU32(n: number): number[] {
  return [(n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff]
}

function ascii(s: string): number[] {
  return [...s].map((c) => c.charCodeAt(0))
}

function chunk(type: string, data: number[]): number[] {
  return [...ascii(type), ...beU32(data.length), ...data]
}

function textMeta(type: number, text: string): number[] {
  const bytes = [...new TextEncoder().encode(text)]
  return [0xff, type, ...vlq(bytes.length), ...bytes]
}

// ---------------------------------------------------------------------------
// track assembly
// ---------------------------------------------------------------------------

interface TimedEvent {
  tick: number
  /** ties are broken by this: setup, then note-off, then bend, then note-on.
      note-offs MUST precede note-ons at the same tick or a repeated pitch on
      one channel gets cut short. */
  priority: number
  bytes: number[]
}

function serializeTrack(events: TimedEvent[]): number[] {
  const sorted = [...events].sort((a, b) => a.tick - b.tick || a.priority - b.priority)
  const out: number[] = []
  let last = 0
  for (const e of sorted) {
    out.push(...vlq(e.tick - last), ...e.bytes)
    last = e.tick
  }
  out.push(...vlq(0), 0xff, 0x2f, 0x00) // end of track
  return out
}

// ---------------------------------------------------------------------------
// export
// ---------------------------------------------------------------------------

export type ChannelStrategy = 'two-channel' | 'mpe'

export interface MidiOptions {
  ppq?: number
  /**
   * 24edo needs exactly two bend values — 0 and +50 cents — so a note's channel
   * is fully determined by whether its step is odd. `two-channel` puts the even
   * steps on channel 0 and the odd ones on channel 1, sets each channel's bend
   * once at tick 0, and never touches it again. that gives unlimited polyphony
   * and imports correctly everywhere, including hosts with no mpe support.
   *
   * `mpe` spreads voices one-per-channel instead. it is only worth it if you
   * later want per-note expression, and it caps polyphony at 15.
   */
  strategy?: ChannelStrategy
  bendRangeSemitones?: number
  /** general midi program number, 0-based */
  program?: number
}

export const PPQ = 480
export const BEND_CENTER = 8192

/** pitch bend value that raises by one 24edo step, given a bend range. */
export function bendForQuarterTone(bendRangeSemitones: number): number {
  return Math.round(BEND_CENTER + (0.5 / bendRangeSemitones) * BEND_CENTER)
}

function channelSetup(channel: number, bend: number, range: number, program?: number): number[][] {
  const cc = 0xb0 | channel
  const msgs: number[][] = [
    [cc, 101, 0], // rpn msb
    [cc, 100, 0], // rpn lsb -> rpn 0,0 = pitch bend sensitivity
    [cc, 6, range], // data entry msb: semitones
    [cc, 38, 0], // data entry lsb: cents
    [cc, 101, 127], // null rpn, so stray data entry cannot retune anything
    [cc, 100, 127],
  ]
  if (program !== undefined) msgs.push([0xc0 | channel, program & 0x7f])
  msgs.push([0xe0 | channel, bend & 0x7f, (bend >> 7) & 0x7f])
  return msgs
}

export function clipToMidi(clip: Clip, opts: MidiOptions = {}): Uint8Array {
  const ppq = opts.ppq ?? PPQ
  const strategy = opts.strategy ?? 'two-channel'
  const range = opts.bendRangeSemitones ?? 2
  const quarterBend = bendForQuarterTone(range)

  const toTicks = (beats: number) => Math.round(beats * ppq)

  // track 0: conductor. tempo and time signature live here because that is
  // where every daw looks for them.
  const conductor: TimedEvent[] = [
    { tick: 0, priority: 0, bytes: textMeta(0x03, clip.name) },
    {
      tick: 0,
      priority: 0,
      bytes: (() => {
        const us = Math.round(60_000_000 / clip.bpm)
        return [0xff, 0x51, 0x03, (us >> 16) & 0xff, (us >> 8) & 0xff, us & 0xff]
      })(),
    },
    { tick: 0, priority: 0, bytes: [0xff, 0x58, 0x04, clip.beatsPerBar, 2, 24, 8] },
  ]

  const music: TimedEvent[] = []
  const notes = sortedNotes(clip)

  if (strategy === 'two-channel') {
    for (const [channel, bend] of [
      [0, BEND_CENTER],
      [1, quarterBend],
    ] as const) {
      for (const bytes of channelSetup(channel, bend, range, opts.program)) {
        music.push({ tick: 0, priority: 0, bytes })
      }
    }
    for (const n of notes) {
      const { note, bend } = stepToMidi(n.step)
      pushNote(music, bend, note, n, toTicks)
    }
  } else {
    // one voice per channel, skipping channel 9 (percussion). a channel is
    // reusable only once its note has finished sounding.
    const channels = [0, 1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 12, 13, 14, 15]
    const freeAt = new Map<number, number>(channels.map((c) => [c, -Infinity]))
    for (const ch of channels) {
      for (const bytes of channelSetup(ch, BEND_CENTER, range, opts.program)) {
        music.push({ tick: 0, priority: 0, bytes })
      }
    }
    for (const n of notes) {
      const { note, bend } = stepToMidi(n.step)
      const ch = channels.find((c) => freeAt.get(c)! <= n.start)
      if (ch === undefined) {
        throw new Error(
          `mpe export needs more than 15 simultaneous voices (clip "${clip.name}"); ` +
            `use the two-channel strategy instead`,
        )
      }
      freeAt.set(ch, n.start + n.duration)
      music.push({
        tick: toTicks(n.start),
        priority: 2,
        bytes: (() => {
          const b = bend ? quarterBend : BEND_CENTER
          return [0xe0 | ch, b & 0x7f, (b >> 7) & 0x7f]
        })(),
      })
      pushNote(music, ch, note, n, toTicks)
    }
  }

  return new Uint8Array([
    // format 1, two tracks, ppq division — exactly six bytes of header data
    ...chunk('MThd', [0, 1, 0, 2, (ppq >> 8) & 0xff, ppq & 0xff]),
    ...chunk('MTrk', serializeTrack(conductor)),
    ...chunk('MTrk', serializeTrack(music)),
  ])
}

type Note = Clip['notes'][number]

/** emit the note-on/note-off pair for one event on a given channel. */
function pushNote(
  out: TimedEvent[],
  channel: number,
  note: number,
  n: Note,
  toTicks: (b: number) => number,
): void {
  const key = Math.max(0, Math.min(127, note))
  const vel = Math.max(1, Math.min(127, Math.round(n.velocity * 127)))
  const on = toTicks(n.start)
  // a zero-length note would vanish, so always leave at least one tick
  const off = Math.max(on + 1, toTicks(n.start + n.duration))
  out.push({ tick: on, priority: 3, bytes: [0x90 | channel, key, vel] })
  out.push({ tick: off, priority: 1, bytes: [0x80 | channel, key, 0x40] })
}
