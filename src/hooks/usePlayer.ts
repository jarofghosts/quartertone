import { useCallback, useEffect, useRef, useState } from 'react'
import type { Clip } from '../core/clip.ts'
import { playClip, type Voice } from '../audio/synth.ts'

/**
 * one playback at a time, app-wide. starting a clip stops whatever was already
 * sounding, which is the behaviour you want on a page covered in play buttons.
 */
export function usePlayer() {
  const [playingId, setPlayingId] = useState<string | null>(null)
  const handle = useRef<{ stop(): void } | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const stop = useCallback(() => {
    handle.current?.stop()
    handle.current = null
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
    setPlayingId(null)
  }, [])

  const play = useCallback(
    (id: string, clip: Clip, voice?: Voice) => {
      stop()
      if (clip.notes.length === 0) return
      const h = playClip(clip, { voice })
      handle.current = h
      setPlayingId(id)
      timer.current = setTimeout(() => setPlayingId(null), h.duration * 1000)
    },
    [stop],
  )

  const toggle = useCallback(
    (id: string, clip: Clip, voice?: Voice) => {
      if (playingId === id) stop()
      else play(id, clip, voice)
    },
    [play, playingId, stop],
  )

  useEffect(() => stop, [stop])

  return { playingId, play, stop, toggle }
}
