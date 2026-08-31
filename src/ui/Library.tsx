import { PIECES, type PieceDefinition } from '../catalog'

interface LibraryProps {
  currentPiece: PieceDefinition
  onAbout: () => void
  onPlayer: () => void
  onSelect: (piece: PieceDefinition) => void
}

export function Library({ currentPiece, onAbout, onPlayer, onSelect }: LibraryProps) {
  return (
    <main className="info-page catalog-page">
      <nav className="info-nav" aria-label="Primary navigation">
        <button className="wordmark" type="button" onClick={onPlayer}>Type the Piano</button>
        <div>
          <button type="button" onClick={onPlayer}>Play {currentPiece.title}</button>
          <button type="button" onClick={onAbout}>About</button>
        </div>
      </nav>

      <header className="catalog-header">
        <p className="eyebrow">ALL PERFORMANCES</p>
        <h1>Classical catalog</h1>
        <p>Choose a work and return directly to the keyboard.</p>
      </header>

      <section className="piece-library" aria-label="Classical pieces">
        <div className="piece-list">
          {PIECES.map((piece, index) => (
            <article className="piece-row" key={piece.id}>
              <span className="piece-index" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
              <div className="piece-identity">
                <p>{piece.composer}</p>
                <h2>{piece.title}</h2>
                <span>{piece.work}</span>
              </div>
              <p className="piece-description">{piece.description}</p>
              <dl className="piece-facts">
                <div><dt>Level</dt><dd>{piece.difficulty}</dd></div>
                <div><dt>Length</dt><dd>{piece.durationLabel}</dd></div>
                <div><dt>Period</dt><dd>{piece.period}</dd></div>
              </dl>
              <button className="piece-play" type="button" onClick={() => onSelect(piece)}>Play {piece.title}</button>
            </article>
          ))}
        </div>
      </section>

      <footer className="info-footer">
        <p>Three credited performances. More pieces will arrive gradually.</p>
        <a href={`${import.meta.env.BASE_URL}assets/NOTICE.txt`} target="_blank" rel="noopener noreferrer">Credits</a>
      </footer>
    </main>
  )
}
