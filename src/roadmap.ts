export interface RoadmapStage {
  label: 'Now' | 'Next' | 'Later'
  title: string
  summary: string
  items: readonly string[]
}

export const ROADMAP: readonly RoadmapStage[] = [
  {
    label: 'Now',
    title: 'A classical library',
    summary: 'Choose a work, wake the piano, and type the performance from the first note to the last.',
    items: ['Three complete pieces', 'Guided and free play', 'Per-session WPM and accuracy'],
  },
  {
    label: 'Next',
    title: 'A practice history',
    summary: 'Keep useful progress on this device before accounts add any complexity.',
    items: ['Favorites', 'Recent performances', 'Personal bests'],
  },
  {
    label: 'Later',
    title: 'Progress that travels',
    summary: 'Optional accounts will sync practice data and open the door to deeper training tools.',
    items: ['Account sync', 'Long-term statistics', 'Daily practice'],
  },
]
