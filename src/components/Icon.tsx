interface IconProps {
  d: string
  size?: number
  label?: string
}

/** hand-authored inline paths — no icon library. */
export function Icon({ d, size = 14, label }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? 'img' : undefined}
      style={{ verticalAlign: '-0.1em' }}
    >
      <path d={d} />
    </svg>
  )
}

export const PLAY = 'M8 5v14l11-7z'
export const STOP = 'M6 6h12v12H6z'
export const DOWNLOAD = 'M5 20h14v-2H5v2zM19 9h-4V3H9v6H5l7 7 7-7z'
export const DICE =
  'M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zM8 17a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm0-6a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm4 3a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm4 3a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm0-6a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z'
