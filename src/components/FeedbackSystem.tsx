'use client'

import { useState } from 'react'
import { MessageSquare, Send, X, Loader2 } from 'lucide-react'
import { sendMessage } from '@/lib/messages'

interface FeedbackSystemProps {
    userFullName: string
}

export default function FeedbackSystem({ userFullName }: FeedbackSystemProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [content, setContent] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [success, setSuccess] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!content.trim()) return

        setIsLoading(true)
        try {
            await sendMessage(content, userFullName)
            setSuccess(true)
            setContent('')
            setTimeout(() => {
                setSuccess(false)
                setIsOpen(false)
            }, 2000)
        } catch (error) {
            console.error('Error sending message:', error)
            alert('Erreur lors de l’envoi du message.')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <>
            {/* Floating Button */}
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-8 right-8 z-50 bg-neon text-background p-4 rounded-full shadow-2xl hover:scale-110 transition-transform flex items-center justify-center group"
            >
                <MessageSquare size={24} />
                <span className="absolute right-16 bg-card-bg border border-neon/30 text-neon text-[10px] px-3 py-1 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    Poser une question
                </span>
            </button>

            {/* Modal Overlay */}
            {isOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-background/80 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="w-full max-w-lg bg-card-bg border border-neon/30 p-8 relative shadow-2xl">
                        <button
                            onClick={() => setIsOpen(false)}
                            className="absolute top-4 right-4 text-neon/50 hover:text-neon"
                        >
                            <X size={20} />
                        </button>

                        <div className="mb-8">
                            <h2 className="text-2xl font-black uppercase italic text-foreground flex items-center gap-3">
                                <MessageSquare className="text-neon" /> Feedback_Protocol
                            </h2>
                            <p className="text-[10px] font-mono text-neon/60 mt-2 uppercase tracking-widest">
                // Envoyez vos questions ou suggestions au Lead Architect
                            </p>
                        </div>

                        {success ? (
                            <div className="py-12 text-center">
                                <div className="w-16 h-16 bg-neon/10 border border-neon rounded-full flex items-center justify-center mx-auto mb-6">
                                    <Send className="text-neon" size={24} />
                                </div>
                                <p className="text-neon font-bold uppercase tracking-widest text-sm">Message envoyé avec succès !</p>
                                <p className="text-[10px] opacity-60 mt-2 italic">L'admin consultera votre demande prochainement.</p>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div>
                                    <label className="block text-[10px] uppercase tracking-widest mb-3 text-neon/70">
                                        Votre Message
                                    </label>
                                    <textarea
                                        value={content}
                                        onChange={(e) => setContent(e.target.value)}
                                        required
                                        placeholder="Tapez votre question ici..."
                                        className="w-full h-40 p-4 border border-neon/20 bg-background text-foreground font-mono text-sm focus:border-neon outline-none transition-colors resize-none"
                                    />
                                </div>

                                <div className="flex items-center justify-between gap-4">
                                    <div className="text-[9px] font-mono opacity-40 uppercase">
                                        Identifié comme: {userFullName}
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={isLoading || !content.trim()}
                                        className="bg-neon text-background px-8 py-4 font-black uppercase text-xs tracking-widest hover:bg-neon/90 transition-all disabled:opacity-50 flex items-center gap-3"
                                    >
                                        {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                                        Envoyer le protocole
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </>
    )
}
