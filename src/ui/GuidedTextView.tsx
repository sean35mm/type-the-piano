import { useEffect, useRef } from 'react'
import { guideBarRows, guideBarWindow } from '../core/guidedRows'
import type { GuidedText } from '../core/guidedText'
import type { GuidedTypingSnapshot } from '../core/GuidedTypingSession'

interface GuidedTextViewProps {
  guide: GuidedText
  snapshot: GuidedTypingSnapshot
}

interface GuideTrackProps extends GuidedTextViewProps {
  rowCount: number
  className: string
}

const ROW_STEP_PX = 32

function GuideTrack({ guide, snapshot, rowCount, className }: GuideTrackProps) {
  const rows = guideBarRows(guide)
  const window = guideBarWindow(guide, snapshot.cursor, rowCount)
  const viewportRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const current = viewportRef.current?.querySelector<HTMLElement>('.is-current')
    const row = current?.closest<HTMLElement>('.guide-row')
    if (!current || !row) return
    const left = current.offsetLeft
    if (left < row.scrollLeft || left + current.offsetWidth > row.scrollLeft + row.clientWidth) {
      row.scrollLeft = Math.max(0, left - row.clientWidth / 2)
    }
  }, [window.startRow, snapshot.cursor])

  return (
    <div className={`guide-viewport ${className}`} ref={viewportRef}>
      <div className="guide-track" style={{ transform: `translate3d(0, -${window.startRow * ROW_STEP_PX}px, 0)` }}>
        {rows.map((row) => (
          <div className="guide-row" key={row.barIndex}>
            {guide.cells.slice(row.startCell, row.endCell).map((cell) => {
              const completed = cell.packetIndex < snapshot.cursor
              const current = cell.packetIndex === snapshot.cursor
              const pending = current ? snapshot.pendingActual : null
              const classes = [
                'guide-character',
                completed ? 'is-correct' : '',
                current ? 'is-current' : '',
                pending !== null ? 'has-pending-error' : '',
                cell.expected === ' ' ? 'is-space' : '',
                cell.beatStart && cell.packetIndex !== row.startCell ? 'is-beat-start' : '',
              ].filter(Boolean).join(' ')
              const glyph = pending ?? cell.expected
              return <span className={classes} key={cell.packetIndex}>{glyph === ' ' ? '·' : glyph}</span>
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

export function GuidedTextView({ guide, snapshot }: GuidedTextViewProps) {
  return (
    <div className="guide-pages" aria-hidden="true">
      <GuideTrack guide={guide} snapshot={snapshot} rowCount={5} className="guide-viewport--desktop" />
      <GuideTrack guide={guide} snapshot={snapshot} rowCount={3} className="guide-viewport--mobile" />
    </div>
  )
}
