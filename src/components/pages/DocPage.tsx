import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Icon } from '../ui/Icon'
import { Card, Chip, Empty, SectionHead } from '../ui/primitives'
import { Markdown, Toc, useMarkdown } from '../markdown/Markdown'
import { DOCS, DOC_GROUPS, getDoc, readingTime } from '../../data/docs'
import { useAppState } from '../../lib/store'

/** One Markdown document, rendered with its own table of contents. */

export function DocPage() {
  const { id = '' } = useParams()
  const { data } = useAppState()
  const doc = getDoc(id)
  const source = doc?.content ?? ''
  const rendered = useMarkdown(source)

  const siblings = useMemo(() => (doc ? DOCS.filter((d) => d.group === doc.group && d.id !== doc.id) : []), [doc])

  if (!doc) {
    return (
      <div className="page">
        <Empty
          icon="note"
          title="Document not found"
          text={`There is no document with the id “${id}” in the handbook.`}
          action={
            <Link to="/docs" className="btn btn--primary btn--sm">
              All documents
            </Link>
          }
        />
      </div>
    )
  }

  const group = DOC_GROUPS.find((g) => g.id === doc.group)

  return (
    <div className="page page--docs">
      <div className="row-between" style={{ gap: 'var(--sp-3)', flexWrap: 'wrap' }}>
        <Link to="/docs" className="btn btn--quiet btn--sm">
          <Icon name="arrow-left" size={13} />
          Handbook
        </Link>
        <div className="row-2">
          {group ? <Chip tone="info">{group.label}</Chip> : null}
          <Chip icon="clock">{readingTime(doc.content)} min read</Chip>
        </div>
      </div>

      <SectionHead
        icon="note"
        title={doc.title}
        sub={`${doc.summary} · source: ${doc.path}`}
        actions={
          doc.relatedRoute ? (
            <Link to={doc.relatedRoute} className="btn btn--ghost btn--sm">
              <Icon name="arrow-up-right" size={13} />
              {doc.relatedLabel ?? 'Open in the app'}
            </Link>
          ) : null
        }
      />

      <div className="docs-grid">
        <Card pad="tight" className="docs-toc">
          <p className="eyebrow">On this page</p>
          {rendered.toc.length === 0 ? (
            <p className="tiny faint">This document has no headings.</p>
          ) : (
            <Toc entries={rendered.toc} />
          )}
          {siblings.length > 0 ? (
            <div className="stack-2" style={{ marginTop: 'var(--sp-4)' }}>
              <p className="eyebrow">More in {group?.label ?? 'this group'}</p>
              {siblings.map((s) => (
                <Link key={s.id} to={`/docs/${s.id}`} className="tiny truncate">
                  {s.title}
                </Link>
              ))}
            </div>
          ) : null}
        </Card>

        <Card className="docs-body">
          <Markdown content={source} />
          <div className="row-between" style={{ marginTop: 'var(--sp-5)' }}>
            <span className="tiny faint">Read from {doc.path} — unchanged from the repository.</span>
            {data.preferences.showDocSources ? <Chip tone="neutral">source: {doc.path}</Chip> : null}
          </div>
        </Card>
      </div>

      {doc.relatedRoute ? (
        <Card title="Use it in the app" icon="arrow-up-right">
          <p className="small muted">{doc.relatedLabel ?? 'This document has a matching interactive page.'}</p>
          <Link to={doc.relatedRoute} className="btn btn--primary btn--sm" style={{ marginTop: 'var(--sp-3)' }}>
            {doc.relatedLabel ?? 'Open'}
          </Link>
        </Card>
      ) : null}
    </div>
  )
}

export default DocPage
