import { EDO, pcName, type PitchClass, type Spelling } from '../core/pitch.ts'

interface Props {
  root: PitchClass
  spelling: Spelling
  /** pitch classes that the scale contains, for highlighting */
  inScale: PitchClass[]
  onChange(root: PitchClass): void
}

export function RootPicker({ root, spelling, inScale, onChange }: Props) {
  const members = new Set(inScale)
  return (
    <div className="roots">
      {Array.from({ length: EDO }, (_, pc) => (
        <button
          key={pc}
          type="button"
          className="ghost"
          aria-pressed={pc === root}
          onClick={() => onChange(pc)}
          style={
            pc === root
              ? { background: 'var(--color-1)', borderColor: 'var(--color-1)', color: 'var(--color-fg)' }
              : members.has(pc)
                ? { borderColor: 'var(--muted)' }
                : undefined
          }
        >
          {pcName(pc, spelling)}
        </button>
      ))}
    </div>
  )
}
