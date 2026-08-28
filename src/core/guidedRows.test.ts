import { describe, expect, it } from 'vitest'
import { guideBarWindow } from './guidedRows'
import type { GuidedText } from './guidedText'

const guide = (barCount: number): GuidedText => ({
  cells: Array.from({ length: barCount * 2 }, (_, packetIndex) => ({
    packetIndex,
    expected: 'a',
    wordIndex: packetIndex,
    beatStart: packetIndex % 2 === 0,
    barStart: packetIndex % 2 === 0,
  })),
  words: [],
  beats: [],
})

describe('guideBarWindow', () => {
  it('advances desktop start rows one bar at a time and clamps at total minus five', () => {
    const text = guide(10)
    expect([0, 1, 2].map((bar) => guideBarWindow(text, bar * 2, 5).startRow)).toEqual([0, 0, 0])
    expect([3, 4, 5].map((bar) => guideBarWindow(text, bar * 2, 5).startRow)).toEqual([1, 2, 3])
    expect([7, 8, 9].map((bar) => guideBarWindow(text, bar * 2, 5).startRow)).toEqual([5, 5, 5])
  })

  it('uses current bar minus one for narrow rows and clamps at total minus three', () => {
    const text = guide(8)
    expect([0, 1, 2, 3].map((bar) => guideBarWindow(text, bar * 2, 3).startRow)).toEqual([0, 0, 1, 2])
    expect([6, 7].map((bar) => guideBarWindow(text, bar * 2, 3).startRow)).toEqual([5, 5])
  })

  it('always includes the current bar, available upcoming bars, and valid final rows', () => {
    const text = guide(7)
    for (let bar = 0; bar < 7; bar += 1) {
      const window = guideBarWindow(text, bar * 2, 5)
      const indexes = window.visibleRows.map((row) => row.barIndex)
      expect(indexes).toContain(bar)
      expect(indexes.every((index) => index >= 0 && index < 7)).toBe(true)
      expect(indexes).toHaveLength(5)
    }
    expect(guideBarWindow(text, 12, 5).visibleRows.map((row) => row.barIndex)).toEqual([2, 3, 4, 5, 6])
  })

  it('changes start row only when the cursor crosses a bar boundary', () => {
    const text = guide(9)
    expect(guideBarWindow(text, 6, 5).startRow).toBe(1)
    expect(guideBarWindow(text, 7, 5).startRow).toBe(1)
    expect(guideBarWindow(text, 8, 5).startRow).toBe(2)
  })

  it('returns only available rows for a short final track', () => {
    const text = guide(2)
    expect(guideBarWindow(text, 3, 5)).toMatchObject({ currentBar: 1, startRow: 0 })
    expect(guideBarWindow(text, 3, 5).visibleRows.map((row) => row.barIndex)).toEqual([0, 1])
  })
})
