import { useMemo, useState } from 'react'
import { Panel } from '../components/Panel.tsx'
import { RootPicker } from '../components/RootPicker.tsx'
import { ClipControls } from '../components/ClipControls.tsx'
import { Fretboard } from '../components/Fretboard.tsx'
import { DICE, DOWNLOAD, Icon } from '../components/Icon.tsx'
import { usePlayer } from '../hooks/usePlayer.ts'
import { displayName, scaleById } from '../data/registry.ts'
import { CENTS_PER_STEP, EDO, asciiPcName, mod, pcName, stepName, type PitchClass, type Spelling } from '../core/pitch.ts'
import { toPitchClasses } from '../core/scale.ts'
import { buildChordClip, buildScaleChordClip, buildScaleRunClip } from '../core/clip.ts'
import { DEFAULT_RULES, chordsForScale, generateChords, withNames } from '../core/chords.ts'
import { buildMelodyClip, DEFAULT_MELODY, decodeMelodyParams, encodeMelodyParams } from '../core/melody.ts'
import { randomSeed } from '../core/random.ts'
import { clipToMidi } from '../core/midi.ts'
import { sclFilename, writeScl } from '../core/scl.ts'
import { downloadMidi, downloadText } from '../lib/download.ts'
import { routeHref, setParams } from '../lib/route.ts'

// the chord space is a few thousand nodes, so it is enumerated once at module
// load rather than baked into the corpus
const ALL_CHORDS = withNames(generateChords(DEFAULT_RULES))

/** middle c, the octave everything is rooted in. */
const C4 = 120

interface Props {
  id: string
  params: Record<string, string>
}

export function ScaleDetail({ id, params }: Props) {
  const entry = scaleById(id)
  const { playingId, toggle, play } = usePlayer()
  const [spelling, setSpelling] = useState<Spelling>('arrows')
  const [frets, setFrets] = useState(36)

  const root = clampPc(Number(params.root ?? 0))
  const melody = useMemo(() => decodeMelodyParams(params), [params])

  const update = (next: Record<string, string>) =>
    setParams({ ...params, root: String(root), ...next })

  if (!entry) {
    return (
      <p className="empty">
        no scale called “{id}”. <a href={routeHref({ name: 'list' })}>back to the list</a>
      </p>
    )
  }

  const { shape } = entry
  const name = displayName(entry)
  const rootStep = C4 + root
  const pcs = toPitchClasses(shape, root)
  const slug = `${name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-${asciiPcName(root)}`

  const chordClip = buildScaleChordClip(shape, rootStep, `${name} chord`)
  const runClip = buildScaleRunClip(shape, rootStep, `${name} run`)
  const melodyClip = buildMelodyClip(melody, shape, rootStep, `${name} melody`)
  const byDegree = chordsForScale(shape, root, ALL_CHORDS)

  return (
    <div>
      <header style={{ marginBottom: 'var(--spacing-md)' }}>
        <h1 style={{ fontSize: '1.3rem' }}>{name}</h1>
        <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>
          {entry.names.slice(1).join(' · ')}
          {entry.names.length > 1 && entry.family ? ' · ' : ''}
          {entry.family}
          {' · '}
          <span className="pattern">{shape.pattern.join(' ')}</span>
          {' · '}
          {shape.pattern.length} notes
          {' · from '}
          {entry.provenance.join(' + ')}
        </p>
        {typeof entry.meta.note === 'string' ? (
          <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>{entry.meta.note}</p>
        ) : null}
      </header>

      <Panel title="root note">
        <RootPicker
          root={root}
          spelling={spelling}
          inScale={pcs}
          onChange={(pc) => update({ root: String(pc) })}
        />
        <div className="row" style={{ marginTop: 'var(--spacing-sm)' }}>
          <label>
            notation
            <select value={spelling} onChange={(e) => setSpelling(e.target.value as Spelling)}>
              <option value="arrows">arrows (c↑)</option>
              <option value="quarter">half-sharps (c+)</option>
              <option value="steps">step numbers</option>
            </select>
          </label>
          <span className="spacer" style={{ flex: 1 }} />
          <button
            type="button"
            className="ghost"
            onClick={() =>
              downloadText(
                writeScl(shape, {
                  description: `${name} on ${pcName(root, 'quarter')} — 24edo`,
                  filename: sclFilename(name, root),
                  comments: [`step pattern ${shape.pattern.join(' ')}`, ...entry.names],
                }),
                sclFilename(name, root),
              )
            }
          >
            <Icon d={DOWNLOAD} /> .scl
          </button>
        </div>
      </Panel>

      <Panel title="degrees">
        <table className="degrees">
          <thead>
            <tr>
              <th>#</th>
              <th>note</th>
              <th>step</th>
              <th>from prev</th>
              <th>cents</th>
            </tr>
          </thead>
          <tbody>
            {shape.degrees.map((d, i) => (
              <tr key={d} className={d % 2 === 1 ? 'quarter' : undefined}>
                <td>{i + 1}</td>
                <td>
                  <button
                    type="button"
                    className="ghost"
                    style={{ border: 'none', padding: 0 }}
                    onClick={() => play(`degree-${i}`, buildChordClip([0], rootStep + d, 'note'))}
                  >
                    {stepName(rootStep + d, spelling)}
                  </button>
                </td>
                <td>{d}</td>
                <td>{i === 0 ? '—' : d - shape.degrees[i - 1]}</td>
                <td>{(d * CENTS_PER_STEP).toFixed(0)}</td>
              </tr>
            ))}
            <tr>
              <td>{shape.degrees.length + 1}</td>
              <td>{stepName(rootStep + EDO, spelling)}</td>
              <td>{EDO}</td>
              <td>{EDO - shape.degrees[shape.degrees.length - 1]}</td>
              <td>1200</td>
            </tr>
          </tbody>
        </table>
      </Panel>

      <Panel
        title="fretboard — eadgcf, quarter-tone frets"
        aside={
          <span className="row" style={{ gap: 'var(--spacing-xs)' }}>
            {[24, 36, 48].map((f) => (
              <button
                key={f}
                type="button"
                className="ghost"
                aria-pressed={frets === f}
                onClick={() => setFrets(f)}
                style={{ fontSize: '0.75rem' }}
              >
                {f}
              </button>
            ))}
          </span>
        }
      >
        <Fretboard
          shape={shape}
          root={root}
          spelling={spelling}
          fretCount={frets}
          onPlayNote={(step) => play(`fret-${step}`, buildChordClip([0], step, 'note'))}
        />
        <p style={{ color: 'var(--muted)', fontSize: '0.75rem', marginTop: 'var(--spacing-xs)' }}>
          strings are all perfect fourths, so every string sits ten frets above the one below.
          frets are quarter tones — numbers mark the twelve-tone frets, dots the quarter tones
          between them. dashed cells are pitches that do not exist in 12edo.
        </p>
      </Panel>

      <Panel title="clips">
        <div className="row">
          <span style={{ minWidth: '9rem' }}>whole scale as a chord</span>
          <ClipControls
            id="chord"
            clip={chordClip}
            filename={`${slug}-chord.mid`}
            playingId={playingId}
            onToggle={toggle}
          />
        </div>
        <div className="row" style={{ marginTop: 'var(--spacing-xs)' }}>
          <span style={{ minWidth: '9rem' }}>scale, up and back</span>
          <ClipControls
            id="run"
            clip={runClip}
            filename={`${slug}-run.mid`}
            playingId={playingId}
            onToggle={toggle}
          />
        </div>
      </Panel>

      <Panel title="randomiser">
        <div className="row">
          <label>
            seed
            <input
              type="text"
              value={melody.seed}
              size={10}
              onChange={(e) => update({ ...encodeMelodyParams(melody), seed: e.target.value })}
            />
          </label>
          <button type="button" onClick={() => update({ ...encodeMelodyParams(melody), seed: randomSeed() })}>
            <Icon d={DICE} /> reroll
          </button>
          <ClipControls
            id="melody"
            clip={melodyClip}
            filename={`${slug}-${melody.seed}.mid`}
            playingId={playingId}
            onToggle={toggle}
          />
        </div>
        <div className="row" style={{ marginTop: 'var(--spacing-sm)' }}>
          <Slider label="bars" value={melody.bars} min={1} max={8} step={1}
            onChange={(v) => update({ ...encodeMelodyParams(melody), bars: String(v) })} />
          <Slider label="bpm" value={melody.bpm} min={40} max={200} step={5}
            onChange={(v) => update({ ...encodeMelodyParams(melody), bpm: String(v) })} />
          <Slider label="density" value={melody.density} min={0.1} max={1} step={0.05}
            onChange={(v) => update({ ...encodeMelodyParams(melody), den: v.toFixed(2) })} />
          <Slider label="leap" value={melody.maxLeap} min={1} max={8} step={1}
            onChange={(v) => update({ ...encodeMelodyParams(melody), leap: String(v) })} />
          <Slider label="octaves" value={melody.octaves} min={1} max={4} step={1}
            onChange={(v) => update({ ...encodeMelodyParams(melody), oct: String(v) })} />
        </div>
        <p style={{ color: 'var(--muted)', fontSize: '0.75rem', marginTop: 'var(--spacing-xs)' }}>
          every setting lives in the url, so this link regenerates exactly this melody.
          {melody.seed === DEFAULT_MELODY.bars.toString() ? null : null}
        </p>
      </Panel>

      <Panel title="chords on each degree">
        <p style={{ color: 'var(--muted)', fontSize: '0.75rem', marginBottom: 'var(--spacing-sm)' }}>
          built with the quartertone-harmony scheme: notes chained by supermajor seconds
          and thirds, with no interval of 1, 9 or 15 quarter tones between any pair.
          only chords whose every note is in this scale are shown.
        </p>
        {byDegree.map((degree) => (
          <div key={degree.degreeIndex} style={{ marginBottom: 'var(--spacing-sm)' }}>
            <h3 style={{ fontSize: '0.8rem', marginBottom: 'var(--spacing-xs)' }}>
              degree {degree.degreeIndex + 1} — {pcName(degree.rootPc, spelling)}{' '}
              <span style={{ color: 'var(--muted)', fontWeight: 'normal' }}>
                ({degree.chords.length})
              </span>
            </h3>
            {degree.chords.length === 0 ? (
              <p className="empty" style={{ fontSize: '0.75rem' }}>
                no valid chords on this degree
              </p>
            ) : (
              <div className="chord-grid">
                {degree.chords.map((chord) => {
                  const chordRoot = C4 + degree.rootPc
                  const clip = buildChordClip(chord.offsets, chordRoot, chord.id)
                  return (
                    <div key={chord.id} className="chord-card">
                      <div className="row" style={{ justifyContent: 'space-between' }}>
                        <span>
                          {chord.offsets.map((o) => pcName(mod(degree.rootPc + o, EDO), spelling)).join(' ')}
                        </span>
                        <ClipControls
                          id={`chord-${degree.degreeIndex}-${chord.id}`}
                          clip={clip}
                          filename={`${slug}-d${degree.degreeIndex + 1}-${chord.id}.mid`}
                          playingId={playingId}
                          onToggle={toggle}
                          compact
                        />
                      </div>
                      <div className="offsets">{chord.offsets.join(' · ')}</div>
                      {chord.names.length ? (
                        <div className="chord-name">{chord.names[0]}</div>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        ))}
      </Panel>

      <Panel title="downloads">
        <div className="row">
          <button
            type="button"
            className="ghost"
            onClick={() =>
              downloadText(
                writeScl(shape, {
                  description: `${name} on ${pcName(root, 'quarter')} — 24edo`,
                  filename: sclFilename(name, root),
                  comments: [`step pattern ${shape.pattern.join(' ')}`, ...entry.names],
                }),
                sclFilename(name, root),
              )
            }
          >
            <Icon d={DOWNLOAD} /> {sclFilename(name, root)}
          </button>
          <button
            type="button"
            className="ghost"
            onClick={() => downloadMidi(clipToMidi(chordClip), `${slug}-chord.mid`)}
          >
            <Icon d={DOWNLOAD} /> {slug}-chord.mid
          </button>
        </div>
        <p style={{ color: 'var(--muted)', fontSize: '0.75rem', marginTop: 'var(--spacing-xs)' }}>
          .mid files put quarter tones on a second channel bent up 50 cents, so they import
          in tune anywhere without a microtonal host. the .scl retunes a synth that reads
          scala files.
        </p>
      </Panel>
    </div>
  )
}

interface SliderProps {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange(v: number): void
}

function Slider({ label, value, min, max, step, onChange }: SliderProps) {
  return (
    <label>
      {label}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <span style={{ color: 'var(--color-fg)', minWidth: '2.5rem' }}>{value}</span>
    </label>
  )
}

function clampPc(n: number): PitchClass {
  return Number.isFinite(n) ? mod(Math.round(n), EDO) : 0
}
