export type PieceDifficulty = 'Intermediate' | 'Advanced'

export interface PieceDefinition {
  id: string
  slug: string
  title: string
  work: string
  composer: string
  period: string
  difficulty: PieceDifficulty
  durationLabel: string
  description: string
  midiUrl: string
  trackNames: readonly string[]
}

const assetUrl = (path: string) => `${import.meta.env.BASE_URL}${path}`

export const PIECES: readonly PieceDefinition[] = [
  {
    id: 'chopin-op25-no1',
    slug: 'aeolian-harp',
    title: 'Aeolian Harp',
    work: 'Étude in A-flat major, Op. 25 No. 1',
    composer: 'Frédéric Chopin',
    period: 'Romantic',
    difficulty: 'Advanced',
    durationLabel: '3 min',
    description: 'A bright cascade of arpeggios with a melody carried inside the motion.',
    midiUrl: assetUrl('assets/midi/chopin-op25-no1-aeolian-harp.mid'),
    trackNames: ['Piano right', 'Piano right 2', 'Piano left'],
  },
  {
    id: 'beethoven-woo59',
    slug: 'fur-elise',
    title: 'Für Elise',
    work: 'Bagatelle in A minor, WoO 59',
    composer: 'Ludwig van Beethoven',
    period: 'Romantic',
    difficulty: 'Intermediate',
    durationLabel: '3 min',
    description: 'An intimate opening theme that grows into quick, restless contrasts.',
    midiUrl: assetUrl('assets/midi/beethoven-woo59-fur-elise.mid'),
    trackNames: ['Piano right', 'Piano left'],
  },
  {
    id: 'debussy-clair-de-lune',
    slug: 'clair-de-lune',
    title: 'Clair de lune',
    work: 'Suite bergamasque, L. 75, No. 3',
    composer: 'Claude Debussy',
    period: 'Impressionist',
    difficulty: 'Advanced',
    durationLabel: '4 min',
    description: 'A spacious nocturne that moves from stillness into luminous waves.',
    midiUrl: assetUrl('assets/midi/debussy-clair-de-lune.mid'),
    trackNames: ['Piano right', 'Piano left'],
  },
]

export const DEFAULT_PIECE = PIECES[0]!

export function findPieceBySlug(slug: string | null): PieceDefinition | null {
  if (!slug) return null
  return PIECES.find((piece) => piece.slug === slug) ?? null
}
