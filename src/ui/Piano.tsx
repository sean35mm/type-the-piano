import { useMemo } from 'react'

interface PianoProps {
  activeMidi: number[]
  subdued: boolean
}

const BLACK_PITCH_CLASSES = new Set([1, 3, 6, 8, 10])
const isBlack = (midi: number) => BLACK_PITCH_CLASSES.has(midi % 12)

export function Piano({ activeMidi, subdued }: PianoProps) {
  const keys = useMemo(() => Array.from({ length: 88 }, (_, index) => index + 21), [])
  const active = new Set(activeMidi)
  let whiteBefore = 0

  return (
    <div className={`piano-shell${subdued ? ' piano-shell--subdued' : ''}`} aria-label="88-key piano">
      <div className="piano" aria-hidden="true">
        {keys.filter((midi) => !isBlack(midi)).map((midi) => (
          <span key={midi} className={`piano-key piano-key--white${active.has(midi) ? ' is-active' : ''}`} />
        ))}
        {keys.map((midi) => {
          if (!isBlack(midi)) {
            whiteBefore += 1
            return null
          }
          const left = (whiteBefore / 52) * 100
          return (
            <span
              key={midi}
              className={`piano-key piano-key--black${active.has(midi) ? ' is-active' : ''}`}
              style={{ left: `${left}%` }}
            />
          )
        })}
      </div>
    </div>
  )
}
