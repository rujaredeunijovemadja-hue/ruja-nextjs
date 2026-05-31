'use client'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { signIn, resetPassword, translateAuthError } from '@/lib/ruja/auth'
import { Spinner } from '@/components/ui/spinner'

export default function LoginPage() {
  const router   = useRouter()
  const emailRef = useRef<HTMLInputElement>(null)
  const passRef  = useRef<HTMLInputElement>(null)

  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState('')
  const [success,   setSuccess]   = useState('')
  const [showPass,  setShowPass]  = useState(false)
  const [forgotMode, setForgotMode] = useState(false)

  async function handleLogin() {
    const email = emailRef.current?.value.trim() ?? ''
    const pass  = passRef.current?.value ?? ''
    setError('')

    if (!email && !pass) { setError('Preencha email e senha.'); return }
    if (!email)  { setError('Informe seu email.'); return }
    if (!pass)   { setError('Informe sua senha.'); return }

    setLoading(true)
    try {
      await signIn(email, pass)
      setSuccess('Redirecionando...')
      router.push('/ruja')
      router.refresh()
    } catch (e) {
      setError(translateAuthError(e instanceof Error ? e.message : ''))
    } finally {
      setLoading(false)
    }
  }

  async function handleForgot() {
    const email = emailRef.current?.value.trim() ?? ''
    if (!email) { setError('Informe seu email para recuperar a senha.'); return }
    setLoading(true)
    setError('')
    try {
      await resetPassword(email)
      setSuccess('Link enviado! Verifique seu email.')
      setForgotMode(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao enviar link.')
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') forgotMode ? handleForgot() : handleLogin()
  }

  return (
    <div className="min-h-dvh bg-[#0A0A0A] flex items-center justify-center p-4">
      {/* Background decorativo */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-600/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-red-600/3 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm bg-[#111] border border-white/8 rounded-2xl p-8 shadow-2xl">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🦁</div>
          <h1 className="text-3xl font-black text-white tracking-tight">
            <span className="text-red-500">RUJA</span>
          </h1>
          <p className="text-gray-400 text-sm mt-1">Rede UniJovem ADJA — Painel de Gestão</p>
        </div>

        {/* Campos */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
              E-mail
            </label>
            <input
              ref={emailRef}
              type="email"
              autoComplete="email"
              autoCorrect="off"
              autoCapitalize="none"
              inputMode="email"
              placeholder="seu@email.com"
              onKeyDown={handleKeyDown}
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/30 transition touch-manipulation"
            />
          </div>

          {!forgotMode && (
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                Senha
              </label>
              <div className="relative">
                <input
                  ref={passRef}
                  type={showPass ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  onKeyDown={handleKeyDown}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 pr-12 text-white placeholder-gray-600 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/30 transition touch-manipulation"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 p-1 touch-manipulation"
                >
                  {showPass ? '🙈' : '👁️'}
                </button>
              </div>
            </div>
          )}

          {/* Feedback */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-green-500/10 border border-green-500/30 rounded-xl px-4 py-3 text-green-400 text-sm">
              {success}
            </div>
          )}

          {/* Botão principal */}
          <button
            type="button"
            onClick={forgotMode ? handleForgot : handleLogin}
            disabled={loading}
            className="w-full bg-red-600 hover:bg-red-700 active:bg-red-800 disabled:opacity-50 text-white font-black text-base uppercase tracking-wide rounded-xl py-4 mt-2 transition touch-manipulation min-h-[52px] flex items-center justify-center gap-2"
          >
            {loading ? <Spinner size="sm" /> : null}
            {loading
              ? (forgotMode ? 'Enviando...' : 'Entrando...')
              : (forgotMode ? '📧 Enviar link' : '🦁 Entrar no Painel')
            }
          </button>

          {/* Toggle esqueci senha */}
          <div className="text-center">
            <button
              type="button"
              onClick={() => { setForgotMode(v => !v); setError(''); setSuccess('') }}
              className="text-gray-500 text-sm hover:text-gray-300 transition touch-manipulation underline"
            >
              {forgotMode ? '← Voltar ao login' : 'Esqueci minha senha'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
