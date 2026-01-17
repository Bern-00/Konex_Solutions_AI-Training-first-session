import { createClient } from './client'

export async function signUp(email: string, password: string, fullName: string) {
  const supabase = createClient()

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      }
    }
  })

  if (error) throw error

  // Créer le profil après inscription
  if (data.user) {
    await supabase.from('profiles').insert({
      id: data.user.id,
      email: data.user.email,
      full_name: fullName,
      role: 'student'
    })
  }

  return data
}

export async function signIn(email: string, password: string) {
  const supabase = createClient()
  return await supabase.auth.signInWithPassword({ email, password })
}

export async function signOut() {
  const supabase = createClient()
  return await supabase.auth.signOut()
}

export async function getCurrentUser() {
  const supabase = createClient()
  try {
    const { data, error } = await supabase.auth.getUser()
    if (error) return null
    return data?.user || null
  } catch (err) {
    console.error('Error in getCurrentUser:', err)
    return null
  }
}

export async function getUserProfile(userId: string) {
  const supabase = createClient()
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle()

    if (error) {
      if (error.code !== 'PGRST116') {
        console.error('Database error in getUserProfile:', error)
      }
      return null
    }
    return data
  } catch (err) {
    console.error('Unexpected error in getUserProfile:', err)
    return null
  }
}