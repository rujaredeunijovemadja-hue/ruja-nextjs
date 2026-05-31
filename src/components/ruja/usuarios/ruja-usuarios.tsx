'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRuja } from '@/lib/ruja/context'
import { Spinner } from '@/components/ui/spinner'
import {
  fetchProfiles, fetchMyProfile, createUser,
  ROLE_LABELS, type RujaProfile,
} from '@/lib/ruja/users'

function gerarSenhaLocal(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$'
  return Array.from({ length: 12 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join('')
}

export default function RujaUsuarios() {
  const { departamentos } = useRuja()

  const [profiles,     setProfiles]     = useState<RujaProfile[]>([])
  const [myProfile,    setMyProfile]    = useState<RujaProfile | null>(null)
  const [loading,      setLoading]      = useState(true)
  const [showForm,     setShowForm]     = useState(false)
  const [saving,       setSaving]       = useState(false)
  const [toast,        setToast]        = useState('')
  const [senhaCopiada, setSenhaCopiada] = useState(false)
  const [resultado,    setResultado]    = useState<{
    nome: string; email: string; senha: string; role: string
  } | null>(null)

  const [form, setForm] = useState({
    nome:        '',
    email:       '',
    role:        'voluntario' as RujaProfile['role'],
    departamento:'',
    senha:       '',
    gerarSenha:  true,
  })
  const [formErr, setFormErr] = useState('')

  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(''), 4000) }

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [profs, mine] = await Promise.all([fetchProfiles(), fetchMyProfile()])
      setProfiles(profs)
      setMyProfile(mine)
    } catch (e) {
      showToast('Erro ao carregar usuários.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  // Verificar permissão
  const canCreate = myProfile?.role === 'lider_supremo' || myProfile?.role === 'admin'

  async function handleCreate() {
    setFormErr('')
    if (!form.nome.trim())  { setFormErr('Nome é obrigatório.'); return }
    if (!form.email.trim()) { setFormErr('Email é obrigatório.'); return }
    if (!form.gerarSenha && form.senha.length < 8) {
      setFormErr('Senha deve ter no mínimo 8 caracteres.')
      return
    }

    setSaving(true)
    try {
      const res = await createUser({
        nome:        form.nome.trim(),
        email:       form.email.trim(),
        role:        form.role,
        departamento:form.departamento,
        senha:       form.gerarSenha ? undefined : form.senha,
      })

      if (!res.ok) {
        setFormErr(res.error ?? 'Erro ao criar usuário.')
        return
      }

      // Exibir resultado com senha temporária
      const senhaFinal = res.senhaTemporaria ?? form.senha
      setResultado({
        nome:  res.usuario?.nome ?? form.nome,
        email: res.usuario?.email ?? form.email,
        senha: senhaFinal,
        role:  ROLE_LABELS[res.usuario?.role as RujaProfile['role']] ?? res.usuario?.role ?? '',
      })

      // Resetar form
      setForm({ nome:'', email:'', role:'voluntario', departamento:'', senha:'', gerarSenha:true })
      setShowForm(false)
      await loadData()
    } catch (e) {
      setFormErr(e instanceof Error ? e.message : 'Erro inesperado.')
    } finally {
      setSaving(false)
    }
  }

  function copiarSenha(senha: string) {
    navigator.clipboard.writeText(senha).catch(() => {})
    setSenhaCopiada(true)
    setTimeout(() => setSenhaCopiada(false), 2000)
  }

  if (loading) return <div className="flex-1 flex items-center justify-center"><Spinner /></div>

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-white">Usuários do Sistema</h1>
          <p className="text-gray-500 text-sm">
            {profiles.length} usuário{profiles.length !== 1 ? 's' : ''} ·{' '}
            {myProfile
              ? <span className="text-gray-400">{ROLE_LABELS[myProfile.role]}</span>
              : 'carregando perfil...'}
          </p>
        </div>
        {canCreate && (
          <button
            onClick={() => { setShowForm(true); setFormErr(''); setResultado(null) }}
            className="bg-red-600 hover:bg-red-700 text-white font-bold px-4 py-2.5 rounded-xl text-sm touch-manipulation"
          >
            + Novo usuário
          </button>
        )}
      </div>

      {/* Aviso sem permissão */}
      {!canCreate && myProfile && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 mb-4">
          <p className="text-yellow-400 text-sm">
            🔒 Apenas <strong>Líder Supremo</strong> e <strong>Administradores</strong> podem criar novos usuários.
          </p>
        </div>
      )}

      {/* Resultado de criação */}
      {resultado && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-5 mb-5 animate-fadeIn">
          <div className="text-green-400 font-bold mb-3">✅ Usuário criado com sucesso!</div>
          <div className="space-y-2 text-sm mb-4">
            <div className="flex gap-2"><span className="text-gray-400 w-20">Nome:</span><span className="text-white">{resultado.nome}</span></div>
            <div className="flex gap-2"><span className="text-gray-400 w-20">Email:</span><span className="text-white">{resultado.email}</span></div>
            <div className="flex gap-2"><span className="text-gray-400 w-20">Cargo:</span><span className="text-white">{resultado.role}</span></div>
          </div>

          {resultado.senha && (
            <div className="bg-black/40 border border-white/10 rounded-xl p-4">
              <div className="text-yellow-400 text-xs font-semibold mb-2 uppercase tracking-wider">
                ⚠️ Senha temporária — copie agora, não será exibida novamente
              </div>
              <div className="flex items-center gap-3">
                <code className="text-white font-mono text-lg bg-black/40 px-3 py-2 rounded-lg flex-1 select-all">
                  {resultado.senha}
                </code>
                <button
                  onClick={() => copiarSenha(resultado.senha)}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-sm rounded-lg touch-manipulation transition font-semibold"
                >
                  {senhaCopiada ? '✅ Copiado!' : '📋 Copiar'}
                </button>
              </div>
              <p className="text-gray-500 text-xs mt-2">
                Envie esta senha ao usuário por canal seguro (WhatsApp, Signal, etc). Peça para alterar no primeiro acesso.
              </p>
            </div>
          )}

          <button
            onClick={() => setResultado(null)}
            className="mt-3 text-gray-500 text-sm hover:text-gray-300 touch-manipulation"
          >
            Fechar
          </button>
        </div>
      )}

      {/* Lista de usuários */}
      {profiles.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <div className="text-4xl mb-3">👤</div>
          <p>Nenhum perfil cadastrado ainda.</p>
          <p className="text-xs mt-1">Execute a migration SQL para criar a tabela ruja_profiles.</p>
        </div>
      ) : (
        <div className="space-y-2 mb-20">
          {profiles.map(p => (
            <div key={p.id} className={`bg-[#111] border rounded-xl p-4 flex items-center gap-4
              ${!p.ativo ? 'opacity-50 border-white/5' : 'border-white/8'}`}>
              <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center text-red-400 font-bold text-sm flex-shrink-0">
                {p.nome.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-white font-semibold text-sm">{p.nome}</span>
                  {p.id === myProfile?.id && (
                    <span className="text-xs bg-white/10 text-gray-400 px-2 py-0.5 rounded-full">Você</span>
                  )}
                  {!p.ativo && (
                    <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full">Inativo</span>
                  )}
                </div>
                <div className="text-gray-500 text-xs mt-0.5">{p.email}</div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs bg-white/5 text-gray-400 px-2 py-0.5 rounded-full">
                    {ROLE_LABELS[p.role]}
                  </span>
                  {p.departamento && (
                    <span className="text-xs text-gray-600">· {p.departamento}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de criação */}
      {showForm && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-end md:items-center justify-center">
          <div className="bg-[#111] border border-white/10 rounded-t-2xl md:rounded-2xl w-full max-w-md max-h-[92dvh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/8 flex-shrink-0">
              <h2 className="text-white font-bold">Criar Novo Usuário</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 text-xl touch-manipulation">✕</button>
            </div>

            {/* Form */}
            <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
              {/* Nome */}
              <div>
                <label className={LBL}>Nome completo *</label>
                <input value={form.nome}
                  onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                  placeholder="Nome do usuário"
                  className={INP} />
              </div>

              {/* Email */}
              <div>
                <label className={LBL}>Email *</label>
                <input type="email" inputMode="email" autoCapitalize="none"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="email@dominio.com"
                  className={INP} />
              </div>

              {/* Cargo */}
              <div>
                <label className={LBL}>Cargo / Nível de Acesso</label>
                <select value={form.role}
                  onChange={e => setForm(f => ({ ...f, role: e.target.value as RujaProfile['role'] }))}
                  className={INP}>
                  <option value="voluntario">🙋 Voluntário</option>
                  <option value="lider_departamento">⭐ Líder de Departamento</option>
                  {myProfile?.role === 'lider_supremo' && (
                    <>
                      <option value="admin">🔑 Administrador</option>
                      <option value="lider_supremo">👑 Líder Supremo</option>
                    </>
                  )}
                </select>
              </div>

              {/* Departamento */}
              <div>
                <label className={LBL}>Departamento (opcional)</label>
                <select value={form.departamento}
                  onChange={e => setForm(f => ({ ...f, departamento: e.target.value }))}
                  className={INP}>
                  <option value="">— Sem departamento</option>
                  {departamentos.map(d => (
                    <option key={d.id} value={d.nome}>{d.icone} {d.nome}</option>
                  ))}
                </select>
              </div>

              {/* Senha */}
              <div>
                <label className={LBL}>Senha</label>
                <label className="flex items-center gap-2 mb-3 cursor-pointer touch-manipulation">
                  <input type="checkbox" checked={form.gerarSenha}
                    onChange={e => setForm(f => ({ ...f, gerarSenha: e.target.checked }))}
                    className="w-4 h-4" />
                  <span className="text-gray-300 text-sm">Gerar senha temporária automaticamente</span>
                </label>

                {!form.gerarSenha && (
                  <input type="password"
                    value={form.senha}
                    onChange={e => setForm(f => ({ ...f, senha: e.target.value }))}
                    placeholder="Mínimo 8 chars, 1 maiúscula, 1 número"
                    className={INP} />
                )}

                {form.gerarSenha && (
                  <div className="bg-black/30 border border-white/5 rounded-xl px-4 py-3 text-gray-500 text-sm flex items-center gap-2">
                    🔐 Uma senha segura de 12 caracteres será gerada e exibida após a criação.
                  </div>
                )}
              </div>

              {/* Aviso */}
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3">
                <p className="text-yellow-400 text-xs">
                  ⚠️ A senha temporária será exibida <strong>apenas uma vez</strong>.
                  Copie e envie ao usuário por canal seguro. Peça para alterar no primeiro acesso.
                </p>
              </div>

              {/* Erro */}
              {formErr && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm">
                  {formErr}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-4 border-t border-white/8 flex gap-3 flex-shrink-0">
              <button onClick={() => setShowForm(false)}
                className="flex-1 py-3 rounded-xl bg-white/5 text-gray-300 font-semibold touch-manipulation">
                Cancelar
              </button>
              <button onClick={handleCreate} disabled={saving}
                className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold flex items-center justify-center gap-2 touch-manipulation">
                {saving ? <Spinner size="sm" /> : '👤'}
                {saving ? 'Criando...' : 'Criar Usuário'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-gray-800 text-white text-sm px-5 py-2.5 rounded-full shadow-lg">
          {toast}
        </div>
      )}
    </div>
  )
}

const LBL = "block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5"
const INP = "w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-red-500/40 transition touch-manipulation"
