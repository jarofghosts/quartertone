import { beatsToSeconds, clipSeconds, type Clip } from '../core/clip.ts'
import { stepToFreq } from '../core/pitch.ts'

/**
 * a small oscillator synth.
 *
 * there is no sample set and no soundfont: 24edo pitches are computed straight
 * from cents via stepToFreq, which is the same function the midi exporter's
 * pitch mapping is tested against. a general midi instrument could not play
 * these pitches without retuning anyway.
 */
export type Voice = 'triangle' | 'sine' | 'sawtooth' | 'square'

export interface PlayOptions {
  voice?: Voice
  gain?: number
}

export interface PlaybackHandle {
  stop(): void
  /** seconds of audio scheduled */
  duration: number
}

let ctx: AudioContext | null = null

/** created lazily on the first user gesture, per browser autoplay policy. */
export function audioContext(): AudioContext {
  if (!ctx) ctx = new AudioContext()
  return ctx
}

const ATTACK = 0.008
const RELEASE = 0.12

export function playClip(clip: Clip, opts: PlayOptions = {}): PlaybackHandle {
  const audio = audioContext()
  void audio.resume()

  const voice = opts.voice ?? 'triangle'
  // headroom: a twelve-note chord through a shared master would clip hard
  const master = audio.createGain()
  const peak = Math.max(1, countMaxOverlap(clip))
  master.gain.value = (opts.gain ?? 0.5) / Math.sqrt(peak)
  master.connect(audio.destination)

  const t0 = audio.currentTime + 0.05
  const nodes: OscillatorNode[] = []

  for (const note of clip.notes) {
    const start = t0 + beatsToSeconds(note.start, clip.bpm)
    const end = start + beatsToSeconds(note.duration, clip.bpm)

    const osc = audio.createOscillator()
    osc.type = voice
    osc.frequency.value = stepToFreq(note.step)

    // a short attack and release, purely so note edges do not click
    const env = audio.createGain()
    env.gain.setValueAtTime(0, start)
    env.gain.linearRampToValueAtTime(note.velocity, start + ATTACK)
    env.gain.setValueAtTime(note.velocity, Math.max(start + ATTACK, end - RELEASE))
    env.gain.linearRampToValueAtTime(0, end)

    osc.connect(env)
    env.connect(master)
    osc.start(start)
    osc.stop(end + 0.02)
    nodes.push(osc)
  }

  return {
    duration: clipSeconds(clip) + 0.1,
    stop() {
      for (const n of nodes) {
        try {
          n.stop()
        } catch {
          // already stopped; nothing to do
        }
      }
      master.disconnect()
    },
  }
}

function countMaxOverlap(clip: Clip): number {
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
