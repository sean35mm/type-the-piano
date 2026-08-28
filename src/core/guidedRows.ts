import type { GuidedText } from './guidedText'

export interface GuideBarRow {
  barIndex: number
  startCell: number
  endCell: number
}

export interface GuideBarWindow {
  currentBar: number
  startRow: number
  visibleRows: GuideBarRow[]
}

export function guideBarRows(guide: GuidedText): GuideBarRow[] {
  if (guide.cells.length === 0) return []
  const starts = guide.cells.flatMap((cell, index) => index === 0 || cell.barStart ? [index] : [])
  return starts.map((startCell, barIndex) => ({
    barIndex,
    startCell,
    endCell: starts[barIndex + 1] ?? guide.cells.length,
  }))
}

export function guideBarWindow(guide: GuidedText, cursor: number, rowCount: number): GuideBarWindow {
  const rows = guideBarRows(guide)
  if (rows.length === 0) return { currentBar: 0, startRow: 0, visibleRows: [] }
  const safeRowCount = Math.max(1, Math.floor(rowCount))
  const cellIndex = Math.min(Math.max(0, cursor), Math.max(0, guide.cells.length - 1))
  const currentBar = Math.max(0, rows.findIndex((row) => cellIndex >= row.startCell && cellIndex < row.endCell))
  const maximumStart = Math.max(0, rows.length - safeRowCount)
  const startRow = Math.min(maximumStart, Math.max(0, currentBar - Math.floor(safeRowCount / 2)))
  return { currentBar, startRow, visibleRows: rows.slice(startRow, startRow + safeRowCount) }
}
