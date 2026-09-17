import type { Clip } from '../core/clip.ts'
import { clipToMidi } from '../core/midi.ts'
import { downloadMidi } from '../lib/download.ts'
import { DOWNLOAD, Icon, PLAY, STOP } from './Icon.tsx'

interface Props {
  id: string
  clip: Clip
  filename: string
  playingId: string | null
  onToggle(id: string, clip: Clip): void
  compact?: boolean
}

/**
 * every clip in the app gets exactly these two affordances, and both read the
 * same Clip — so what you hear is always what you download.
 */
export function ClipControls({ id, clip, filename, playingId, onToggle, compact }: Props) {
  const playing = playingId === id
  return (
    <span className="row" style={{ gap: 'var(--spacing-xs)' }}>
      <button
        type="button"
        className={`ghost${playing ? ' playing' : ''}`}
        onClick={() => onToggle(id, clip)}
        aria-label={playing ? 'stop' : 'play'}
      >
        <Icon d={playing ? STOP : PLAY} />
        {compact ? null : <span> {playing ? 'stop' : 'play'}</span>}
      </button>
      <button
        type="button"
        className="ghost"
        onClick={() => downloadMidi(clipToMidi(clip), filename)}
        aria-label={`download ${filename}`}
      >
        <Icon d={DOWNLOAD} />
        {compact ? null : <span> .mid</span>}
      </button>
    </span>
  )
}
