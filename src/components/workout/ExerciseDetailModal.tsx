import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Modal } from '../ui/Modal'
import { Icon } from '../ui/Icon'
import { Chip } from '../ui/primitives'
import {
  EQUIPMENT_LABELS,
  MUSCLE_LABELS,
  PATTERN_LABELS,
  TIER_LABELS,
  getExercise,
  substitutionsFor,
} from '../../data/exercises'
import { getExerciseImageUrl, handleExerciseImageError } from '../../lib/exerciseImages'
import { startFreeSession, draftExerciseFor } from '../../lib/start'
import { store } from '../../lib/store'

export interface ExerciseDetailModalProps {
  exerciseId: string | null
  onClose: () => void
  onSelectExercise?: (exerciseId: string) => void
}

export function ExerciseDetailModal({ exerciseId, onClose, onSelectExercise }: ExerciseDetailModalProps) {
  const [currentId, setCurrentId] = useState<string | null>(exerciseId)
  const navigate = useNavigate()

  useEffect(() => {
    setCurrentId(exerciseId)
  }, [exerciseId])

  if (!currentId) return null

  const exercise = getExercise(currentId)
  if (!exercise) return null

  const subs = substitutionsFor(exercise.id)

  const handleSelectSub = (subId: string) => {
    setCurrentId(subId)
    onSelectExercise?.(subId)
  }

  const handleStartSession = () => {
    onClose()
    startFreeSession(`Free session · ${exercise.name}`)
    store.updateDraft({ exercises: [draftExerciseFor(exercise.id, 90)] })
    navigate('/session')
  }

  return (
    <Modal
      open={Boolean(currentId)}
      onClose={onClose}
      wide={true}
      title={exercise.name}
      sub={`${PATTERN_LABELS[exercise.pattern] ?? exercise.pattern} · ${TIER_LABELS[exercise.tier] ?? exercise.tier} · ${exercise.xpPerSet} XP / set`}
      icon="dumbbell"
      footer={
        <div className="row-between" style={{ width: '100%', gap: 'var(--sp-2)' }}>
          <Link
            to={`/exercises/${exercise.id}`}
            className="btn btn--quiet btn--sm"
            onClick={onClose}
          >
            <Icon name="trending-up" size={13} />
            Full history & PRs
          </Link>
          <div className="row-2">
            <button
              type="button"
              className="btn btn--primary btn--sm"
              onClick={handleStartSession}
            >
              <Icon name="play" size={13} />
              Log a session
            </button>
            <button type="button" className="btn btn--ghost btn--sm" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      }
    >
      <div className="stack-4">
        {/* Realistic Exercise Photo Hero */}
        <div className="exercise-modal-hero">
          <div className="exercise-modal-media">
            <img
              src={getExerciseImageUrl(exercise.id)}
              alt={`${exercise.name} demonstration`}
              onError={handleExerciseImageError}
              className="exercise-modal-img"
              loading="lazy"
            />
            <div className="exercise-modal-badge-overlay">
              <span className="exercise-modal-pill">
                <Icon name="target" size={11} />
                Real movement demo
              </span>
              {exercise.perSide ? <Chip tone="info">Per side</Chip> : null}
            </div>
          </div>
        </div>

        {/* Muscle Targets & Equipment */}
        <div className="row-2" style={{ flexWrap: 'wrap' }}>
          {exercise.muscles.map((m) => (
            <Chip key={m} icon="target" tone="accent">
              {MUSCLE_LABELS[m] ?? m}
            </Chip>
          ))}
          {exercise.secondary.slice(0, 3).map((m) => (
            <Chip key={m}>{MUSCLE_LABELS[m] ?? m}</Chip>
          ))}
          {exercise.equipment.map((e) => (
            <Chip key={e} icon="dumbbell">
              {EQUIPMENT_LABELS[e] ?? e}
            </Chip>
          ))}
        </div>

        {/* Notes */}
        {exercise.notes ? <p className="small muted">{exercise.notes}</p> : null}

        {/* Setup & Depth */}
        {exercise.setup ? (
          <div className="panel stack-2" style={{ padding: 'var(--sp-3)' }}>
            <p className="eyebrow row-tight">
              <Icon name="target" size={13} className="accent" />
              Setup
            </p>
            <p className="small">{exercise.setup}</p>
          </div>
        ) : null}

        {exercise.depth ? (
          <div className="panel stack-2" style={{ padding: 'var(--sp-3)' }}>
            <p className="eyebrow row-tight">
              <Icon name="ruler" size={13} className="accent" />
              Depth & Range of Motion
            </p>
            <p className="small">{exercise.depth}</p>
          </div>
        ) : null}

        {/* Cues */}
        {exercise.cues && exercise.cues.length > 0 ? (
          <div className="stack-2">
            <p className="eyebrow row-tight">
              <Icon name="check" size={13} className="accent" />
              Cues that fix most reps
            </p>
            <ul className="stack-2">
              {exercise.cues.map((cue, i) => (
                <li key={i} className="row-tight small">
                  <span
                    className="badge badge--accent num"
                    style={{
                      flex: 'none',
                      width: 22,
                      height: 22,
                      borderRadius: 6,
                      fontSize: 11,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {i + 1}
                  </span>
                  <span>{cue}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {/* Common Mistakes */}
        {exercise.commonErrors && exercise.commonErrors.length > 0 ? (
          <div className="stack-2">
            <p className="eyebrow row-tight">
              <Icon name="alert-triangle" size={13} className="warn" />
              Common Mistakes & How to Fix Them
            </p>
            <div className="stack-2">
              {exercise.commonErrors.map((err, i) => (
                <div key={i} className="panel stack-2" style={{ padding: 'var(--sp-3)' }}>
                  <p className="small warn row-tight">
                    <Icon name="alert-triangle" size={13} />
                    {err.error}
                  </p>
                  <p className="tiny muted row-tight">
                    <Icon name="arrow-right" size={12} />
                    {err.fix}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {/* Substitutions */}
        {subs.length > 0 ? (
          <div className="stack-2">
            <p className="eyebrow row-tight">
              <Icon name="repeat" size={13} />
              Alternatives & Substitutions
            </p>
            <div className="row-2" style={{ flexWrap: 'wrap' }}>
              {subs.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className="btn btn--quiet btn--sm"
                  onClick={() => handleSelectSub(s.id)}
                  title={`View ${s.name}`}
                >
                  <Icon name="repeat" size={11} />
                  {s.name}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </Modal>
  )
}
