import { createClient } from '@/lib/supabase/client'

export async function getUserProgress(userId: string) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('user_progress')
    .select(`
      *,
      chapters (*),
      modules (*)
    `)
    .eq('user_id', userId)
    .order('completed_at', { ascending: true })

  if (error) throw error
  return data
}

export async function unlockNextChapter(userId: string, currentChapterId: number) {
  const supabase = createClient()

  // Trouver le prochain chapitre
  const { data: currentChapter } = await supabase
    .from('chapters')
    .select('module_id, order_index')
    .eq('id', currentChapterId)
    .maybeSingle()

  if (!currentChapter) throw new Error('Chapter not found')

  const { data: nextChapter } = await supabase
    .from('chapters')
    .select('id')
    .eq('module_id', currentChapter.module_id)
    .eq('order_index', currentChapter.order_index + 1)
    .maybeSingle()

  if (nextChapter) {
    const { error } = await supabase
      .from('user_progress')
      .upsert({
        user_id: userId,
        chapter_id: nextChapter.id,
        module_id: currentChapter.module_id,
        unlocked_at: new Date().toISOString()
      }, { onConflict: 'user_id,chapter_id' })

    if (error) throw error
  }

  return nextChapter
}

export async function submitQuizAttempt(
  userId: string,
  chapterId: number,
  answers: Record<number, number>,
  score: number,
  passed: boolean
) {
  const supabase = createClient()

  // 1. Vérifier le nombre de tentatives existantes
  const { data: existingProgress } = await supabase
    .from('user_progress')
    .select('attempts, completed, completed_at')
    .eq('user_id', userId)
    .eq('chapter_id', chapterId)
    .maybeSingle()

  const currentAttempts = existingProgress?.attempts || 0

  if (currentAttempts >= 2 && !existingProgress?.completed) {
    throw new Error('Maximum number of attempts reached for this chapter.')
  }

  const nextAttemptNumber = currentAttempts + 1

  // 2. Enregistrer la tentative
  const { error: attemptError } = await supabase
    .from('quiz_attempts')
    .insert({
      user_id: userId,
      chapter_id: chapterId,
      answers,
      score,
      passed,
      attempt_number: nextAttemptNumber
    })

  if (attemptError) throw attemptError

  // 3. Mettre à jour la progression
  const { error: progressError } = await supabase
    .from('user_progress')
    .upsert({
      user_id: userId,
      chapter_id: chapterId,
      completed: passed,
      score,
      attempts: nextAttemptNumber,
      completed_at: passed ? new Date().toISOString() : (existingProgress?.completed ? existingProgress.completed_at : null)
    }, { onConflict: 'user_id,chapter_id' })

  if (progressError) throw progressError

  // 4. Débloquer le prochain chapitre si réussi
  if (passed) {
    await unlockNextChapter(userId, chapterId)
  }

  return { success: true, attemptsRemaining: 2 - nextAttemptNumber }
}

export async function getAllStudentsProgress() {
  const supabase = createClient()

  // Récupérer tous les profils avec leur progression jointe
  const { data, error } = await supabase
    .from('profiles')
    .select(`
      id,
      email,
      full_name,
      user_progress (
        module_id,
        chapter_id,
        completed,
        score,
        attempts,
        completed_at
      )
    `)
    .neq('is_admin', true) // Filtre uniquement ceux qui sont explicitement admin

  if (error) throw error
  return data
}

export async function resetStudentAttempts(userId: string, chapterId: number) {
  const supabase = createClient()

  const { error } = await supabase
    .from('user_progress')
    .upsert({
      user_id: userId,
      chapter_id: chapterId,
      attempts: 0,
      completed: false,
      score: null
    }, { onConflict: 'user_id,chapter_id' })

  if (error) throw error
  return { success: true }
}