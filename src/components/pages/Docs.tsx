import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '../ui/Icon'
import { Card, Chip, Empty, SectionHead, Stat } from '../ui/primitives'
import { DOCS, DOC_GROUPS, readingTime } from '../../data/docs'
import { useAppState } from '../../lib/store'

/**
 * The original Markdown, still readable.
 *
 * Every page here is loaded from the repository files themselves at build time,
 * so the handbook and the app can never drift apart.
 */

export function Docs() {
  const { data } = useAppState()
  const [query, setQuery] = useState('')
  const [group, setGroup] = useState<string>('all')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return DOCS.filter((doc) => (group === 'all' ? true : doc.group === group)).filter((doc) =>
      q ? `${doc.title} ${doc.summary} ${doc.content}`.toLowerCase().includes(q) : true,
    )
  }, [query, group])

  const totalWords = useMemo(() => DOCS.reduce((n, d) => n + d.content.split(/\s+/).length, 0), [])

  return (
    <div className="page">
      <SectionHead
        icon="book-open"
        title="The handbook"
        sub={`The Markdown files this app was built from — ${DOCS.length} pages, ${totalWords.toLocaleString()} words. They are still the source of truth for every programme, cue and rule in here.`}
      />

      <div className="grid-4">
        <Stat label="Documents" value={DOCS.length} icon="note" size="sm" />
        <Stat label="Words" value={totalWords.toLocaleString()} icon="book" size="sm" />
        <Stat label="Programmes" value={DOC_GROUPS.find((g) => g.id === 'programs') ? 3 : 0} icon="layers" size="sm" />
        <Stat label="Groups" value={DOC_GROUPS.length} icon="list-checks" size="sm" />
      </div>

      <Card>
        <div className="stack-3">
          <div className="searchbar">
            <Icon name="search" size={16} />
            <input
              className="input"
              type="search"
              value={query}
              placeholder="Search the whole handbook…"
              aria-label="Search the handbook"
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="row-2">
            <button type="button" className={`chip ${group === 'all' ? 'is-on' : ''}`} aria-pressed={group === 'all'} onClick={() => setGroup('all')}>
              Everything
            </button>
            {DOC_GROUPS.map((g) => (
              <button key={g.id} type="button" className={`chip ${group === g.id ? 'is-on' : ''}`} aria-pressed={group === g.id} onClick={() => setGroup(g.id)}>
                {g.label}
              </button>
            ))}
          </div>
          <p className="tiny faint">
            {filtered.length} of {DOCS.length} documents{query ? ` matching “${query}”` : ''}
          </p>
        </div>
      </Card>

      {filtered.length === 0 ? (
        <Card>
          <Empty icon="search" title="Nothing matched" text="Try a shorter search — the whole body of every document is searched, not just the titles." action={<button type="button" className="btn btn--ghost btn--sm" onClick={() => { setQuery(''); setGroup('all') }}>Clear</button>} />
        </Card>
      ) : (
        <div className="stack-5">
          {DOC_GROUPS.map((g) => {
            const docs = filtered.filter((d) => d.group === g.id)
            if (docs.length === 0) return null
            return (
              <section key={g.id} className="stack-3" aria-labelledby={`g-${g.id}`}>
                <SectionHead id={`g-${g.id}`} icon="book" title={g.label} sub={g.blurb} />
                <div className="stack-2">
                  {docs.map((doc) => (
                    <Link key={doc.id} to={`/docs/${doc.id}`} className="docrow">
                      <span className="empty__icon">
                        <Icon name="note" size={15} />
                      </span>
                      <span className="stack-2 grow" style={{ minWidth: 0 }}>
                        <span className="strong truncate">{doc.title}</span>
                        <span className="tiny faint clamp-2">{doc.summary}</span>
                        <span className="row-tight tiny faint">
                          <Icon name="clock" size={10} />
                          {readingTime(doc.content)} min read · {doc.path}
                        </span>
                      </span>
                      <Icon name="chevron-right" size={14} className="faint" />
                    </Link>
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      )}

      <Card title="Why keep the Markdown?" icon="info">
        <ul className="stack-2">
          <li className="small row-tight">
            <Icon name="check" size={13} className="good" />
            It is the version you can read on GitHub, print, or copy into a notebook when the phone dies.
          </li>
          <li className="small row-tight">
            <Icon name="check" size={13} className="good" />
            Every programme, exercise and rule in the interactive app was transcribed from these files, so you can check the source any time.
          </li>
          <li className="small row-tight">
            <Icon name="check" size={13} className="good" />
            The worksheet pages — goals, logs, body measurements — stay useful as paper backups.
          </li>
        </ul>
        {data.preferences.showDocSources ? <p className="tiny faint">Source links are shown on programme and exercise pages because you have that option on.</p> : null}
      </Card>

      <div className="row-2">
        <Chip tone="info" icon="note">
          Loaded at build time with ?raw
        </Chip>
        <Chip tone="neutral" icon="wifi-off">
          Readable offline
        </Chip>
      </div>
    </div>
  )
}

export default Docs
