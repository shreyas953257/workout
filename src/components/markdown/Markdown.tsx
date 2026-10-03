import { useMemo } from 'react'
import DOMPurify from 'dompurify'
import { marked } from 'marked'

/**
 * Markdown renderer.
 *
 * The original repository content (14 files, ~2 100 lines) is imported raw and
 * rendered here, so nothing was rewritten to build the app — the docs you read
 * in the browser are the docs in the repo.
 *
 * Pipeline: marked → DOMPurify → a DOM pass that adds heading ids and builds a
 * table of contents. Doing the heading work in the DOM rather than in a marked
 * extension keeps us off the renderer's internal API, which changes between
 * marked majors.
 */

export interface TocEntry {
  id: string
  text: string
  depth: number
}

export interface RenderedMarkdown {
  html: string
  toc: TocEntry[]
  words: number
  minutes: number
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 60) || 'section'
}

export function renderMarkdown(source: string): RenderedMarkdown {
  const raw = typeof source === 'string' ? source : ''
  let dirty = ''
  try {
    dirty = String(marked.parse(raw, { async: false, gfm: true, breaks: false }))
  } catch {
    // A pathological document should never take the page down.
    dirty = `<pre>${raw.replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' })[c] ?? c)}</pre>`
  }

  const clean = DOMPurify.sanitize(dirty, {
    USE_PROFILES: { html: true },
    ADD_ATTR: ['target', 'rel'],
    FORBID_TAGS: ['style', 'form', 'input', 'button', 'iframe', 'object', 'embed'],
  })

  const toc: TocEntry[] = []
  let html = clean

  if (typeof window !== 'undefined' && typeof DOMParser !== 'undefined') {
    try {
      const doc = new DOMParser().parseFromString(`<div id="root">${clean}</div>`, 'text/html')
      const root = doc.getElementById('root')
      if (root) {
        const used = new Set<string>()
        const headings = root.querySelectorAll('h1, h2, h3, h4')
        headings.forEach((heading) => {
          const text = (heading.textContent ?? '').trim()
          let id = slugify(text)
          while (used.has(id)) id = `${id}-1`
          used.add(id)
          heading.setAttribute('id', id)
          const depth = Number(heading.tagName.slice(1))
          if (depth >= 2) toc.push({ id, text, depth })
        })

        // External links open in a new tab; internal anchors do not.
        root.querySelectorAll('a[href]').forEach((a) => {
          const href = a.getAttribute('href') ?? ''
          if (/^https?:\/\//i.test(href)) {
            a.setAttribute('target', '_blank')
            a.setAttribute('rel', 'noopener noreferrer')
          }
        })

        html = root.innerHTML
      }
    } catch {
      html = clean
    }
  }

  const words = raw.split(/\s+/).filter(Boolean).length
  return { html, toc, words, minutes: Math.max(1, Math.round(words / 220)) }
}

/** Memoised so scrolling a long doc does not re-parse it on every render. */
export function useMarkdown(source: string): RenderedMarkdown {
  return useMemo(() => renderMarkdown(source), [source])
}

export function Markdown({ content, className = 'md' }: { content: string; className?: string }) {
  const rendered = useMarkdown(content)
  return <div className={className} dangerouslySetInnerHTML={{ __html: rendered.html }} />
}

export function Toc({ entries, activeId, onSelect }: { entries: TocEntry[]; activeId?: string; onSelect?: (id: string) => void }) {
  if (entries.length < 3) return null
  return (
    <nav className="toc" aria-label="On this page">
      {entries.map((entry) => (
        <a
          key={entry.id}
          href={`#${entry.id}`}
          className={`${entry.depth >= 3 ? 'toc__lvl-3' : ''} ${activeId === entry.id ? 'is-active' : ''}`}
          onClick={(e) => {
            if (!onSelect) return
            e.preventDefault()
            onSelect(entry.id)
            document.getElementById(entry.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
          }}
        >
          {entry.text}
        </a>
      ))}
    </nav>
  )
}

export default Markdown
