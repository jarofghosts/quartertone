# CLAUDE.md

## What this is

A static web app for exploring **24edo** — 24 equal divisions of the octave,
50 cents per step. Browse a corpus of 24edo scales; pick one and a root note and
get a Scala `.scl` file, playable/downloadable MIDI clips (the scale as a chord,
a seeded random melody, and chords on every degree), and a quarter-tone
fretboard for an EADGCF-tuned guitar.

No backend. Everything is derived from 24 integers and a root.

## Tech stack

| Layer | Tech |
|---|---|
| App | React 18 + TypeScript, Vite 6, npm |
| Styling | plain global CSS with custom properties. no framework |
| Tests | vitest + @testing-library/react |
| Ingest | node scripts under `scripts/`, run directly (node strips the types) |

## Commands

```sh
npm run dev            # vite dev server on :5173
npm run build          # tsc --noEmit && vite build -> dist/
npm test               # vitest
npm run lint           # eslint, --max-warnings 0
npm run type-check
npm run build:scales   # regenerate src/data/scales.generated.json
```

CI runs all of the above **plus** `npm run build:scales && git diff --exit-code
src/data/scales.generated.json` — the committed corpus must match what the
generator produces.

## Architecture

`src/core/` is **pure typescript**: no react, no dom, no web audio, no node
builtins. It is unit-tested without jsdom and imported by the ingest scripts.
Keep it that way — it is what makes the domain logic verifiable.

```
src/core/     pitch, scale, mos, clip, scl, midi, chords, melody, fretboard, random
src/audio/    web audio synth (consumes Clip)
src/data/     registry + the committed generated corpus
src/lib/      dom-side helpers (download, hash router)
scripts/      ingest sources -> scales.generated.json
```

### Clip is the anti-drift abstraction

`src/core/clip.ts` defines `NoteEvent` with pitch as **one integer** — an
absolute 24edo step. The synth calls `stepToFreq`; the MIDI exporter calls
`stepToMidi`. Neither is allowed to invent its own pitch mapping.

`src/core/__tests__/pitch.test.ts` has a test named "synth/export pitch
agreement" that asserts those two functions agree for every step across the MIDI
range. **That test is the guarantee that what you hear in the page is what lands
in the downloaded file.** Do not delete or weaken it.

## Critical rules

### All user-visible text is lowercase

Headings, buttons, labels, placeholders, errors — everything. Matches
`../abaddon`. This is deliberate; never "fix" it by capitalising strings. The
only exception is the `text-transform: uppercase` on panel headings, which is
presentational.

### No box-shadow, no border-radius

Emphasis comes from borders: 2px solid for panels, 1px for rows and inputs,
dashed for pending/quarter-tone states. There is no `box-shadow` anywhere and
`border-radius` is 0. Muted text is `color-mix(in srgb, var(--color-fg) 65%,
var(--color-bg))` — there are no grey tokens, so a theme swap only needs the
five colours in `src/styles/tokens.css`.

Code style: **no semicolons, single quotes**, `export function X()` declarations,
`interface Props`.

### MIDI uses two channels, not fifteen

24edo needs exactly two pitch-bend values: 0 and +50 cents. So `clipToMidi`
defaults to `strategy: 'two-channel'` — even steps on channel 0, odd steps on
channel 1, each bent once at tick 0 and never touched again. That gives
unlimited polyphony and imports correctly into hosts with no MPE support.

An `'mpe'` strategy exists (one voice per channel, skipping channel 9) but caps
polyphony at 15 and **throws** rather than stealing a channel. Only use it if
per-note expression is ever needed.

### The .scl cents-vs-ratio trap

Scala decides cents-vs-ratio by whether a value **contains a period**. Bare `50`
means the frequency ratio 50/1 — about five and a half octaves up. `50.0` means
fifty cents. `writeScl` always emits `%.6f` and there is a test pinning it.

### Scale corpus is generated, not scraped

`https://en.xen.wiki/w/24edo_scales` is behind a Cloudflare CAPTCHA — curl,
WebFetch and text proxies all get a 403 challenge page. So the corpus is built
instead: exhaustive MOS enumeration plus a hand-authored named-scale file.

Sources live in `scripts/sources/` and are keyed by **step pattern**, so the
curated file attaches "major / ionian" to the very same record the MOS enumerator
emits for `5L 2s (4:2)` rather than creating a duplicate row. To add a wiki
snapshot or a Scala archive import later, write a new `ScaleSource` and register
it in `scripts/sources/index.ts` — nothing else changes.

MOS enumeration uses the **mechanical (Christoffel) word**, not generator
stacking. Stacking a generator mod 24 silently drops every multi-period MOS
(the octatonic, for one) because a generator sharing a factor with 24 terminates
its chain early. `hasMaxVarietyTwo` is an independent property check on the word
construction and is asserted over every enumerated family.

## Known gaps (do not accidentally "fix" these)

- **The source's "161 chords" does not reproduce.** `src/core/chords.ts`
  implements the quartertone-harmony rules from microtonaltheory.com. The
  structural reading is settled — "chain of friends" means a *linear* chain
  through consecutive notes, not graph connectivity, because the graph reading
  admits semitone clusters like `[0,2,6,8]` that the source's published list
  contains none of. But no combination of rules yields the author's stated count
  of 161. We generate 14 triads / 49 tetrads / 59 pentads and assert that all 20
  published fixture chords and all 5 named chords are present. Do not tune the
  rules to hit 161.
- **The enemy rule is genuinely ambiguous, and the source's paraphrase is
  wrong.** Checking enemies over all pairs vs. only consecutive ones differs by
  exactly 24 chords: 16 with two gaps summing to 15 (the `(7,8)`/`(8,7)` case
  the author names) and 8 with three stacked 5-step gaps (which the author's
  paraphrase misses, though `(5,5,5)` also spans 15). We follow the rule as
  stated, not the paraphrase. Both readings are tested.
- **Crowding is vacuous under the linear reading.** Consecutive notes are at
  least 5 steps apart, so nothing can crowd. The rule is implemented anyway
  because it bites in `chainMode: 'graph'`.
- **Note naming has no enharmonic model.** 24edo has 24 pitch classes and 7
  letters; correct spelling would need a key-signature model. Instead there are
  three flat tables (`arrows`, `quarter`, `steps`). `arrows` is the default and
  is lifted verbatim from `../bitwig-linnstrument-24edo`'s `NOTE_NAMES_24` so
  both projects read the same.
- **Do not use 𝄲 / 𝄳 (U+1D132/33).** They are SMP codepoints with no coverage in
  `"Courier New", Courier, monospace` and render as tofu. `↑` is BMP and works.
- **Hash routing is deliberate.** This ships as static files, so `/scale/major`
  would 404 on GitHub Pages without server rewrites. Switch to path routing only
  if the host gains rewrite config.
