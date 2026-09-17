import { describe, it, expect, afterEach, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { ClipControls } from '../ClipControls.tsx'
import { buildChordClip } from '../../core/clip.ts'

vi.mock('../../lib/download.ts', () => ({
  downloadMidi: vi.fn(),
  downloadText: vi.fn(),
  downloadBlob: vi.fn(),
}))

import { downloadMidi } from '../../lib/download.ts'

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

const clip = buildChordClip([0, 7, 14], 120, 'test chord')

describe('clip controls', () => {
  it('downloads midi under the given filename', () => {
    render(
      <ClipControls
        id="x"
        clip={clip}
        filename="neutral-c-chord.mid"
        playingId={null}
        onToggle={() => {}}
      />,
    )
    fireEvent.click(screen.getByLabelText('download neutral-c-chord.mid'))
    expect(downloadMidi).toHaveBeenCalledTimes(1)
    const [bytes, filename] = vi.mocked(downloadMidi).mock.calls[0]
    expect(filename).toBe('neutral-c-chord.mid')
    // a real smf, not an empty buffer
    expect(String.fromCharCode(...bytes.slice(0, 4))).toBe('MThd')
  })

  it('toggles playback and reflects the playing state', () => {
    const onToggle = vi.fn()
    const { rerender } = render(
      <ClipControls id="x" clip={clip} filename="a.mid" playingId={null} onToggle={onToggle} />,
    )
    fireEvent.click(screen.getByLabelText('play'))
    expect(onToggle).toHaveBeenCalledWith('x', clip)

    rerender(
      <ClipControls id="x" clip={clip} filename="a.mid" playingId="x" onToggle={onToggle} />,
    )
    expect(screen.getByLabelText('stop')).toBeDefined()
  })
})
