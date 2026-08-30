import { PIECES, type PieceDefinition } from '../catalog'
import { ROADMAP } from '../roadmap'
import { Piano } from './Piano'

interface LibraryProps {
  onSelect: (piece: PieceDefinition) => void
}

export function Library({ onSelect }: LibraryProps) {
  return (
    <main className="library-page">
      <nav className="library-nav" aria-label="Primary navigation">
        <a className="wordmark" href="#top">Type the Piano</a>
        <div className="library-nav-links">
          <a href="#library">Library</a>
          <a href="#roadmap">Roadmap</a>
          <a href={`${import.meta.env.BASE_URL}assets/NOTICE.txt`} target="_blank" rel="noopener noreferrer">Credits</a>
        </div>
      </nav>

      <section className="library-hero" id="top">
        <div className="library-hero-copy">
          <p className="eyebrow">CLASSICAL MUSIC, PLAYED BY TYPE</p>
          <h1><span>Your keyboard</span><span>is the instrument.</span></h1>
          <p>Choose a classical work. Every eligible keystroke advances the real performance by one musical event.</p>
          <a className="primary-link" href="#library">Choose a piece</a>
        </div>
        <div className="library-hero-instrument" aria-hidden="true">
          <p>88 keys. Any letter.</p>
          <Piano activeMidi={[]} subdued={false} />
        </div>
      </section>

      <section className="piece-library" id="library" aria-labelledby="library-heading">
        <div className="section-heading">
          <h2 id="library-heading">The library</h2>
          <p>Three performances, locally sampled and ready for a physical keyboard.</p>
        </div>
        <div className="piece-list">
          {PIECES.map((piece, index) => (
            <article className="piece-row" key={piece.id}>
              <span className="piece-index" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
              <div className="piece-identity">
                <p>{piece.composer}</p>
                <h3>{piece.title}</h3>
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

      <section className="how-it-works" aria-labelledby="how-heading">
        <div className="section-heading section-heading--compact">
          <h2 id="how-heading">From typing to music</h2>
        </div>
        <ol>
          <li><span>01</span><strong>Pick a performance</strong><p>Each piece uses a real MIDI realization, not generated notes.</p></li>
          <li><span>02</span><strong>Wake the piano</strong><p>One click unlocks 30 locally served grand-piano samples.</p></li>
          <li><span>03</span><strong>Find the rhythm</strong><p>Type the guide or use free play while the score handles pitch and timing.</p></li>
        </ol>
      </section>

      <section className="roadmap-section" id="roadmap" aria-labelledby="roadmap-heading">
        <div className="section-heading">
          <h2 id="roadmap-heading">Where this goes next</h2>
          <p>A public roadmap without invented deadlines. Completed work moves forward as the product earns it.</p>
        </div>
        <div className="roadmap-list">
          {ROADMAP.map((stage) => (
            <article className="roadmap-row" key={stage.label}>
              <p className="roadmap-label">{stage.label}</p>
              <div><h3>{stage.title}</h3><p>{stage.summary}</p></div>
              <ul>{stage.items.map((item) => <li key={item}>{item}</li>)}</ul>
            </article>
          ))}
        </div>
      </section>

      <footer className="library-footer">
        <p>Type the Piano</p>
        <p>Built for desktop browsers and physical keyboards.</p>
        <a href="https://github.com/sean35mm/type-the-piano" target="_blank" rel="noopener noreferrer">Source on GitHub</a>
      </footer>
    </main>
  )
}
