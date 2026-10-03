import { useCallback, useEffect, useRef, useState } from 'react'
import { Icon } from '../ui/Icon'
import { Ring } from '../ui/primitives'
import { pushToast } from '../ui/Toast'
import { store, useAppState } from '../../lib/store'
import { exerciseName } from '../../data/exercises'
import { formatTimer } from '../../lib/format'

/**
 * The rest timer.
 *
 * Lives in the store rather than in component state so that navigating away,
 * reloading the page or backgrounding the tab does not lose it — the draft (and
 * therefore the timer) is persisted, and the countdown is derived from an
 * absolute `endsAt` timestamp rather than decremented locally, so it stays
 * correct even when the interval is throttled.
 */

const PRESETS = [45, 60, 90, 120, 180, 240]

/** A short two-tone chime from the WebAudio API — no audio file to ship. */
function chime(enabled: boolean) {
  if (!enabled) return
  try {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return
    const ctx = new Ctor()
    const now = ctx.currentTime
    for (const [offset, freq] of [
      [0, 660],
      [0.16, 880],
    ] as [number, number][]) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0.0001, now + offset)
      gain.gain.exponentialRampToValueAtTime(0.22, now + offset + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.34)
      osc.connect(gain).connect(ctx.destination)
      osc.start(now + offset)
      osc.stop(now + offset + 0.36)
    }
    window.setTimeout(() => void ctx.close(), 900)
  } catch {
    /* Audio is a nicety; never let it break the timer. */
  }
}

export interface RestTimerProps {
  /** Called once when the countdown reaches zero. */
  onComplete?: () => void
  compact?: boolean
}

export function RestTimer({ onComplete, compact = false }: RestTimerProps) {
  const { draft, data } = useAppState()
  const rest = draft?.rest ?? null
  const [custom, setCustom] = useState(data.preferences.defaultRestSec)
  const announcedRef = useRef(false)
  const running = rest != null && rest.endsAt != null

  // Drive the countdown. 250 ms keeps the display smooth without hammering the
  // store; tickRest() itself ignores sub-250 ms changes.
  useEffect(() => {
    if (!running) return
    const id = window.setInterval(() => store.tickRest(), 250)
    return () => window.clearInterval(id)
  }, [running])

  const finished = rest != null && !running && rest.remainingSec <= 0

  useEffect(() => {
    if (!finished) {
      announcedRef.current = false
      return
    }
    if (announcedRef.current) return
    announcedRef.current = true
    chime(data.preferences.sound)
    pushToast({
      title: 'Rest complete',
      text: 'Next set is ready when you are.',
      tone: 'good',
      icon: 'timer',
      duration: 4200,
    })
    onComplete?.()
  }, [finished, data.preferences.sound, onComplete])

  // Keyboard: space toggles, R resets, S skips — but never while typing.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return
      if (!rest) return
      if (e.code === 'Space') {
        e.preventDefault()
        if (running) store.pauseRest()
        else store.resumeRest()
      } else if (e.key.toLowerCase() === 'r') {
        store.resetRest()
      } else if (e.key.toLowerCase() === 's') {
        store.skipRest()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [rest, running])

  const start = useCallback(
    (seconds: number) => {
      store.startRest(Math.max(5, Math.round(seconds)))
      announcedRef.current = false
    },
    [],
  )

  const adjust = useCallback(
    (delta: number) => {
      if (!rest) return
      const remaining = store.restRemaining()
      const next = Math.max(5, Math.min(1800, Math.round(remaining + delta)))
      // Restart from the adjusted length, keeping it running if it was running.
      store.startRest(next)
      if (!running) store.pauseRest()
    },
    [rest, running],
  )

  if (!rest) {
    return (
      <div className="stack-3">
        <div className="row-between">
          <p className="eyebrow row-tight">
            <Icon name="timer" size={13} />
            Rest timer
          </p>
          <label className="sr-only" htmlFor="rest-custom">
            Custom rest length in seconds
          </label>
        </div>
        <div className="row-2">
          {PRESETS.map((seconds) => (
            <button key={seconds} type="button" className={`chip ${seconds === custom ? 'is-on' : ''}`} onClick={() => start(seconds)}>
              {formatTimer(seconds)}
            </button>
          ))}
          <span className="row-tight" style={{ gap: 4 }}>
            <input
              id="rest-custom"
              className="input input--num"
              style={{ width: 74, minHeight: 30, padding: '3px 8px' }}
              type="number"
              min={5}
              max={1800}
              step={5}
              value={custom}
              aria-label="Custom rest length in seconds"
              onChange={(e) => {
                const n = Number(e.target.value)
                setCustom(Number.isFinite(n) ? Math.max(5, Math.min(1800, Math.round(n))) : 5)
              }}
            />
            <button type="button" className="btn btn--sm" onClick={() => start(custom)}>
              Start
            </button>
          </span>
        </div>
        <p className="tiny faint">
          Completing a set starts {data.preferences.defaultRestSec}s automatically
          {data.preferences.autoStartRest ? '' : ' when auto-start is on'} · Space toggles, R resets, S skips.
        </p>
      </div>
    )
  }

  const total = Math.max(1, rest.totalSec)
  const remaining = store.restRemaining()
  const pct = Math.max(0, Math.min(100, (remaining / total) * 100))
  const context = rest.exerciseId ? exerciseName(rest.exerciseId) : ''
  const urgent = remaining <= 10 && running

  if (compact) {
    return (
      <div className="row-between" style={{ gap: 'var(--sp-3)' }}>
        <span className={`row-tight num ${urgent ? 'bad strong' : 'accent strong'}`} style={{ fontSize: 'var(--fs-xl)' }}>
          <Icon name="timer" size={16} />
          {formatTimer(Math.ceil(remaining))}
        </span>
        <span className="row-2">
          <button type="button" className="iconbtn" onClick={() => adjust(-15)} aria-label="Subtract 15 seconds">
            <Icon name="minus" size={15} />
          </button>
          <button
            type="button"
            className="btn btn--sm btn--primary"
            onClick={() => (running ? store.pauseRest() : finished ? start(total) : store.resumeRest())}
          >
            <Icon name={running ? 'pause' : 'play'} size={13} />
            {running ? 'Pause' : finished ? 'Restart' : 'Resume'}
          </button>
          <button type="button" className="iconbtn" onClick={() => adjust(15)} aria-label="Add 15 seconds">
            <Icon name="plus" size={15} />
          </button>
          <button type="button" className="iconbtn" onClick={() => store.skipRest()} aria-label="Dismiss rest timer">
            <Icon name="x" size={15} />
          </button>
        </span>
      </div>
    )
  }

  return (
    <div className={`card ${urgent ? 'card--glow' : ''}`} style={{ padding: 'var(--sp-5)' }}>
      <div className="row" style={{ gap: 'var(--sp-5)', alignItems: 'center' }}>
        <Ring pct={pct} size={132} stroke={11} label={`Rest timer, ${Math.ceil(remaining)} seconds remaining`}>
          <span className={`num ${urgent ? 'bad' : ''}`} style={{ fontSize: 'var(--fs-2xl)', fontWeight: 700, lineHeight: 1 }}>
            {formatTimer(Math.ceil(remaining))}
          </span>
          <span className="eyebrow">{finished ? 'Done' : running ? 'Resting' : 'Paused'}</span>
        </Ring>

        <div className="stack-3 grow" style={{ minWidth: 0 }}>
          <div className="stack-2">
            <p className="eyebrow">Rest timer</p>
            <p className="small muted truncate">
              {finished
                ? 'Rest finished — the next set is highlighted below.'
                : context
                  ? `After ${context}${rest.setIndex != null ? ` · set ${rest.setIndex + 1}` : ''}`
                  : `${total}s of rest`}
            </p>
          </div>

          <div className="row-2">
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => (running ? store.pauseRest() : finished ? start(total) : store.resumeRest())}
            >
              <Icon name={running ? 'pause' : 'play'} size={15} />
              {running ? 'Pause' : finished ? 'Restart' : 'Resume'}
            </button>
            <button type="button" className="btn btn--ghost" onClick={() => store.resetRest()} disabled={finished}>
              <Icon name="rotate-ccw" size={15} />
              Reset
            </button>
            <button type="button" className="btn btn--quiet" onClick={() => store.skipRest()}>
              <Icon name="skip-forward" size={15} />
              Skip
            </button>
          </div>

          <div className="row-2">
            {[-30, -15, 15, 30].map((delta) => (
              <button
                key={delta}
                type="button"
                className="chip"
                onClick={() => adjust(delta)}
                aria-label={`${delta > 0 ? 'Add' : 'Subtract'} ${Math.abs(delta)} seconds`}
              >
                {delta > 0 ? '+' : '−'}
                {Math.abs(delta)}s
              </button>
            ))}
            <span className="divider-v" aria-hidden />
            {PRESETS.map((seconds) => (
              <button key={seconds} type="button" className="chip" onClick={() => start(seconds)}>
                {formatTimer(seconds)}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/** A slim bar shown at the bottom of the session screen while resting. */
export function RestBar({ onComplete }: { onComplete?: () => void }) {
  const { draft } = useAppState()
  if (!draft?.rest) return null
  return (
    <div className="card card--glow" style={{ padding: 'var(--sp-3) var(--sp-4)' }}>
      <RestTimer compact onComplete={onComplete} />
    </div>
  )
}

export default RestTimer
