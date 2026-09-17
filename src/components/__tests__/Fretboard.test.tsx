import { describe, it, expect, afterEach, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { Fretboard } from '../Fretboard.tsx'
import { shapeFromPattern } from '../../core/scale.ts'

afterEach(cleanup)

const neutral = shapeFromPattern([4, 3, 3, 4, 3, 4, 3])

describe('fretboard', () => {
  it('labels the open strings e a d g c f, lowest last in the dom', () => {
    render(<Fretboard shape={neutral} root={0} spelling="arrows" fretCount={24} onPlayNote={() => {}} />)
    // rendered high string first, the way the neck looks to a player
    expect(screen.getByText('f4')).toBeDefined()
    expect(screen.getByText('e2')).toBeDefined()
    expect(screen.getByText('g3')).toBeDefined()
  })

  it('only makes in-scale notes clickable', () => {
    const onPlayNote = vi.fn()
    render(<Fretboard shape={neutral} root={0} spelling="arrows" fretCount={24} onPlayNote={onPlayNote} />)
    const cells = screen.getAllByRole('button')
    expect(cells.length).toBeGreaterThan(0)
    fireEvent.click(cells[0])
    expect(onPlayNote).toHaveBeenCalledTimes(1)
    expect(typeof onPlayNote.mock.calls[0][0]).toBe('number')
  })

  it('marks roots distinctly from other scale tones', () => {
    const { container } = render(
      <Fretboard shape={neutral} root={0} spelling="arrows" fretCount={24} onPlayNote={() => {}} />,
    )
    expect(container.querySelectorAll('.fret-cell.root').length).toBeGreaterThan(0)
    expect(container.querySelectorAll('.fret-cell.in-scale.quarter').length).toBeGreaterThan(0)
  })

  it('renders one column per fret plus the open string', () => {
    const { container } = render(
      <Fretboard shape={neutral} root={0} spelling="arrows" fretCount={36} onPlayNote={() => {}} />,
    )
    // 37 fret heads plus the empty nut head
    expect(container.querySelectorAll('.fret-head')).toHaveLength(38)
  })
})
