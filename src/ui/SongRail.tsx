import { PIECES, type PieceDefinition } from '../catalog'

interface SongRailProps {
  activePiece: PieceDefinition
  onAbout: () => void
  onCatalog: () => void
  onSelect: (piece: PieceDefinition) => void
}

export function SongRail({ activePiece, onAbout, onCatalog, onSelect }: SongRailProps) {
  return (
    <>
      <div className="song-picker-mobile">
        <label htmlFor="song-picker">Piece</label>
        <select
          id="song-picker"
          value={activePiece.slug}
          onChange={(event) => {
            const piece = PIECES.find((candidate) => candidate.slug === event.target.value)
            if (piece) onSelect(piece)
          }}
        >
          {PIECES.map((piece) => <option key={piece.id} value={piece.slug}>{piece.title}</option>)}
        </select>
        <button type="button" onClick={onCatalog}>Catalog</button>
        <button type="button" onClick={onAbout}>About</button>
      </div>

      <aside className="song-rail" aria-label="Choose a piece">
        <p className="song-rail-label">Pieces</p>
        <div className="song-rail-list">
          {PIECES.map((piece, index) => (
            <button
              type="button"
              className="song-rail-item"
              aria-current={piece.id === activePiece.id ? 'true' : undefined}
              key={piece.id}
              onClick={() => onSelect(piece)}
            >
              <span>{String(index + 1).padStart(2, '0')}</span>
              <strong>{piece.title}</strong>
              <small>{piece.composer}</small>
            </button>
          ))}
        </div>
        <nav className="song-rail-nav" aria-label="More information">
          <button type="button" onClick={onCatalog}>Full catalog</button>
          <button type="button" onClick={onAbout}>About</button>
        </nav>
      </aside>
    </>
  )
}
