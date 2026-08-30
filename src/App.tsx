import { useEffect, useState } from 'react'
import { findPieceBySlug, type PieceDefinition } from './catalog'
import Player from './Player'
import { Library } from './ui/Library'


export default function App() {
  const [selectedPiece, setSelectedPiece] = useState<PieceDefinition | null>(() =>
    findPieceBySlug(new URLSearchParams(window.location.search).get('piece')),
  )

  useEffect(() => {
    const syncLocation = () => setSelectedPiece(
      findPieceBySlug(new URLSearchParams(window.location.search).get('piece')),
    )
    window.addEventListener('popstate', syncLocation)
    return () => window.removeEventListener('popstate', syncLocation)
  }, [])

  useEffect(() => {
    document.title = selectedPiece
      ? `Type the Piano · ${selectedPiece.title}`
      : 'Type the Piano · Classical Library'
  }, [selectedPiece])

  const openPiece = (piece: PieceDefinition) => {
    const url = new URL(window.location.href)
    url.searchParams.set('piece', piece.slug)
    window.history.pushState({ selectedFromLibrary: true }, '', url)
    setSelectedPiece(piece)
    window.scrollTo({ top: 0 })
  }

  const openLibrary = () => {
    if (window.history.state?.selectedFromLibrary) {
      window.history.back()
      return
    }
    const url = new URL(window.location.href)
    url.searchParams.delete('piece')
    window.history.replaceState({}, '', url)
    setSelectedPiece(null)
    window.scrollTo({ top: 0 })
  }

  return selectedPiece
    ? <Player definition={selectedPiece} key={selectedPiece.id} onBack={openLibrary} />
    : <Library onSelect={openPiece} />
}
