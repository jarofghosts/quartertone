# quarter

A workbench for **24edo** — 24 equal divisions of the octave, 50 cents per step,
the tuning where quarter tones live.

Browse 396 scales. Pick one, pick a root, and get everything you need to play it:

- **`.scl`** — a Scala tuning file, to retune a soft synth
- **`.mid` clips** — the whole scale as a chord, the scale as a run, a seeded
  random melody, and every chord the harmony scheme allows on each scale degree
- **playback** — every clip plays in the browser, at the exact pitches
- **a fretboard** — quarter-tone frets on a six-string guitar in all fourths
  (E A D G C F), with the scale mapped onto it

No account, no backend, no build step to use it. It is a folder of static files.

## Running it

```sh
npm install
npm run dev        # http://localhost:5173
```

```sh
npm run build      # -> dist/, deployable to any static host
npm test
npm run lint
```

## Where the scales come from

`en.xen.wiki` is behind a CAPTCHA that blocks automated fetching, so the corpus
is generated rather than scraped:

- **exhaustive MOS enumeration** — every moment-of-symmetry scale that fits in
  24edo (`x` large steps and `y` small steps summing to 24), expanded to all its
  distinct modes. 396 entries, built with the mechanical-word construction so
  multi-period scales like the octatonic are included.
- **a curated file** — the maqamat (rast, bayati, sikah, saba, suznak, hijaz,
  nikriz), the neutral-diatonic modes, and the 12edo scales 24edo inherits
  whole.

The two merge by step pattern, so "major" and "5L 2s (4:2) mode 3" are one row,
not two.

```sh
npm run build:scales   # regenerate src/data/scales.generated.json
```

Sources are pluggable: add a `ScaleSource` in `scripts/sources/` and register it.

## How quarter tones survive export

A General MIDI file cannot name a quarter tone, so `.mid` exports put every
odd-numbered 24edo step on a second MIDI channel bent up 50 cents, with the
bend range set explicitly via RPN 0. Two channels is all 24edo ever needs, which
means unlimited polyphony and correct import into any DAW — no microtonal host,
no MPE support, no setup.

The `.scl` file is there for the other workflow: retune a synth that reads Scala
files (Surge, Pianoteq, Scala itself) and play the scale from an ordinary
keyboard.

Browser playback and MIDI export read the *same* clip data and derive pitch from
the same pair of functions, which a test asserts agree across the whole MIDI
range. What you hear is what you download.

## Chords

Chords follow the quartertone harmony scheme from
[microtonaltheory.com](https://www.microtonaltheory.com/tuning-theory/quartertone-harmony):
notes are chained by supermajor seconds and minor, neutral or major thirds
(5, 6, 7 or 8 steps), with no interval of 1, 9 or 15 steps between any pair.

The app only offers chords whose every note is in the selected scale, listed per
degree. See `CLAUDE.md` for where our reading of the rules differs from the
source's stated chord count, and why.

## Notation

Quarter tones are written with an up arrow on the note below — `c`, `c↑`, `c#`,
`c#↑`, `d` — matching the `NOTE_NAMES_24` table in the sibling
`bitwig-linnstrument-24edo` project. Half-sharp spelling (`c`, `c+`, `c#`, `d-`)
and raw step numbers are both selectable; the maqam literature uses the former.

The dedicated quarter-tone accidentals 𝄲 and 𝄳 are deliberately not used — they
have no coverage in the monospace stack this site is set in.
