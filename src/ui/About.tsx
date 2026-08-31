import type { PieceDefinition } from '../catalog'
import { ROADMAP } from '../roadmap'

interface AboutProps {
  currentPiece: PieceDefinition
  onCatalog: () => void
  onPlayer: () => void
}

export function About({ currentPiece, onCatalog, onPlayer }: AboutProps) {
  return (
    <main className="info-page">
      <nav className="info-nav" aria-label="Primary navigation">
        <button className="wordmark" type="button" onClick={onPlayer}>Type the Piano</button>
        <div>
          <button type="button" onClick={onPlayer}>Play {currentPiece.title}</button>
          <button type="button" onClick={onCatalog}>Catalog</button>
        </div>
      </nav>

      <header className="info-header">
        <p className="eyebrow">ABOUT THE PROJECT</p>
        <h1>Type first.<br />Hear the score.</h1>
        <p>Type the Piano turns a physical keyboard into a performance interface. You control momentum and rhythm while the score supplies every pitch.</p>
      </header>

      <section className="about-method" aria-labelledby="method-heading">
        <h2 id="method-heading">How it works</h2>
        <ol>
          <li><span>01</span><div><strong>Choose a performance</strong><p>Each piece uses a credited MIDI realization and locally served grand-piano samples.</p></div></li>
          <li><span>02</span><div><strong>Wake the piano</strong><p>One click unlocks browser audio. No account, upload, or installation is required.</p></div></li>
          <li><span>03</span><div><strong>Type the music</strong><p>Follow the guide for accuracy and WPM, or use free play to focus only on momentum.</p></div></li>
        </ol>
      </section>

      <section className="about-roadmap" aria-labelledby="about-roadmap-heading">
        <div className="info-section-heading">
          <h2 id="about-roadmap-heading">Roadmap</h2>
          <p>Progressive releases, without invented deadlines.</p>
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

      <footer className="info-footer">
        <p>No accounts, analytics, advertising, or application backend.</p>
        <div>
          <a href={`${import.meta.env.BASE_URL}assets/NOTICE.txt`} target="_blank" rel="noopener noreferrer">Credits</a>
          <a href="https://github.com/sean35mm/type-the-piano" target="_blank" rel="noopener noreferrer">Source</a>
        </div>
      </footer>
    </main>
  )
}
