import { createClient } from './supabase/client'

export async function sendMessage(content: string, userFullName: string) {
    const supabase = createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Utilisateur non connecté')

    const { data, error } = await supabase
        .from('messages')
        .insert({
            user_id: user.id,
            user_full_name: userFullName,
            content: content
        })

    if (error) throw error
    return data
}

export async function getMessages() {
    const supabase = createClient()

    const { data, error } = await supabase
        .from('messages')
        .select('*')
        .order('created_at', { ascending: false })

    if (error) throw error
    return data
}

export async function markMessageAsRead(messageId: number) {
    const supabase = createClient()

    const { error } = await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('id', messageId)

    if (error) throw error
    return { success: true }
}
