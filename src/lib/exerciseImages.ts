/**
 * Resolves local bundled realistic fitness photos for exercises.
 * No external URLs or base64 data URIs are used.
 */

export function getExerciseImageUrl(exerciseId: string): string {
  const base = import.meta.env.BASE_URL || '/'
  const cleanBase = base.endsWith('/') ? base : `${base}/`
  return `${cleanBase}images/exercises/${exerciseId}.jpg`
}

export function getDefaultExerciseImageUrl(): string {
  const base = import.meta.env.BASE_URL || '/'
  const cleanBase = base.endsWith('/') ? base : `${base}/`
  return `${cleanBase}images/exercises/default.jpg`
}

export function handleExerciseImageError(e: React.SyntheticEvent<HTMLImageElement>) {
  const target = e.currentTarget
  const fallback = getDefaultExerciseImageUrl()
  if (target.src !== fallback) {
    target.src = fallback
  }
}
