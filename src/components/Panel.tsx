import type { ReactNode } from 'react'

interface Props {
  title: string
  children: ReactNode
  aside?: ReactNode
}

export function Panel({ title, children, aside }: Props) {
  return (
    <section className="panel">
      <h2 className="row" style={{ justifyContent: 'space-between' }}>
        <span>{title}</span>
        {aside}
      </h2>
      <div className="body">{children}</div>
    </section>
  )
}
