'use client'

import { useState } from 'react'
import { signUp, signIn } from '@/lib/supabase/auth'
import { Loader2 } from 'lucide-react'

export default function AuthForm() {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      if (isLogin) {
        const { error } = await signIn(email, password)
        if (error) throw error
        // Redirection sera gérée par middleware, mais un refresh aide la sync locale
        window.location.reload();
      } else {
        const { error } = await signUp(email, password, fullName)
        if (error) throw (error as any)
        setSuccess(true)
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto mt-20 p-8 border border-card-border bg-card-bg backdrop-blur-xl">
      <h2 className="text-2xl font-black mb-8 text-foreground uppercase tracking-tighter">
        {isLogin ? 'CONNEXION' : 'INSCRIPTION'} KONEX
      </h2>

      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-neon/10 border border-neon/30 text-neon text-sm">
          Compte créé ! Vérifie ton email pour confirmer ton inscription.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {!isLogin && (
          <div>
            <label className="block text-xs uppercase tracking-widest mb-2 text-foreground/70">
              Nom complet
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full p-3 border border-card-border bg-background text-foreground font-mono text-sm"
              required={!isLogin}
              placeholder="Jean Dupont"
            />
          </div>
        )}

        <div>
          <label className="block text-xs uppercase tracking-widest mb-2 text-foreground/70">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-3 border border-card-border bg-background text-foreground font-mono text-sm"
            required
            placeholder="trainer@konex.com"
          />
        </div>

        <div>
          <label className="block text-xs uppercase tracking-widest mb-2 text-foreground/70">
            Mot de passe
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-3 border border-card-border bg-background text-foreground font-mono text-sm"
            required
            placeholder="••••••••"
            minLength={6}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-neon text-background py-4 font-black uppercase text-xs tracking-widest hover:bg-neon/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading && <Loader2 size={16} className="animate-spin" />}
          {isLogin ? 'SE CONNECTER' : "S'INSCRIRE"}
        </button>
      </form>

      <div className="mt-8 pt-6 border-t border-card-border text-center">
        <button
          onClick={() => {
            setIsLogin(!isLogin)
            setError(null)
            setSuccess(false)
          }}
          className="text-neon text-xs uppercase tracking-widest hover:opacity-80 transition-opacity"
        >
          {isLogin ? "Pas de compte ? S'inscrire" : 'Déjà un compte ? Se connecter'}
        </button>
      </div>
    </div>
  )
}