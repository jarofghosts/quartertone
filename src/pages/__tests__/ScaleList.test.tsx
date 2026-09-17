import { describe, it, expect, afterEach } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { ScaleList } from '../ScaleList.tsx'

afterEach(cleanup)

describe('scale list', () => {
  it('leads with named scales rather than the mos tail', () => {
    render(<ScaleList />)
    const rows = screen.getAllByRole('link')
    const firstNames = rows.slice(0, 20).map((r) => r.textContent ?? '')
    expect(firstNames.some((n) => n.startsWith('major'))).toBe(true)
    // "1L 4s (8:4) mode 1" and friends must not be at the top of the page
    expect(firstNames.filter((n) => /^\dL \d+s/.test(n))).toHaveLength(0)
  })

  it('filters by search text', () => {
    render(<ScaleList />)
    fireEvent.change(screen.getByLabelText('search scales'), { target: { value: 'maqam' } })
    const rows = screen.getAllByRole('link')
    expect(rows.length).toBeGreaterThan(0)
    for (const r of rows) expect(r.textContent?.toLowerCase()).toContain('maqam')
  })

  it('finds a scale by its step pattern', () => {
    render(<ScaleList />)
    fireEvent.change(screen.getByLabelText('search scales'), { target: { value: '4-3-3-4-3-4-3' } })
    expect(screen.getByText('neutral diatonic')).toBeDefined()
  })

  it('narrows by note count', () => {
    render(<ScaleList />)
    const before = screen.getAllByRole('link').length
    fireEvent.click(screen.getByRole('button', { name: '5' }))
    const after = screen.getAllByRole('link').length
    expect(after).toBeLessThan(before)
    expect(after).toBeGreaterThan(0)
  })

  it('shows an empty state when nothing matches', () => {
    render(<ScaleList />)
    fireEvent.change(screen.getByLabelText('search scales'), { target: { value: 'zzzznope' } })
    expect(screen.getByText('nothing matches those filters')).toBeDefined()
    expect(screen.queryAllByRole('link')).toHaveLength(0)
  })

  it('hides degenerate scales until asked', () => {
    render(<ScaleList />)
    const before = screen.getAllByRole('link').length
    fireEvent.click(screen.getByRole('button', { name: 'show degenerate scales' }))
    expect(screen.getAllByRole('link').length).toBeGreaterThan(before)
  })
})
