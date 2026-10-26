import { ArrowLeft, Check, ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { navigate, routes } from '../app/router'
import { ThemeButton, UserMenu, type ThemeState } from '../app/TopBar'
import type { Session } from '../auth/verify'
import { cameraTransform, frameTarget, SHOTS, TOUR_STEPS } from './steps'

const BASE = import.meta.env.BASE_URL
const HOLD_MS = 2600

/** Width of an element, tracked with ResizeObserver. */
function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState(0)
  useLayoutEffect(() => {
    if (!ref.current) return
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
    observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])
  return [ref, width] as const
}

/** Animated walkthrough: smooth zoom onto each highlight of a real screenshot, with a spotlight and cursor. */
function Tutorial() {
  const reduceMotion = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
  const [stepIndex, setStepIndex] = useState(0)
  const [hi, setHi] = useState(-1)
  const [playing, setPlaying] = useState(!reduceMotion)
  const [stageRef, width] = useWidth<HTMLDivElement>()

  const step = TOUR_STEPS[stepIndex]
  const shot = SHOTS.shots[step.shot]
  const win = { w: width, h: (width * shot.viewport.height) / shot.viewport.width }
  const scale = width / shot.viewport.width
  const highlight = hi >= 0 ? step.highlights[hi] : undefined
  const rect = highlight ? shot.rects[highlight.target] : undefined
  const cam = frameTarget(rect, scale, win, highlight?.zoom)
  const { tx, ty } = cameraTransform(cam, win)

  const go = useCallback((next: number) => {
    setStepIndex((next + TOUR_STEPS.length) % TOUR_STEPS.length)
    setHi(-1)
  }, [])

  const advance = useCallback(() => {
    if (hi < step.highlights.length - 1) setHi(hi + 1)
    else go(stepIndex + 1)
  }, [hi, step.highlights.length, stepIndex, go])

  useEffect(() => {
    if (!playing) return
    const timer = setTimeout(advance, hi < 0 ? 900 : HOLD_MS)
    return () => clearTimeout(timer)
  }, [playing, advance, hi])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest('input, textarea, video')) return
      if (e.key === 'ArrowRight') go(stepIndex + 1)
      else if (e.key === 'ArrowLeft') go(stepIndex - 1)
      else if (e.key === ' ') {
        e.preventDefault()
        setPlaying(p => !p)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [go, stepIndex])

  const box = rect ? rect.map(v => v * scale) : null
  const cursor = box && highlight?.click ? { x: tx + (box[0] + box[2] / 2) * cam.z, y: ty + (box[1] + box[3] / 2) * cam.z } : null
  const label = box && highlight?.label ? { x: tx + (box[0] + box[2] / 2) * cam.z, top: ty + box[1] * cam.z, bottom: ty + (box[1] + box[3]) * cam.z } : null
  const labelBelow = label ? highlight?.labelBelow || label.top < 70 : false

  return (
    <section className="tutorial" aria-label="Step-by-step tutorial">
      <ol className="tutorial__steps">
        {TOUR_STEPS.map((s, i) => (
          <li key={s.shot}>
            <button type="button" aria-current={i === stepIndex ? 'step' : undefined} data-done={i < stepIndex || undefined} onClick={() => go(i)}>
              <span className="tutorial__num">{i < stepIndex ? <Check size={13} /> : i + 1}</span>
              {s.title}
            </button>
          </li>
        ))}
      </ol>

      <div className="tutorial__main">
        <div className="tutorial__frame">
          <div className="tutorial__bar">
            <span />
            <span />
            <span />
            <div>debnathsd.github.io/tiptap-debnathsd</div>
          </div>
          <div className="tutorial__stage" ref={stageRef} style={{ height: win.h || undefined }} data-motion={reduceMotion ? 'off' : 'on'}>
            {width > 0 && (
              <>
                <div className="tutorial__camera" style={{ transform: `translate(${tx}px, ${ty}px) scale(${cam.z})` }}>
                  <img key={shot.file} src={`${BASE}tour/shots/${shot.file}`} alt={`${step.title} — screenshot`} width={width} height={win.h} />
                  {box && (
                    <div
                      className="tutorial__spot"
                      style={{ left: box[0] - 6 / cam.z, top: box[1] - 6 / cam.z, width: box[2] + 12 / cam.z, height: box[3] + 12 / cam.z, borderWidth: 3 / cam.z, borderRadius: 10 / cam.z }}
                    />
                  )}
                </div>
                {label && highlight?.label && (
                  <div className="tutorial__label" data-below={labelBelow || undefined} style={{ left: Math.min(Math.max(label.x, 90), width - 90), top: labelBelow ? label.bottom + 14 : label.top - 14 }}>
                    {highlight.label}
                  </div>
                )}
                {cursor && (
                  <div className="tutorial__cursor" style={{ left: cursor.x, top: cursor.y }} key={`${stepIndex}-${hi}`}>
                    <svg width="28" height="28" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M4 2.5v17.2l4.6-4.3 2.9 6.6 3.1-1.4-2.9-6.4H18L4 2.5z" fill="#111" stroke="#fff" strokeWidth="1.5" strokeLinejoin="round" />
                    </svg>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <div className="tutorial__caption" key={stepIndex}>
          <div className="pane__eyebrow">
            Step {stepIndex + 1} of {TOUR_STEPS.length}
          </div>
          <h3>{step.title}</h3>
          <p>{step.body}</p>
          <ul>
            {step.points.map((point, i) => (
              <li key={point} data-lit={i === Math.min(hi, step.points.length - 1) || undefined}>
                <Check size={14} /> {point}
              </li>
            ))}
          </ul>
        </div>

        <div className="tutorial__controls">
          <button type="button" className="btn" onClick={() => go(stepIndex - 1)}>
            <ChevronLeft size={15} /> Previous
          </button>
          <button type="button" className="btn btn--primary" onClick={() => setPlaying(p => !p)} aria-pressed={playing}>
            {playing ? <Pause size={15} /> : <Play size={15} />} {playing ? 'Pause' : 'Play'}
          </button>
          <button type="button" className="btn" onClick={advance}>
            Next <ChevronRight size={15} />
          </button>
          <span className="tutorial__progress" aria-hidden="true">
            <span style={{ width: `${((stepIndex + (hi + 1) / (step.highlights.length + 1)) / TOUR_STEPS.length) * 100}%` }} />
          </span>
        </div>
      </div>
    </section>
  )
}

export function TourPage({ session, theme }: { session: Session; theme: ThemeState }) {
  return (
    <div className="home">
      <header className="topbar">
        <div className="topbar__brand">
          <button type="button" className="topbar__back" title="All pages" onClick={() => navigate(routes.list())}>
            <ArrowLeft size={16} />
            <img src={`${BASE}favicon.svg`} alt="" width={24} height={24} />
            <span className="topbar__product">Pages</span>
          </button>
        </div>
        <div className="topbar__actions">
          <ThemeButton theme={theme} />
          <UserMenu session={session} />
        </div>
      </header>

      <main className="home__main tour">
        <div className="home__intro">
          <div>
            <div className="pane__eyebrow">Product tour</div>
            <h1>See Tiptap Pages in action</h1>
            <p>A short film of the real app, then an interactive walkthrough of every feature. Use ← → to step through, space to pause.</p>
          </div>
          <button type="button" className="btn btn--primary btn--lg" onClick={() => navigate(routes.list())}>
            Go to my pages
          </button>
        </div>

        <div className="tour__video">
          <video controls playsInline preload="metadata" poster={`${BASE}tour/poster.jpg`} src={`${BASE}tour/tiptap-pages-demo.mp4`}>
            Your browser can't play this video. <a href={`${BASE}tour/tiptap-pages-demo.mp4`}>Download it</a> instead.
          </video>
        </div>
        <p className="tour__caption">🔊 Best with sound: an original score with sound design on every action.</p>

        <h2 className="tour__heading">Step by step</h2>
        <Tutorial />
      </main>
    </div>
  )
}
