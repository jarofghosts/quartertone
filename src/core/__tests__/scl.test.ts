import { describe, it, expect } from 'vitest'
import { shapeFromPattern } from '../scale.ts'
import { sclFilename, writeScl } from '../scl.ts'

const major = shapeFromPattern([4, 4, 2, 4, 4, 4, 2])
const neutral = shapeFromPattern([4, 3, 3, 4, 3, 4, 3])

describe('scl export', () => {
  it('writes the expected file for the 24edo major scale', () => {
    expect(writeScl(major, { description: 'major', filename: 'major-c.scl' })).toBe(
      [
        '! major-c.scl',
        '!',
        'major',
        ' 7',
        '!',
        ' 200.000000',
        ' 400.000000',
        ' 500.000000',
        ' 700.000000',
        ' 900.000000',
        ' 1100.000000',
        ' 1200.000000',
        '',
      ].join('\n'),
    )
  })

  // scala reads a bare integer as a RATIO, not cents: `50` means 50/1, about
  // five and a half octaves up. every value must carry a decimal point.
  it('always emits a decimal point so values are read as cents', () => {
    for (const shape of [major, neutral]) {
      const body = writeScl(shape, { description: 'x' })
        .split('\n')
        .filter((l) => /^\s+\d/.test(l))
        .slice(1) // drop the count line
      expect(body.length).toBeGreaterThan(0)
      for (const line of body) expect(line).toContain('.')
    }
  })

  it('excludes the unison and includes the octave', () => {
    const lines = writeScl(neutral, { description: 'neutral' }).trim().split('\n')
    const values = lines.filter((l) => l.startsWith(' ')).slice(1)
    expect(values).toHaveLength(neutral.degrees.length)
    expect(values[values.length - 1].trim()).toBe('1200.000000')
    expect(values.map((v) => v.trim())).not.toContain('0.000000')
  })

  it('declares a count matching the number of value lines', () => {
    const lines = writeScl(neutral, { description: 'neutral' }).trim().split('\n')
    const spaced = lines.filter((l) => l.startsWith(' '))
    expect(Number(spaced[0].trim())).toBe(spaced.length - 1)
  })

  it('renders quarter tones at odd multiples of 50 cents', () => {
    const out = writeScl(neutral, { description: 'neutral diatonic' })
    expect(out).toContain(' 350.000000')
  })

  it('makes filenames shell- and url-safe', () => {
    expect(sclFilename('neutral diatonic', 3)).toBe('neutral-diatonic-csup.scl')
    expect(sclFilename('maqam rast', 0)).toBe('maqam-rast-c.scl')
    expect(sclFilename('5L 2s (4:2)', 18)).toMatch(/^[a-z0-9-]+\.scl$/)
  })
})
