import { useEffect, useLayoutEffect, useRef, useState } from 'react'

/**
 * Measures an element's content-box width in pixels.
 *
 * Charts render their SVG at the measured size (1 user unit = 1 CSS pixel)
 * instead of scaling a fixed viewBox, so axis labels stay the same physical
 * size on a phone as on a desktop. Falls back to a sane width before the first
 * measurement lands, which keeps server-less first paint from flashing empty.
 */
export function useMeasure<T extends HTMLElement>(fallback = 640) {
  const ref = useRef<T | null>(null)
  const [width, setWidth] = useState(0)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = () => {
      const w = el.getBoundingClientRect().width
      if (w > 0) setWidth(w)
    }
    measure()
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', measure)
      return () => window.removeEventListener('resize', measure)
    }
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return { ref, width: width || fallback, measured: width > 0 }
}

/**
 * Rounds an axis range to human-friendly steps (1, 2, 2.5, 5, 10 …) so grid
 * lines land on numbers a person would actually write down.
 */
export function niceScale(min: number, max: number, tickCount = 4): { min: number; max: number; step: number; ticks: number[] } {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return { min: 0, max: 1, step: 1, ticks: [0, 1] }
  if (min === max) {
    if (min === 0) return { min: 0, max: 1, step: 1, ticks: [0, 1] }
    const pad = Math.abs(min) * 0.2
    min -= pad
    max += pad
  }
  const rawStep = (max - min) / Math.max(1, tickCount)
  const magnitude = Math.pow(10, Math.floor(Math.log10(Math.abs(rawStep) || 1)))
  const normalised = rawStep / magnitude
  const step = (normalised <= 1 ? 1 : normalised <= 2 ? 2 : normalised <= 2.5 ? 2.5 : normalised <= 5 ? 5 : 10) * magnitude
  const niceMin = Math.floor(min / step) * step
  const niceMax = Math.ceil(max / step) * step
  const ticks: number[] = []
  for (let v = niceMin; v <= niceMax + step / 2; v += step) {
    ticks.push(Math.round(v * 1e6) / 1e6)
  }
  return { min: niceMin, max: niceMax, step, ticks }
}

/** Compact axis labels: 12500 → 12.5k. */
export function axisLabel(n: number): string {
  const abs = Math.abs(n)
  if (abs >= 1_000_000) return `${Math.round((n / 1_000_000) * 10) / 10}M`
  if (abs >= 1000) return `${Math.round((n / 1000) * 10) / 10}k`
  if (Number.isInteger(n)) return String(n)
  return String(Math.round(n * 10) / 10)
}

/**
 * Builds a smooth cubic path through points. Tension is kept low so the curve
 * never overshoots the data — a chart that invents a dip would be a lie.
 */
export function smoothPath(points: { x: number; y: number }[], tension = 0.28): string {
  if (points.length === 0) return ''
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`
  if (points.length === 2) return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`

  let d = `M ${points[0].x} ${points[0].y}`
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[i + 2] ?? p2
    const c1x = p1.x + ((p2.x - p0.x) / 6) * tension * 3
    const c1y = p1.y + ((p2.y - p0.y) / 6) * tension * 3
    const c2x = p2.x - ((p3.x - p1.x) / 6) * tension * 3
    const c2y = p2.y - ((p3.y - p1.y) / 6) * tension * 3
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`
  }
  return d
}

/** Debounces a value — used by search inputs so typing stays instant. */
export function useDebounced<T>(value: T, delay = 180): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delay)
    return () => window.clearTimeout(id)
  }, [value, delay])
  return debounced
}
