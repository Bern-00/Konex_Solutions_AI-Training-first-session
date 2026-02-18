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

  // 1. Récupérer TOUS les profils
  const { data: profiles, error: pError } = await supabase
    .from('profiles')
    .select('*')

  if (pError) throw pError

  // 2. Récupérer TOUTE la progression
  const { data: progress, error: prError } = await supabase
    .from('user_progress')
    .select('*')

  if (prError) throw prError

  // 3. Assembler en JavaScript pour une fiabilité totale
  const adminEmail = 'waddlybernlouisjean@gmail.com'.toLowerCase()

  const studentData = profiles
    .filter(p => p.email?.toLowerCase() !== adminEmail && p.is_admin !== true)
    .map(profile => {
      const userProg = progress.filter(pr => pr.user_id === profile.id);
      // Extraire les métadonnées d'activité les plus pertinentes
      // On priorise Module 3 (Chapter 16) puis Module 2 (Chapter 11)
      const m3Progress = userProg.find(pr => pr.chapter_id === 16);
      const m2Progress = userProg.find(pr => pr.chapter_id === 11);

      const activityData = (m3Progress?.metadata || m2Progress?.metadata || null) as any;

      return {
        ...profile,
        user_progress: userProg,
        activity_metadata: activityData
      };
    });

  return studentData;
}

export async function saveActivityProgress(
  userId: string,
  moduleId: number,
  chapterId: number,
  step: number,
  responses: any
) {
  const supabase = createClient();

  const { error } = await supabase
    .from('user_progress')
    .upsert({
      user_id: userId,
      module_id: moduleId,
      chapter_id: chapterId,
      metadata: { step, responses }
    }, { onConflict: 'user_id,chapter_id' });

  if (error) throw error;
  return { success: true };
}

export async function getActivityProgress(userId: string, chapterId: number) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('user_progress')
    .select('metadata')
    .eq('user_id', userId)
    .eq('chapter_id', chapterId)
    .maybeSingle();

  if (error) {
    console.error("getActivityProgress ERROR:", error);
    throw error;
  }
  return data?.metadata || null;
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