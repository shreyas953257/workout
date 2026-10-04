import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ExerciseDetailModal } from '../src/components/workout/ExerciseDetailModal'
import { getExerciseImageUrl, getDefaultExerciseImageUrl } from '../src/lib/exerciseImages'
import { HashRouter } from 'react-router-dom'
import { ProgramDayCard } from '../src/components/workout/ProgramBits'
import { PROGRAMS } from '../src/data/programs'

afterEach(() => {
  cleanup()
})

describe('exerciseImages helper', () => {
  it('resolves local bundled image asset URLs without external protocol or base64', () => {
    const squatUrl = getExerciseImageUrl('back-squat')
    expect(squatUrl).toMatch(/images\/exercises\/back-squat\.jpg$/)
    expect(squatUrl).not.toMatch(/^https?:/)
    expect(squatUrl).not.toMatch(/^data:/)

    const defaultUrl = getDefaultExerciseImageUrl()
    expect(defaultUrl).toMatch(/images\/exercises\/default\.jpg$/)
  })
})

describe('ExerciseDetailModal', () => {
  it('renders realistic photo, exercise details, muscles, and cues', () => {
    const handleClose = vi.fn()
    render(
      <HashRouter>
        <ExerciseDetailModal exerciseId="back-squat" onClose={handleClose} />
      </HashRouter>,
    )

    // Modal title & sub
    expect(screen.getByText('Back Squat')).toBeTruthy()

    // Realistic photo with proper alt text and src
    const img = screen.getByAltText('Back Squat demonstration') as HTMLImageElement
    expect(img).toBeTruthy()
    expect(img.src).toMatch(/images\/exercises\/back-squat\.jpg$/)

    // Muscles and setup
    expect(screen.getByText('Quads')).toBeTruthy()
    expect(screen.getByText('Glutes')).toBeTruthy()
    expect(screen.getByText(/Bar on the upper traps/i)).toBeTruthy()

    // Cues
    expect(screen.getByText(/Spread the floor apart/i)).toBeTruthy()

    // Close button
    const closeBtn = screen.getByRole('button', { name: 'Close' })
    fireEvent.click(closeBtn)
    expect(handleClose).toHaveBeenCalled()
  })

  it('allows switching to an alternative substitution', () => {
    render(
      <HashRouter>
        <ExerciseDetailModal exerciseId="bench-press" onClose={() => {}} />
      </HashRouter>,
    )

    expect(screen.getByText('Bench Press')).toBeTruthy()
    const dumbbellBenchBtn = screen.getByTitle(/Switch to Dumbbell Bench Press|View Dumbbell Bench Press/i)
    expect(dumbbellBenchBtn).toBeTruthy()

    fireEvent.click(dumbbellBenchBtn)
    expect(screen.getByText('Dumbbell Bench Press')).toBeTruthy()
    const img = screen.getByAltText('Dumbbell Bench Press demonstration') as HTMLImageElement
    expect(img.src).toMatch(/images\/exercises\/db-bench-press\.jpg$/)
  })
})

describe('ProgramDayCard modal interaction', () => {
  it('opens ExerciseDetailModal when an exercise is clicked', () => {
    const program = PROGRAMS[0]
    const day = program.days[0]
    const firstExerciseName = 'Back Squat'

    render(
      <HashRouter>
        <ProgramDayCard program={program} day={day} week={1} />
      </HashRouter>,
    )

    // Initially modal is not open
    expect(screen.queryByAltText(`${firstExerciseName} demonstration`)).toBeNull()

    // Find the button for the first exercise
    const trigger = screen.getByRole('button', { name: `View ${firstExerciseName} details` })
    expect(trigger).toBeTruthy()

    // Click to open modal
    fireEvent.click(trigger)

    // Modal is now open with the realistic photo
    const img = screen.getByAltText(`${firstExerciseName} demonstration`) as HTMLImageElement
    expect(img).toBeTruthy()
    expect(img.src).toMatch(/images\/exercises\/back-squat\.jpg$/)
  })
})
