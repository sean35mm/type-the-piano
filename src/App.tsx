import { useEffect, useState } from 'react'
import { DEFAULT_PIECE, findPieceBySlug, type PieceDefinition } from './catalog'
import Player from './Player'
import { About } from './ui/About'
import { Library } from './ui/Library'

type View = 'player' | 'catalog' | 'about'

interface ShellState {
  view: View
  piece: PieceDefinition
}

function readShellState(): ShellState {
  const params = new URLSearchParams(window.location.search)
  const requestedView = params.get('view')
  const view = requestedView === 'catalog' || requestedView === 'about' ? requestedView : 'player'
  return {
    view,
    piece: findPieceBySlug(params.get('piece')) ?? DEFAULT_PIECE,
  }
}

export default function App() {
  const [shell, setShell] = useState<ShellState>(readShellState)

  useEffect(() => {
    const syncLocation = () => setShell(readShellState())
    window.addEventListener('popstate', syncLocation)
    return () => window.removeEventListener('popstate', syncLocation)
  }, [])

  useEffect(() => {
    document.title = shell.view === 'player'
      ? `Type the Piano · ${shell.piece.title}`
      : `Type the Piano · ${shell.view === 'catalog' ? 'Catalog' : 'About'}`
  }, [shell])

  const navigate = (view: View, piece = shell.piece) => {
    const url = new URL(window.location.href)
    if (view === 'player') url.searchParams.delete('view')
    else url.searchParams.set('view', view)
    if (piece.id === DEFAULT_PIECE.id) url.searchParams.delete('piece')
    else url.searchParams.set('piece', piece.slug)
    window.history.pushState({}, '', url)
    setShell({ view, piece })
    window.scrollTo({ top: 0 })
  }

  if (shell.view === 'catalog') {
    return (
      <Library
        currentPiece={shell.piece}
        onAbout={() => navigate('about')}
        onPlayer={() => navigate('player')}
        onSelect={(piece) => navigate('player', piece)}
      />
    )
  }

  if (shell.view === 'about') {
    return (
      <About
        currentPiece={shell.piece}
        onCatalog={() => navigate('catalog')}
        onPlayer={() => navigate('player')}
      />
    )
  }

  return (
    <Player
      definition={shell.piece}
      key={shell.piece.id}
      onAbout={() => navigate('about')}
      onCatalog={() => navigate('catalog')}
      onSelect={(piece) => navigate('player', piece)}
    />
  )
}
