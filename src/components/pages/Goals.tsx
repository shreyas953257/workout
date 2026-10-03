import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '../ui/Icon'
import { Card, Chip, Empty, Field, Meter, SectionHead, Segmented, Stat } from '../ui/primitives'
import { ConfirmDialog, Modal } from '../ui/Modal'
import { useAppState, store } from '../../lib/store'
import { GOAL_CATEGORY_LABEL, GOAL_REVIEW_CADENCE, GOAL_TEMPLATES, goalFromTemplate, type GoalTemplate } from '../../data/goals'
import { EXERCISES, exerciseName } from '../../data/exercises'
import { GOAL_METRIC_HINT, GOAL_METRIC_LABEL, evaluateGoals, goalSummary, isSnapshotMetric, metricNeedsExercise, type GoalEvaluation } from '../../lib/goals'
import { formatDate, todayKey, diffDays } from '../../lib/dates'
import { uid } from '../../lib/id'
import { pluralize } from '../../lib/format'
import { toast } from '../ui/Toast'
import type { Goal, GoalCategory, GoalMetric } from '../../types'

const CATEGORIES: GoalCategory[] = ['strength', 'muscle', 'fat-loss', 'fitness', 'habit', 'skill', 'body', 'other']
const METRICS: GoalMetric[] = [
  'workouts',
  'sets',
  'volume',
  'duration',
  'streak',
  'longest-streak',
  'exercise-weight',
  'exercise-reps',
  'exercise-e1rm',
  'bodyweight',
  'level',
  'manual',
]

type Tab = 'active' | 'completed' | 'templates'

const TABS: { value: Tab; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Done & closed' },
  { value: 'templates', label: 'From goals.md' },
]

interface Draft {
  id?: string
  title: string
  detail: string
  category: GoalCategory
  metric: GoalMetric
  exerciseId: string
  target: string
  unit: string
  direction: 'increase' | 'decrease'
  baseline: string
  dueAt: string
  why: string
}

function blankDraft(): Draft {
  return {
    id: undefined,
    title: '',
    detail: '',
    category: 'strength',
    metric: 'exercise-weight',
    exerciseId: '',
    target: '',
    unit: 'kg',
    direction: 'increase',
    baseline: '',
    dueAt: '',
    why: '',
  }
}

function draftFromGoal(goal: Goal): Draft {
  return {
    id: goal.id,
    title: goal.title,
    detail: goal.detail ?? '',
    category: goal.category,
    metric: goal.metric,
    exerciseId: goal.exerciseId ?? '',
    target: String(goal.target),
    unit: goal.unit,
    direction: goal.direction,
    baseline: goal.baseline !== undefined ? String(goal.baseline) : '',
    dueAt: goal.dueAt ?? '',
    why: goal.why ?? '',
  }
}

/** The interactive version of goals.md: create, track, complete and review. */

export function Goals() {
  const { data, progress } = useAppState()
  const [tab, setTab] = useState<Tab>('active')
  const [draft, setDraft] = useState<Draft | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Goal | null>(null)
  const [milestoneFor, setMilestoneFor] = useState<string | null>(null)
  const [milestoneLabel, setMilestoneLabel] = useState('')

  const ctx = useMemo(() => ({ sessions: data.sessions, progress, profile: data.profile }), [data.sessions, progress, data.profile])
  const evaluations = useMemo(() => evaluateGoals(data.goals, ctx), [data.goals, ctx])
  const closed = useMemo(() => data.goals.filter((g) => g.completedAt || g.abandonedAt), [data.goals])

  const completeNow = evaluations.filter((e) => e.pct >= 100).length
  const overdue = evaluations.filter((e) => e.overdue).length

  const save = () => {
    if (!draft) return
    const target = Number(draft.target.replace(',', '.'))
    if (!draft.title.trim()) {
      toast.warn('A goal needs a title')
      return
    }
    if (!Number.isFinite(target) || target <= 0) {
      toast.warn('Enter a positive target', 'Goals without a number cannot be tracked honestly.')
      return
    }
    const baseline = draft.baseline.trim() === '' ? undefined : Number(draft.baseline)
    const patch: Partial<Goal> = {
      title: draft.title.trim(),
      detail: draft.detail.trim() || undefined,
      category: draft.category,
      metric: draft.metric,
      target,
      unit: draft.unit.trim(),
      direction: draft.direction,
      baseline: baseline !== undefined && Number.isFinite(baseline) ? baseline : undefined,
      dueAt: draft.dueAt || undefined,
      why: draft.why.trim() || undefined,
      exerciseId: metricNeedsExercise(draft.metric) ? draft.exerciseId || undefined : undefined,
    }

    if (draft.id) {
      const ok = store.updateGoal(draft.id, patch)
      if (ok) toast.success('Goal updated')
      else toast.error('Could not update that goal', 'One of the values was rejected by validation.')
    } else {
      const goal: Goal = {
        id: uid('goal'),
        createdAt: new Date().toISOString(),
        milestones: [],
        ...patch,
        title: patch.title as string,
        category: patch.category as GoalCategory,
        metric: patch.metric as GoalMetric,
        target,
        unit: patch.unit as string,
        direction: patch.direction as 'increase' | 'decrease',
      }
      const res = store.addGoal(goal)
      if (res.ok) toast.success('Goal created', 'Progress starts counting from today.')
      else toast.error('Could not create that goal', res.issues?.join(', '))
    }
    setDraft(null)
  }

  const adopt = (template: GoalTemplate) => {
    const goal = goalFromTemplate(template, ctx)
    const res = store.addGoal(goal)
    if (res.ok) {
      toast.success(`Goal added: ${goal.title}`, `Target ${goal.target} ${goal.unit}, due ${goal.dueAt ? formatDate(goal.dueAt, 'medium') : 'no date'}.`)
      setTab('active')
    } else {
      toast.error('Could not add that goal', res.issues?.join(', '))
    }
  }

  const renderEvaluated = (evaluation: GoalEvaluation) => {
    const { goal, pct, current, target, unit, detail, needed, daysLeft, nextMilestone, milestonesDone, needsInput } = evaluation
    const closedGoal = Boolean(goal.completedAt || goal.abandonedAt)
    return (
      <Card key={goal.id} className={closedGoal ? undefined : 'card--interactive'} pad={false}>
        <div className="card__head">
          <div className="stack-2" style={{ minWidth: 0 }}>
            <div className="row-tight" style={{ minWidth: 0 }}>
              <h3 className="strong truncate">{goal.title}</h3>
              <Chip tone={goal.completedAt ? 'good' : goal.abandonedAt ? 'bad' : pct >= 100 ? 'accent' : 'neutral'}>
                {goalSummary(evaluation)}
              </Chip>
            </div>
            <p className="tiny faint">
              {GOAL_CATEGORY_LABEL[goal.category]} · {GOAL_METRIC_LABEL[goal.metric]} · {detail}
            </p>
          </div>
          <span className="num strong" style={{ color: pct >= 100 ? 'var(--good)' : 'var(--accent)', flex: 'none' }}>
            {Math.round(pct)}%
          </span>
        </div>

        <div className="card__body stack-3" style={{ paddingTop: 0 }}>
          <div className="stack-2">
            <div className="row-between tiny">
              <span className="num">
                {current} / {target} {unit}
              </span>
              <span className="faint">
                {needsInput
                  ? 'you enter this one'
                  : needed > 0
                    ? `${needed} ${unit} to go`
                    : 'target reached'}
                {daysLeft !== null ? ` · ${daysLeft >= 0 ? `${daysLeft} days left` : `${Math.abs(daysLeft)} days overdue`}` : ''}
              </span>
            </div>
            <Meter pct={pct} label={`Progress towards ${goal.title}`} />
          </div>

          {goal.why ? (
            <p className="tiny muted">
              <Icon name="quote" size={11} /> {goal.why}
            </p>
          ) : null}

          {goal.milestones.length > 0 ? (
            <ul className="stack-2">
              {goal.milestones.map((m) => (
                <li key={m.id} className="row-between" style={{ gap: 'var(--sp-3)' }}>
                  <button
                    type="button"
                    className="row-tight tiny"
                    style={{ background: 'none', border: 0, padding: 0, color: m.done ? 'var(--good)' : 'var(--text-2)', textAlign: 'left' }}
                    aria-pressed={m.done}
                    onClick={() => {
                      const ok = store.toggleMilestone(goal.id, m.id)
                      if (ok && !m.done) toast.success('Milestone ticked', m.label)
                    }}
                  >
                    <Icon name={m.done ? 'check-square' : 'square'} size={13} />
                    <span style={{ textDecoration: m.done ? 'line-through' : 'none' }}>{m.label}</span>
                  </button>
                  <button type="button" className="iconbtn iconbtn--sm" aria-label={`Remove milestone ${m.label}`} onClick={() => store.deleteMilestone(goal.id, m.id)}>
                    <Icon name="x" size={12} />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          <p className="tiny faint">
            {milestonesDone}/{goal.milestones.length} milestones{nextMilestone ? ` · next: ${nextMilestone.label}` : ''}
          </p>

          <div className="row-2">
            {goal.completedAt ? (
              <button type="button" className="btn btn--quiet btn--sm" onClick={() => store.reopenGoal(goal.id)}>
                <Icon name="rotate-ccw" size={12} />
                Reopen
              </button>
            ) : (
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => {
                  store.completeGoal(goal.id)
                  toast.xp('Goal completed', `${goal.title} · +100 XP for finishing what you set out to do.`)
                }}
              >
                <Icon name="check" size={12} />
                Mark complete
              </button>
            )}
            {!goal.abandonedAt && !goal.completedAt ? (
              <button type="button" className="btn btn--quiet btn--sm" onClick={() => { store.abandonGoal(goal.id); toast.info('Goal abandoned', 'It stays in your log — abandoning honestly beats a fake completion.') }}>
                Abandon
              </button>
            ) : null}
            {needsInput ? (
              <button
                type="button"
                className="btn btn--quiet btn--sm"
                onClick={() => {
                  const raw = window.prompt(`Current value for “${goal.title}”`, String(current))
                  if (raw === null) return
                  const value = Number(raw.replace(',', '.'))
                  if (!Number.isFinite(value) || value < 0) {
                    toast.warn('That is not a usable number')
                    return
                  }
                  if (!goal.baseline && goal.progressOverride === undefined) store.updateGoal(goal.id, { baseline: goal.baseline ?? (goal.metric === 'manual' ? 0 : goal.baseline) })
                  store.updateGoal(goal.id, { progressOverride: value })
                }}
              >
                <Icon name="arrow-up" size={12} />
                Update value
              </button>
            ) : null}
            {goal.metric === 'bodyweight' && needsInput ? (
              <Link to="/profile" className="btn btn--quiet btn--sm">
                Set bodyweight
              </Link>
            ) : null}
            <button type="button" className="btn btn--quiet btn--sm" onClick={() => setDraft(draftFromGoal(goal))}>
              <Icon name="note" size={12} />
              Edit
            </button>
            <button type="button" className="btn btn--quiet btn--sm" aria-label={`Add a milestone to ${goal.title}`} onClick={() => { setMilestoneFor(goal.id); setMilestoneLabel('') }}>
              <Icon name="plus" size={12} />
              Milestone
            </button>
            <button type="button" className="btn btn--quiet btn--sm" onClick={() => setConfirmDelete(goal)}>
              <Icon name="x" size={12} />
              Delete
            </button>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <div className="page">
      <SectionHead
        icon="target"
        title="Goals"
        sub="Everything here is measured against your log. Cumulative goals count from the day you created them, so nothing starts out already finished."
        actions={
          <div className="row-2">
            <button type="button" className="btn btn--primary btn--sm" onClick={() => setDraft(blankDraft())}>
              <Icon name="plus" size={13} />
              New goal
            </button>
            <Link to="/docs/goals-worksheet" className="btn btn--quiet btn--sm">
              <Icon name="note" size={13} />
              goals.md
            </Link>
          </div>
        }
      />

      <div className="grid-4">
        <Stat label="Active" value={evaluations.length} icon="target" size="sm" />
        <Stat label="Target reached" value={completeNow} icon="check-circle" size="sm" hint="Mark them complete to bank the XP" />
        <Stat label="Overdue" value={overdue} icon="alert-triangle" size="sm" />
        <Stat label="Completed all time" value={progress.totals.goalsCompleted} icon="trophy" size="sm" />
      </div>

      <Segmented ariaLabel="Goal view" options={TABS} value={tab} onChange={(v) => setTab(v as Tab)} />

      {tab === 'active' ? (
        evaluations.length === 0 ? (
          <Card>
            <Empty
              icon="target"
              title="No active goals"
              text="Goals are what make the rest of the handbook make sense. Start from one written in goals.md, or write your own."
              action={
                <button type="button" className="btn btn--ghost btn--sm" onClick={() => setTab('templates')}>
                  Browse the goals.md templates
                </button>
              }
            />
          </Card>
        ) : (
          <div className="stack-3">{evaluations.map(renderEvaluated)}</div>
        )
      ) : tab === 'completed' ? (
        closed.length === 0 ? (
          <Card>
            <Empty icon="trophy" title="Nothing closed yet" text="Completed and abandoned goals are kept here — an honest record of what you set out to do." />
          </Card>
        ) : (
          <div className="stack-3">
            {closed
              .map((goal) => evaluateGoals([goal], ctx, true)[0])
              .map(renderEvaluated)}
          </div>
        )
      ) : (
        <div className="stack-3">
          <Card title="Straight from the handbook" icon="note" sub="goals.md asks for one thing, a primary goal, up to three supporting goals, and a non-negotiable floor. These are those, with real numbers.">
            <p className="small muted">
              Adding one captures today's baseline — a “+20 kg deadlift” goal starts from your current best, not from zero. You can edit any of
              it afterwards.
            </p>
          </Card>
          <div className="auto-grid" style={{ '--min': '280px' } as React.CSSProperties}>
            {GOAL_TEMPLATES.map((template) => (
              <Card key={template.id} pad={false}>
                <div className="card__body stack-3" style={{ padding: 'var(--sp-4)' }}>
                  <div className="stack-2">
                    <h3 className="strong">{template.title}</h3>
                    <p className="tiny faint">{template.source}</p>
                  </div>
                  <p className="tiny muted">{template.detail}</p>
                  <div className="row-2">
                    <Chip>{GOAL_CATEGORY_LABEL[template.category]}</Chip>
                    <Chip tone="info">{GOAL_METRIC_LABEL[template.metric]}</Chip>
                    <Chip icon="calendar">{template.weeks} wk</Chip>
                  </div>
                  <p className="tiny">
                    Target {template.target > 0 ? template.target : Math.abs(template.target)} {template.unit}
                    {template.exerciseId ? ` · ${exerciseName(template.exerciseId)}` : ''}
                  </p>
                  <p className="tiny muted">
                    <Icon name="quote" size={11} /> {template.why}
                  </p>
                  <button type="button" className="btn btn--ghost btn--sm" onClick={() => adopt(template)}>
                    <Icon name="plus" size={12} />
                    Adopt this goal
                  </button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      <Card title="How progress is calculated" icon="info" sub="So you can check the number yourself">
        <ul className="stack-2">
          {METRICS.map((m) => (
            <li key={m} className="tiny row-tight" style={{ alignItems: 'flex-start' }}>
              <Chip tone={isSnapshotMetric(m) ? 'info' : 'neutral'}>{isSnapshotMetric(m) ? 'live' : 'counting'}</Chip>
              <span>
                <strong>{GOAL_METRIC_LABEL[m]}</strong> — {GOAL_METRIC_HINT[m]}
              </span>
            </li>
          ))}
        </ul>
        <p className="tiny faint" style={{ marginTop: 'var(--sp-3)' }}>
          Completing a goal awards 100 XP and each milestone 25 XP. Abandoned goals award nothing.
        </p>
      </Card>

      <Card title="The weekly review, from goals.md" icon="calendar-check" sub="The habits the handbook says to check on">
        <div className="tablewrap">
          <table className="table">
            <thead>
              <tr>
                <th>Check</th>
                <th>Cadence</th>
                <th>Metric</th>
              </tr>
            </thead>
            <tbody>
              {GOAL_REVIEW_CADENCE.map((row) => (
                <tr key={row.check}>
                  <td>{row.check}</td>
                  <td>{row.cadence}</td>
                  <td className="tiny">{row.metric}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="tiny faint" style={{ marginTop: 'var(--sp-3)' }}>
          Today is {formatDate(todayKey(), 'long')}. A goal with no due date is fine — but the handbook sets a review 8–12 weeks out, and so does
          the default here.
        </p>
      </Card>

      {closed.some((g) => g.completedAt && diffDays(g.completedAt.slice(0, 10), todayKey()) < 0) ? (
        <p className="tiny faint center">
          {closed.filter((g) => g.completedAt).length} {pluralize(closed.filter((g) => g.completedAt).length, 'goal')} completed — each one paid
          out 100 XP at the time it was closed.
        </p>
      ) : null}

      {/* ---------------------------------------------------------- modals ---- */}
      <Modal
        open={draft !== null}
        onClose={() => setDraft(null)}
        title={draft?.id ? 'Edit goal' : 'New goal'}
        sub="Targets must be positive numbers. Cumulative metrics measure from today."
        icon="target"
        wide
        footer={
          <div className="row-2">
            <button type="button" className="btn btn--primary" onClick={save}>
              <Icon name="check" size={14} />
              {draft?.id ? 'Save changes' : 'Create goal'}
            </button>
            <button type="button" className="btn btn--quiet" onClick={() => setDraft(null)}>
              Cancel
            </button>
          </div>
        }
      >
        {draft ? (
          <div className="stack-4">
            <Field label="Title" hint="What you will read on the day you do not feel like training" htmlFor="goal-title">
              <input id="goal-title" className="input" value={draft.title} maxLength={140} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
            </Field>
            <Field label="Why it matters" hint="Optional, but goals.md asks for a real sentence here" htmlFor="goal-why">
              <textarea id="goal-why" className="input" rows={2} maxLength={2000} value={draft.why} onChange={(e) => setDraft({ ...draft, why: e.target.value })} />
            </Field>
            <div className="grid-2">
              <Field label="Category" htmlFor="goal-cat">
                <select id="goal-cat" className="input" value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value as GoalCategory })}>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {GOAL_CATEGORY_LABEL[c]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Measured by" hint={GOAL_METRIC_HINT[draft.metric]} htmlFor="goal-metric">
                <select id="goal-metric" className="input" value={draft.metric} onChange={(e) => setDraft({ ...draft, metric: e.target.value as GoalMetric })}>
                  {METRICS.map((m) => (
                    <option key={m} value={m}>
                      {GOAL_METRIC_LABEL[m]}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            {metricNeedsExercise(draft.metric) ? (
              <Field label="Exercise" hint="Which movement this goal is about" htmlFor="goal-ex">
                <select id="goal-ex" className="input" value={draft.exerciseId} onChange={(e) => setDraft({ ...draft, exerciseId: e.target.value })}>
                  <option value="">Choose an exercise…</option>
                  {EXERCISES.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name}
                    </option>
                  ))}
                </select>
              </Field>
            ) : null}
            <div className="grid-2">
              <Field label="Target" htmlFor="goal-target">
                <input id="goal-target" className="input" inputMode="decimal" value={draft.target} onChange={(e) => setDraft({ ...draft, target: e.target.value })} />
              </Field>
              <Field label="Unit" hint="kg, reps, sessions, days…" htmlFor="goal-unit">
                <input id="goal-unit" className="input" maxLength={20} value={draft.unit} onChange={(e) => setDraft({ ...draft, unit: e.target.value })} />
              </Field>
            </div>
            <div className="grid-2">
              <Field label="Starting from" hint="Optional baseline — leave blank to use zero (or your current best)" htmlFor="goal-base">
                <input id="goal-base" className="input" inputMode="decimal" value={draft.baseline} onChange={(e) => setDraft({ ...draft, baseline: e.target.value })} />
              </Field>
              <Field label="Direction" htmlFor="goal-dir">
                <select id="goal-dir" className="input" value={draft.direction} onChange={(e) => setDraft({ ...draft, direction: e.target.value as 'increase' | 'decrease' })}>
                  <option value="increase">Higher is better</option>
                  <option value="decrease">Lower is better</option>
                </select>
              </Field>
            </div>
            <Field label="Target date" hint="Optional — the handbook suggests reviewing 8–12 weeks out" htmlFor="goal-due">
              <input id="goal-due" className="input" type="date" value={draft.dueAt} onChange={(e) => setDraft({ ...draft, dueAt: e.target.value })} />
            </Field>
            <Field label="Notes" hint="Optional detail about how you will get there" htmlFor="goal-detail">
              <textarea id="goal-detail" className="input" rows={2} maxLength={2000} value={draft.detail} onChange={(e) => setDraft({ ...draft, detail: e.target.value })} />
            </Field>
          </div>
        ) : null}
      </Modal>

      <Modal
        open={milestoneFor !== null}
        onClose={() => setMilestoneFor(null)}
        title="Add a milestone"
        sub="Milestones award 25 XP each when you tick them."
        icon="list-checks"
        footer={
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => {
              if (!milestoneFor || !milestoneLabel.trim()) return
              store.addMilestone(milestoneFor, milestoneLabel.trim())
              toast.success('Milestone added', milestoneLabel.trim())
              setMilestoneFor(null)
            }}
          >
            Add milestone
          </button>
        }
      >
        <Field label="What are you ticking off?" htmlFor="ms-label">
          <input id="ms-label" className="input" maxLength={120} value={milestoneLabel} onChange={(e) => setMilestoneLabel(e.target.value)} />
        </Field>
      </Modal>

      <ConfirmDialog
        open={confirmDelete !== null}
        onCancel={() => setConfirmDelete(null)}
        onConfirm={() => {
          if (confirmDelete) {
            store.deleteGoal(confirmDelete.id)
            toast.success('Goal deleted', 'Any XP it had already awarded is recalculated from what remains.')
          }
          setConfirmDelete(null)
        }}
        title="Delete this goal?"
        message="Deleting removes the goal and its milestones. If it was completed, the 100 XP it awarded is taken back out of your total and your level is recalculated."
        confirmLabel="Delete goal"
      />
    </div>
  )
}

export default Goals
