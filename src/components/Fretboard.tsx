import { useMemo } from 'react'
import { buildFretboard, EADGCF } from '../core/fretboard.ts'
import { EDO, stepName, type PitchClass, type Spelling } from '../core/pitch.ts'
import type { ScaleShape } from '../core/scale.ts'

interface Props {
  shape: ScaleShape
  root: PitchClass
  spelling: Spelling
  fretCount: number
  onPlayNote(step: number): void
}

/**
 * rendered as a css grid rather than svg: this design is made of borders, and
 * the sticky nut column that keeps string names visible while the neck scrolls
 * is two lines of css here and genuinely painful in svg.
 */
export function Fretboard({ shape, root, spelling, fretCount, onPlayNote }: Props) {
  const board = useMemo(
    () => buildFretboard(shape, root, fretCount, EADGCF, spelling),
    [shape, root, fretCount, spelling],
  )

  // highest string first, so the board reads the way it looks to a player
  const strings = [...board.rows].reverse()

  return (
    <div className="fretboard-scroll">
      <div
        className="fretboard"
        style={{ gridTemplateColumns: `4rem repeat(${fretCount + 1}, 2.1rem)` }}
      >
        <div className="fret-head nut" />
        {Array.from({ length: fretCount + 1 }, (_, f) => (
          <div
            key={f}
            className={`fret-head${f % 2 === 1 ? ' quarter' : ''}${
              f > 0 && f % EDO === 0 ? ' octave' : ''
            }`}
            style={f > 0 && f % EDO === 0 ? { scrollSnapAlign: 'start' } : undefined}
          >
            {/* only the 12edo frets get a number — they are the landmarks a
                guitarist already reads. the quarter tones between them are
                marked with a tick. */}
            {f % 2 === 0 ? f / 2 : '·'}
          </div>
        ))}

        {strings.map((row) => (
          <Row key={row[0].step} row={row} spelling={spelling} onPlayNote={onPlayNote} />
        ))}
      </div>
    </div>
  )
}

interface RowProps {
  row: ReturnType<typeof buildFretboard>['rows'][number]
  spelling: Spelling
  onPlayNote(step: number): void
}

function Row({ row, spelling, onPlayNote }: RowProps) {
  return (
    <>
      <div className="nut">{stepName(row[0].step, spelling)}</div>
      {row.map((cell) => {
        const cls = [
          'fret-cell',
          cell.degreeIndex !== null ? 'in-scale' : '',
          cell.isQuarterTone ? 'quarter' : '',
          cell.isRoot ? 'root' : '',
          cell.fret > 0 && cell.fret % EDO === 0 ? 'octave-line' : '',
        ]
          .filter(Boolean)
          .join(' ')

        if (cell.degreeIndex === null) {
          return (
            <span key={cell.fret} className={cls}>
              ·
            </span>
          )
        }
        return (
          <button
            key={cell.fret}
            type="button"
            className={cls}
            onClick={() => onPlayNote(cell.step)}
            title={`${stepName(cell.step, spelling)} — degree ${cell.degreeIndex + 1}, fret ${cell.fret}`}
          >
            {cell.label}
          </button>
        )
      })}
    </>
  )
}
