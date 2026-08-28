import { useCallback, useEffect, useRef, useState } from 'react'
import { PianoEngine } from './audio/PianoEngine'
import { PerformanceTransport } from './core/PerformanceTransport'
import { guidedWordAnnouncement } from './core/guidedAccessibility'
import { generateGuidedText, type GuidedText } from './core/guidedText'
import { GuidedTypingSession, type GuidedTypingSnapshot } from './core/GuidedTypingSession'
import { fetchAndCompileMidi } from './core/midiCompiler'
import { PendingPublication } from './core/PendingPublication'
import { SuspensionReasons } from './core/SuspensionReasons'
import type { CompiledPiece, Packet } from './core/types'
import { guidedKeyAction, StageKeyboardController, type AcceptedKey } from './input/keyboard'
import { shouldRestoreStageFocus } from './input/stageFocus'
import { GuidedTextView } from './ui/GuidedTextView'
import { Piano } from './ui/Piano'

type Status = 'loading' | 'asleep' | 'waking' | 'ready' | 'active' | 'paused' | 'completed' | 'error'
type PlayMode = 'guided' | 'free'

const midiUrl = `${import.meta.env.BASE_URL}assets/midi/chopin-op25-no1-aeolian-harp.mid`

interface VisualSnapshot {
  generation: number
  engine: PianoEngine
  transport: PerformanceTransport
  midi: number[]
  name: string
  progress: number
  trail: string[]
  guided: GuidedTypingSnapshot | null
}

export default function App() {
  const [piece, setPiece] = useState<CompiledPiece | null>(null)
  const [guide, setGuide] = useState<GuidedText | null>(null)
  const [guideDisplay, setGuideDisplay] = useState<GuidedTypingSnapshot | null>(null)
  const [mode, setMode] = useState<PlayMode>('guided')
  const [guideHelper, setGuideHelper] = useState('')
  const [guidedAnnouncement, setGuidedAnnouncement] = useState('')
  const [modeAnnouncement, setModeAnnouncement] = useState('Guided mode selected.')
  const [status, setStatus] = useState<Status>('loading')
  const [error, setError] = useState('')
  const [activeMidi, setActiveMidi] = useState<number[]>([])
  const [eventName, setEventName] = useState('—')
  const [trail, setTrail] = useState<string[]>([])
  const [progress, setProgress] = useState(0)
  const [volume, setVolume] = useState(72)
  const [resumePending, setResumePending] = useState(false)
  const stageRef = useRef<HTMLDivElement>(null)
  const engineRef = useRef<PianoEngine | null>(null)
  const transportRef = useRef<PerformanceTransport | null>(null)
  const pauseTransport = useCallback(() => transportRef.current?.pause(), [])
  const resumeTransport = useCallback(() => transportRef.current?.resume(), [])
  const transportSuspensionsRef = useRef(new SuspensionReasons(() => {}, () => {}))
  const controllerRef = useRef<StageKeyboardController | null>(null)
  const statusRef = useRef(status)
  const modeRef = useRef<PlayMode>('guided')
  const guideSessionRef = useRef<GuidedTypingSession | null>(null)
  const announcedWordIndexRef = useRef(-1)
  const generationRef = useRef(0)
  const resumeOperationRef = useRef(0)
  const resumePendingRef = useRef(false)
  const visualRafRef = useRef<number | null>(null)
  const pendingVisualRef = useRef(new PendingPublication<VisualSnapshot>())
  const visualRef = useRef({ trail: [] as string[] })

  useEffect(() => { statusRef.current = status }, [status])

  useEffect(() => {
    const reasons = new SuspensionReasons(pauseTransport, resumeTransport)
    transportSuspensionsRef.current = reasons
    return () => reasons.clear()
  }, [pauseTransport, resumeTransport])

  useEffect(() => {
    let cancelled = false
    fetchAndCompileMidi(midiUrl).then((compiled) => {
      if (!cancelled) {
        const generatedGuide = generateGuidedText(compiled)
        const session = new GuidedTypingSession(generatedGuide)
        setPiece(compiled)
        setGuide(generatedGuide)
        guideSessionRef.current = session
        const snapshot = session.snapshot()
        setGuideDisplay(snapshot)
        announcedWordIndexRef.current = 0
        setGuidedAnnouncement(guidedWordAnnouncement(generatedGuide, snapshot))
        setStatus('asleep')
      }
    }).catch((cause: unknown) => {
      if (!cancelled) {
        setError(cause instanceof Error ? cause.message : 'The score could not be loaded.')
        setStatus('error')
      }
    })
    return () => { cancelled = true }
  }, [])

  const cancelVisualFrame = useCallback(() => {
    if (visualRafRef.current !== null) cancelAnimationFrame(visualRafRef.current)
    visualRafRef.current = null
  }, [])

  const publishVisualSnapshot = useCallback((snapshot: VisualSnapshot) => {
    if (
      generationRef.current !== snapshot.generation ||
      engineRef.current !== snapshot.engine ||
      transportRef.current !== snapshot.transport
    ) return false
    setActiveMidi(snapshot.midi)
    setEventName(snapshot.name)
    setProgress(snapshot.progress)
    setTrail(snapshot.trail)
    if (snapshot.guided) setGuideDisplay(snapshot.guided)
    setGuideHelper('')
    setStatus('active')
    return true
  }, [])

  const flushPendingVisual = useCallback(() => {
    cancelVisualFrame()
    const snapshot = pendingVisualRef.current.take(generationRef.current)
    return snapshot ? publishVisualSnapshot(snapshot) : false
  }, [cancelVisualFrame, publishVisualSnapshot])

  const discardPendingVisual = useCallback(() => {
    cancelVisualFrame()
    pendingVisualRef.current.discard()
  }, [cancelVisualFrame])

  const createTransport = useCallback((compiled: CompiledPiece, engine: PianoEngine) => {
    transportSuspensionsRef.current.clear()
    const generation = ++generationRef.current
    discardPendingVisual()
    transportRef.current?.dispose()
    transportRef.current = new PerformanceTransport(compiled, {
      attack(packet: Packet) {
        for (const note of packet.notes) engine.attack(note)
      },
      crossing(event) {
        if (event.kind === 'noteOff') engine.noteOff(event.noteId)
        else engine.setSustain(event.channel, event.down)
      },
      completed() {
        if (generationRef.current !== generation || engineRef.current !== engine) return
        flushPendingVisual()
        setActiveMidi([])
        setStatus('completed')
        setProgress(1)
        setGuideDisplay(guideSessionRef.current?.snapshot() ?? null)
      },
      silenceAll() { engine.silenceAll() },
      resetAll() { engine.resetScoreState() },
    })
    return { generation, transport: transportRef.current }
  }, [discardPendingVisual, flushPendingVisual])

  const announceGuidedProgress = useCallback((snapshot: GuidedTypingSnapshot, prefix = '') => {
    const guide = guideSessionRef.current?.guide
    const cell = guide?.cells[snapshot.cursor]
    const wordIndex = cell?.wordIndex ?? -1
    const changedWord = wordIndex >= 0 && wordIndex !== announcedWordIndexRef.current
    if (changedWord) announcedWordIndexRef.current = wordIndex
    const wordMessage = changedWord && guide ? guidedWordAnnouncement(guide, snapshot) : ''
    if (prefix || wordMessage) setGuidedAnnouncement([prefix, wordMessage].filter(Boolean).join(' '))
  }, [])

  const advanceAndPublish = useCallback((
    accepted: AcceptedKey,
    engine: PianoEngine,
    transport: PerformanceTransport,
    generation: number,
  ) => {
    if (
      generationRef.current !== generation ||
      engineRef.current !== engine ||
      transportRef.current !== transport ||
      !['ready', 'active'].includes(statusRef.current)
    ) return
    if (modeRef.current === 'guided' && guideSessionRef.current?.cursor !== transport.nextPacketIndex) return
    const packet = transport.advance(performance.now())
    if (!packet) return
    const guidedSnapshot = modeRef.current === 'guided'
      ? (() => {
          const session = guideSessionRef.current
          const clearedTypo = session?.snapshot().pendingActual != null
          session?.commitCorrect(packet.index, performance.now())
          const snapshot = session?.snapshot() ?? null
          if (snapshot) announceGuidedProgress(snapshot, clearedTypo ? 'Typo cleared.' : '')
          return snapshot
        })()
      : null
    if (modeRef.current === 'free') {
      visualRef.current.trail = [...visualRef.current.trail, accepted.label].slice(-24)
    }
    const snapshot = {
      generation,
      engine,
      transport,
      midi: [...new Set(packet.notes.map((note) => note.midi))],
      name: packet.notes.map((note) => note.name.replace(/(\D)#/, '$1♯')).join(' · '),
      progress: transport.progress,
      trail: visualRef.current.trail,
      guided: guidedSnapshot,
    }
    pendingVisualRef.current.queue(generation, snapshot)
    cancelVisualFrame()
    visualRafRef.current = requestAnimationFrame(() => {
      visualRafRef.current = null
      flushPendingVisual()
    })
  }, [announceGuidedProgress, cancelVisualFrame, flushPendingVisual])

  const acceptKey = useCallback((accepted: AcceptedKey) => {
    if (!['ready', 'active'].includes(statusRef.current) || resumePendingRef.current) return
    if (modeRef.current === 'guided') {
      const action = guidedKeyAction(accepted)
      if (action === 'backspace') {
        const session = guideSessionRef.current
        const hadError = session?.snapshot().pendingActual != null
        session?.clearError()
        setGuideDisplay(session?.snapshot() ?? null)
        setGuideHelper(hadError ? 'Typo cleared. Type the expected character.' : 'Nothing to clear. Music only moves forward.')
        if (hadError) setGuidedAnnouncement('Typo cleared.')
        return
      }
      if (action === 'ignore') return
      const session = guideSessionRef.current
      const evaluation = session?.evaluate(accepted.key, performance.now())
      if (!evaluation?.correct) {
        session?.recordWrong(accepted.key)
        setGuideDisplay(session?.snapshot() ?? null)
        const expected = evaluation?.expected === ' ' ? 'SPACE' : evaluation?.expected?.toUpperCase()
        setGuideHelper(`Expected ${expected ?? 'the next character'}. Backspace clears the current typo.`)
        const actual = accepted.key === ' ' ? 'space' : accepted.key
        setGuidedAnnouncement(`Incorrect character ${actual}. Press Backspace to clear it, or type the expected character.`)
        return
      }
    }
    const engine = engineRef.current
    const transport = transportRef.current
    if (!engine || !transport) return
    const generation = generationRef.current
    if (engine.isRunning) {
      advanceAndPublish(accepted, engine, transport, generation)
      return
    }
    resumePendingRef.current = true
    setResumePending(true)
    const resumeOperation = ++resumeOperationRef.current
    void (async () => {
      try {
        await engine.resume()
        if (
          generationRef.current === generation &&
          resumeOperationRef.current === resumeOperation &&
          engineRef.current === engine &&
          transportRef.current === transport &&
          engine.isRunning
        ) advanceAndPublish(accepted, engine, transport, generation)
      } catch (cause) {
        if (generationRef.current === generation && resumeOperationRef.current === resumeOperation && engineRef.current === engine) {
          engine.silenceAll()
          setError(cause instanceof Error ? cause.message : 'Audio could not resume.')
          setStatus('error')
        }
      } finally {
        if (generationRef.current === generation && resumeOperationRef.current === resumeOperation && engineRef.current === engine) {
          resumePendingRef.current = false
          setResumePending(false)
        }
      }
    })()
  }, [advanceAndPublish])

  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return
    const controller = new StageKeyboardController(acceptKey)
    controllerRef.current = controller
    const keydown = (event: KeyboardEvent) => {
      if (event.code === 'Escape' && ['ready', 'active'].includes(statusRef.current)) {
        event.preventDefault()
        resumeOperationRef.current += 1
        resumePendingRef.current = false
        setResumePending(false)
        flushPendingVisual()
        guideSessionRef.current?.suspend('pause', performance.now())
        setGuideDisplay(guideSessionRef.current?.snapshot() ?? null)
        transportSuspensionsRef.current.suspend('explicit')
        controller.clear()
        setActiveMidi([])
        setStatus('paused')
        return
      }
      if (resumePendingRef.current) return
      controller.keydown(event)
    }
    const keyup = (event: KeyboardEvent) => controller.keyup(event)
    const silence = (reason: 'blur' | 'hidden') => {
      resumeOperationRef.current += 1
      resumePendingRef.current = false
      setResumePending(false)
      flushPendingVisual()
      guideSessionRef.current?.suspend(reason, performance.now())
      setGuideDisplay(guideSessionRef.current?.snapshot() ?? null)
      transportSuspensionsRef.current.suspend(reason)
      controller.clear()
      setActiveMidi([])
    }
    const visibility = () => {
      if (document.hidden) silence('hidden')
      else {
        guideSessionRef.current?.resume('hidden', performance.now())
        setGuideDisplay(guideSessionRef.current?.snapshot() ?? null)
        transportSuspensionsRef.current.release('hidden')
      }
    }
    const blur = () => silence('blur')
    const focus = () => {
      guideSessionRef.current?.resume('blur', performance.now())
      setGuideDisplay(guideSessionRef.current?.snapshot() ?? null)
      transportSuspensionsRef.current.release('blur')
      const generation = generationRef.current
      const activeElement = document.activeElement
      const focusAllowsRestore = activeElement === null || activeElement === document.body || activeElement === stage || activeElement instanceof HTMLElement && activeElement.dataset.restoreStageFocus === 'true'
      if (!shouldRestoreStageFocus(statusRef.current, focusAllowsRestore)) return
      requestAnimationFrame(() => {
        const currentActiveElement = document.activeElement
        const stillAllowsRestore = currentActiveElement === null || currentActiveElement === document.body || currentActiveElement === stage || currentActiveElement instanceof HTMLElement && currentActiveElement.dataset.restoreStageFocus === 'true'
        if (generationRef.current === generation && shouldRestoreStageFocus(statusRef.current, stillAllowsRestore)) stage.focus()
      })
    }
    stage.addEventListener('keydown', keydown)
    stage.addEventListener('keyup', keyup)
    window.addEventListener('blur', blur)
    window.addEventListener('focus', focus)
    document.addEventListener('visibilitychange', visibility)
    return () => {
      stage.removeEventListener('keydown', keydown)
      stage.removeEventListener('keyup', keyup)
      window.removeEventListener('blur', blur)
      window.removeEventListener('focus', focus)
      document.removeEventListener('visibilitychange', visibility)
      controller.clear()
      if (controllerRef.current === controller) controllerRef.current = null
    }
  }, [acceptKey, flushPendingVisual])

  useEffect(() => () => {
    generationRef.current += 1
    resumeOperationRef.current += 1
    transportSuspensionsRef.current.clear()
    discardPendingVisual()
    transportRef.current?.dispose()
    void engineRef.current?.dispose()
  }, [discardPendingVisual])

  const wake = async () => {
    if (!piece || status === 'waking') return
    setStatus('waking')
    setError('')
    const operation = ++generationRef.current
    resumeOperationRef.current += 1
    discardPendingVisual()
    try {
      const engine = new PianoEngine()
      engine.setVolume(volume / 100)
      engineRef.current = engine
      await engine.wake()
      if (generationRef.current !== operation || engineRef.current !== engine) {
        await engine.dispose()
        return
      }
      const installed = createTransport(piece, engine)
      setStatus('ready')
      requestAnimationFrame(() => {
        if (generationRef.current === installed.generation) stageRef.current?.focus()
      })
    } catch (cause) {
      if (generationRef.current !== operation) return
      setError(cause instanceof Error ? cause.message : 'The piano could not wake.')
      setStatus('error')
      engineRef.current?.resetScoreState()
      await engineRef.current?.dispose()
      engineRef.current = null
    }
  }

  const togglePause = async () => {
    if (resumePendingRef.current) return
    if (status === 'paused') {
      const engine = engineRef.current
      const transport = transportRef.current
      if (!engine || !transport) return
      const generation = generationRef.current
      const resumeOperation = ++resumeOperationRef.current
      resumePendingRef.current = true
      setResumePending(true)
      try {
        await engine.resume()
        if (
          generationRef.current !== generation ||
          resumeOperationRef.current !== resumeOperation ||
          engineRef.current !== engine ||
          transportRef.current !== transport
        ) return
        guideSessionRef.current?.resume('pause', performance.now())
        setGuideDisplay(guideSessionRef.current?.snapshot() ?? null)
        transportSuspensionsRef.current.release('explicit')
        setStatus(transport.progress > 0 ? 'active' : 'ready')
        stageRef.current?.focus()
      } catch (cause) {
        if (generationRef.current === generation && resumeOperationRef.current === resumeOperation) {
          setError(cause instanceof Error ? cause.message : 'Audio could not resume.')
          setStatus('error')
        }
      } finally {
        if (generationRef.current === generation && resumeOperationRef.current === resumeOperation && engineRef.current === engine) {
          resumePendingRef.current = false
          setResumePending(false)
        }
      }
    } else {
      resumeOperationRef.current += 1
      flushPendingVisual()
      guideSessionRef.current?.suspend('pause', performance.now())
      setGuideDisplay(guideSessionRef.current?.snapshot() ?? null)
      transportSuspensionsRef.current.suspend('explicit')
      controllerRef.current?.clear()
      setActiveMidi([])
      setStatus('paused')
    }
  }

  const restart = () => {
    const engine = engineRef.current
    if (!piece || !engine || resumePendingRef.current) return
    resumeOperationRef.current += 1
    createTransport(piece, engine)
    guideSessionRef.current?.reset()
    const snapshot = guideSessionRef.current?.snapshot() ?? null
    setGuideDisplay(snapshot)
    announcedWordIndexRef.current = 0
    setGuidedAnnouncement(snapshot && guide ? guidedWordAnnouncement(guide, snapshot) : '')
    setGuideHelper('')
    controllerRef.current?.clear()
    visualRef.current.trail = []
    setActiveMidi([])
    setEventName('—')
    setTrail([])
    setProgress(0)
    setStatus('ready')
    stageRef.current?.focus()
  }

  const switchMode = (nextMode: PlayMode) => {
    if (nextMode === mode || resumePendingRef.current || status === 'waking') return
    modeRef.current = nextMode
    setMode(nextMode)
    setModeAnnouncement(`${nextMode === 'guided' ? 'Guided' : 'Free play'} mode selected. Performance restarted.`)
    resumeOperationRef.current += 1
    transportSuspensionsRef.current.clear()
    controllerRef.current?.clear()
    guideSessionRef.current?.reset()
    const snapshot = guideSessionRef.current?.snapshot() ?? null
    setGuideDisplay(snapshot)
    announcedWordIndexRef.current = nextMode === 'guided' ? 0 : -1
    setGuidedAnnouncement(nextMode === 'guided' && snapshot && guide ? guidedWordAnnouncement(guide, snapshot) : '')
    setGuideHelper('')
    visualRef.current.trail = []
    setTrail([])
    setActiveMidi([])
    setEventName('—')
    setProgress(0)
    const engine = engineRef.current
    if (piece && engine) {
      createTransport(piece, engine)
      setStatus('ready')
    }
    requestAnimationFrame(() => stageRef.current?.focus())
  }

  const copy = {
    loading: 'Reading the score…', asleep: 'The piano is sleeping.', waking: 'Tuning the piano…',
    ready: mode === 'guided' ? 'Type the words. Correct keys play the next note.' : 'Type any key. The music knows the rest.',
    active: 'Keep going.', paused: 'Paused.',
    completed: 'You played Aeolian Harp.', error: 'The piano is unavailable.',
  }[status]

  const promptCell = mode === 'guided' && guideDisplay ? guide?.cells[guideDisplay.cursor] : undefined
  const promptWord = promptCell ? guide?.words[promptCell.wordIndex]?.text : undefined
  const accessibleGuidePrompt = guideDisplay?.completed
    ? 'Guide complete.'
    : promptCell && promptWord
      ? `Current word ${promptWord}. Expected character ${promptCell.expected === ' ' ? 'space' : promptCell.expected}.`
      : 'Guided typing prompt is loading.'

  return (
    <main className="instrument">
      <header className="masthead">
        <div>
          <p className="eyebrow">TYPE THE PIANO</p>
          <h1>Aeolian Harp</h1>
          <p className="subtitle">Étude in A♭ major, Op. 25 No. 1 · Frédéric Chopin</p>
        </div>
        <div className="controls">
          <div className="mode-switch" aria-label="Play mode">
            <button type="button" aria-pressed={mode === 'guided'} onClick={() => switchMode('guided')} disabled={resumePending || status === 'waking'}>Guided</button>
            <button type="button" aria-pressed={mode === 'free'} onClick={() => switchMode('free')} disabled={resumePending || status === 'waking'}>Free play</button>
          </div>
          {mode === 'guided' && <span className="guided-wpm" aria-label={`Words per minute ${guideDisplay?.wpm ?? 'not available yet'}`}>WPM <strong>{guideDisplay?.wpm ?? '—'}</strong></span>}
          <button type="button" onClick={togglePause} disabled={resumePending || !['ready', 'active', 'paused'].includes(status)}>
            {status === 'paused' ? 'Resume' : 'Pause'}
          </button>
          <button type="button" onClick={restart} disabled={resumePending || ['loading', 'asleep', 'waking', 'error'].includes(status)}>Restart</button>
          <label className="volume">Volume
            <input type="range" min="0" max="100" value={volume} onChange={(event) => {
              const next = Number(event.target.value)
              setVolume(next)
              engineRef.current?.setVolume(next / 100)
            }} />
          </label>
        </div>
      </header>

      <div className="progress-row">
        <span>{Math.round(progress * 100).toString().padStart(2, '0')}%</span>
        <progress value={progress} max="1" aria-label="Performance progress" />
        <span>{piece?.packets.length.toLocaleString() ?? '—'} EVENTS</span>
      </div>

      <section
        className="stage"
        ref={stageRef}
        tabIndex={0}
        aria-label="Performance stage. Type eligible keys to play the next musical event."
        aria-describedby={mode === 'guided' ? 'guided-prompt' : undefined}
        onClick={(event) => {
          const target = event.target
          if (!(target instanceof Element) || !target.closest('button, input, select, textarea, a, [contenteditable="true"], [role="button"], [role="slider"]')) {
            event.currentTarget.focus()
          }
        }}
      >
        {mode === 'guided' && <span className="sr-only" id="guided-prompt">{accessibleGuidePrompt}</span>}
        <div className="event-display">
          <p className="event-label">CURRENT MUSICAL EVENT</p>
          <p className="event-name">{eventName}</p>
          {mode === 'guided' && guide && guideDisplay
            ? <GuidedTextView guide={guide} snapshot={guideDisplay} />
            : <div className="typing-trail" aria-label="Recent typing">
                {trail.map((character, index) => (
                  <span className={index === trail.length - 1 ? 'newest' : ''} key={`${index}-${character}`}>{character}</span>
                ))}
              </div>}
        </div>

        <div className="state-copy">
          <p aria-live="polite">{copy}</p>
          <span className="sr-only" aria-live="polite">{modeAnnouncement}</span>
          <span className="sr-only" aria-live="polite" aria-atomic="true">{guidedAnnouncement}</span>
          {(status === 'asleep' || status === 'ready') && <small>Physical keyboard required.</small>}
          {mode === 'guided' && guideHelper && <small className="guide-helper">{guideHelper}</small>}
          {mode === 'guided' && status === 'ready' && !guideHelper && <small>Wrong keys stay silent. Backspace clears the current typo.</small>}
          {status === 'asleep' && <>
            <button className="wake" type="button" onClick={wake}>Wake the piano</button>
            <small>Your browser needs one click before the first note.</small>
          </>}
          {status === 'waking' && <small>Loading 30 local piano samples.</small>}
          {status === 'completed' && <>
            <small>Every guide character found its note.</small>
            {mode === 'guided' && guideDisplay && <small className="guide-summary">{Math.round(guideDisplay.accuracy * 100)}% matched · {guideDisplay.wpm ?? '—'} WPM</small>}
            <button className="wake" type="button" onClick={restart}>Play again</button>
          </>}
          {status === 'error' && <>
            <small className="error" role="alert">{error}</small>
            <button className="wake" type="button" onClick={() => window.location.reload()}>Try again</button>
          </>}
        </div>

        <Piano activeMidi={activeMidi} subdued={!['ready', 'active', 'paused', 'completed'].includes(status)} />
      </section>
      <footer className="site-footer">
        <a href={`${import.meta.env.BASE_URL}assets/NOTICE.txt`} target="_blank" rel="noopener noreferrer" aria-label="Credits and third-party notices (opens in a new tab)" data-restore-stage-focus="true">Credits</a>
      </footer>
    </main>
  )
}
