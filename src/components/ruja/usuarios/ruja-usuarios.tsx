'use client'
// ─── GESTÃO DE USUÁRIOS DO RUJA ───────────────────────────────
// Alinhado com schema real: departamento_id (FK), created_at/updated_at.
// Funcionalidades: criar, editar cargo/departamento, ativar/desativar.

import { useState, useEffect, useCallback } from 'react'
import { useRuja } from '@/lib/ruja/context'
import { Spinner } from '@/components/ui/spinner'
import {
  fetchProfiles, fetchMyProfile, createUser, updateProfile,
  ROLE_LABELS, type RujaProfile,
} from '@/lib/ruja/users'
import { getRujaErrorMessage } from '@/lib/ruja/errors'

// ── Estado do form de criação ──────────────────────────────────
const FORM_INICIAL = {
  nome:           '',
  email:          '',
  role:           'voluntario' as RujaProfile['role'],
  departamento_id: '',
  senha:          '',
  gerarSenha:     true,
}

export default function RujaUsuarios() {
  const { departamentos } = useRuja()

  const [profiles,      setProfiles]      = useState<RujaProfile[]>([])
  const [myProfile,     setMyProfile]     = useState<RujaProfile | null>(null)
  const [loading,       setLoading]       = useState(true)
  const [showForm,      setShowForm]      = useState(false)
  const [saving,        setSaving]        = useState(false)
  const [toast,         setToast]         = useState('')
  const [loadError,     setLoadError]     = useState('')
  const [senhaCopiada,  setSenhaCopiada]  = useState(false)
  const [resultado,     setResultado]     = useState<{
    nome: string; email: string; senha: string; role: string
  } | null>(null)

  // Estado do modal de edição
  const [editando,  setEditando]  = useState<RujaProfile | null>(null)
  const [editForm,  setEditForm]  = useState<{
    role:            RujaProfile['role']
    departamento_id: string
    ativo:           boolean
  }>({ role: 'voluntario', departamento_id: '', ativo: true })
  const [editSaving, setEditSaving] = useState(false)

  const [form,    setForm]    = useState(FORM_INICIAL)
  const [formErr, setFormErr] = useState('')

  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(''), 4000) }

  const loadData = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      const [profs, mine] = await Promise.all([fetchProfiles(), fetchMyProfile()])
      setProfiles(profs)
      setMyProfile(mine)
    } catch (error) {
      const message = getRujaErrorMessage(error, 'Erro ao carregar usuários.')
      setLoadError(message)
      showToast(message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void Promise.resolve().then(loadData)
  }, [loadData])

  const canCreate = myProfile?.role === 'lider_supremo'

  // Verifica se pode editar um perfil alvo
  function canEdit(target: RujaProfile): boolean {
    if (!myProfile) return false
    if (target.id === myProfile.id) return false // não edita a si mesmo
    if (myProfile.role === 'lider_supremo') return true
    return false
  }

  // ── Criar usuário ──────────────────────────────────────────
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
        nome:            form.nome.trim(),
        email:           form.email.trim(),
        role:            form.role,
        departamento_id: form.departamento_id || null,
        senha:           form.gerarSenha ? undefined : form.senha,
      })

      if (!res.ok) { setFormErr(res.error ?? 'Erro ao criar usuário.'); return }

      const senhaFinal = res.senhaTemporaria ?? form.senha
      setResultado({
        nome:  res.usuario?.nome ?? form.nome,
        email: res.usuario?.email ?? form.email,
        senha: senhaFinal,
        role:  ROLE_LABELS[res.usuario?.role as RujaProfile['role']] ?? res.usuario?.role ?? '',
      })

      setForm(FORM_INICIAL)
      setShowForm(false)
      await loadData()
    } catch (e) {
      setFormErr(e instanceof Error ? e.message : 'Erro inesperado.')
    } finally {
      setSaving(false)
    }
  }

  // ── Abrir modal de edição ──────────────────────────────────
  function abrirEdicao(p: RujaProfile) {
    setEditando(p)
    setEditForm({
      role:            p.role,
      departamento_id: p.departamento_id ?? '',
      ativo:           p.ativo,
    })
  }

  // ── Salvar edição ──────────────────────────────────────────
  async function handleSalvarEdicao() {
    if (!editando) return
    setEditSaving(true)
    try {
      const res = await updateProfile({
        id:              editando.id,
        role:            editForm.role,
        departamento_id: editForm.departamento_id || null,
        ativo:           editForm.ativo,
      })
      if (!res.ok) { showToast(res.error ?? 'Erro ao atualizar.'); return }
      showToast('✅ Usuário atualizado com sucesso.')
      setEditando(null)
      await loadData()
    } catch {
      showToast('Erro ao atualizar usuário.')
    } finally {
      setEditSaving(false)
    }
  }

  function copiarSenha(senha: string) {
    navigator.clipboard.writeText(senha).catch(() => {})
    setSenhaCopiada(true)
    setTimeout(() => setSenhaCopiada(false), 2000)
  }

  // Helper: nome do departamento a partir do id
  function nomeDepto(id: string | null): string {
    if (!id) return ''
    const d = departamentos.find(d => d.id === id)
    return d ? `${d.icone} ${d.nome}` : id
  }

  if (loading) return <div className="flex-1 flex items-center justify-center"><Spinner /></div>

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">

      {/* ── HEADER ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-white">Usuários do Sistema</h1>
          <p className="text-gray-500 text-sm">
            {profiles.length} usuário{profiles.length !== 1 ? 's' : ''} ·{' '}
            {myProfile
              ? <span className="text-gray-400">{ROLE_LABELS[myProfile.role]}</span>
              : loadError ? 'perfil indisponível' : 'perfil não configurado'}
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

      {loadError && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-4">
          <p className="text-red-400 text-sm">{loadError}</p>
        </div>
      )}

      {/* Aviso sem permissão */}
      {!canCreate && myProfile && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 mb-4">
          <p className="text-yellow-400 text-sm">
            🔒 Apenas <strong>Líder Supremo</strong> e <strong>Administradores</strong> podem criar ou editar usuários.
          </p>
        </div>
      )}

      {/* ── RESULTADO DE CRIAÇÃO ────────────────────────────── */}
      {resultado && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-5 mb-5">
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
                Envie por WhatsApp ou canal seguro. Peça para alterar no primeiro acesso.
              </p>
            </div>
          )}

          <button onClick={() => setResultado(null)}
            className="mt-3 text-gray-500 text-sm hover:text-gray-300 touch-manipulation">
            Fechar
          </button>
        </div>
      )}

      {/* ── LISTA DE USUÁRIOS ───────────────────────────────── */}
      {profiles.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <div className="text-4xl mb-3">👤</div>
          <p>Nenhum perfil cadastrado ainda.</p>
        </div>
      ) : (
        <div className="space-y-2 mb-24">
          {profiles.map(p => (
            <div key={p.id} className={`bg-[#111] border rounded-xl p-4 flex items-center gap-4
              ${!p.ativo ? 'opacity-50 border-white/5' : 'border-white/8'}`}>

              {/* Avatar */}
              <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center text-red-400 font-bold text-sm flex-shrink-0">
                {p.nome.charAt(0).toUpperCase()}
              </div>

              {/* Info */}
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
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="text-xs bg-white/5 text-gray-400 px-2 py-0.5 rounded-full">
                    {ROLE_LABELS[p.role]}
                  </span>
                  {p.departamento_id && (
                    <span className="text-xs text-gray-600">· {nomeDepto(p.departamento_id)}</span>
                  )}
                </div>
              </div>

              {/* Botão editar */}
              {canEdit(p) && (
                <button
                  onClick={() => abrirEdicao(p)}
                  className="flex-shrink-0 p-2 rounded-lg bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white transition touch-manipulation text-xs"
                  title="Editar usuário"
                >
                  ✏️
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── MODAL CRIAR USUÁRIO ──────────────────────────────── */}
      {showForm && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-end md:items-center justify-center">
          <div className="bg-[#111] border border-white/10 rounded-t-2xl md:rounded-2xl w-full max-w-md max-h-[92dvh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/8 flex-shrink-0">
              <h2 className="text-white font-bold">Criar Novo Usuário</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 text-xl touch-manipulation">✕</button>
            </div>

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
                  <option value="visualizador">👁 Visualizador</option>
                  <option value="lider_departamento">⭐ Líder de Departamento</option>
                  {myProfile?.role === 'lider_supremo' && (
                    <>
                      <option value="administrador">🔑 Administrador</option>
                      <option value="lider_supremo">👑 Líder Supremo</option>
                    </>
                  )}
                </select>
              </div>

              {/* Departamento */}
              <div>
                <label className={LBL}>Departamento (opcional)</label>
                <select value={form.departamento_id}
                  onChange={e => setForm(f => ({ ...f, departamento_id: e.target.value }))}
                  className={INP}>
                  <option value="">— Sem departamento</option>
                  {departamentos.filter(d => ['teens', 'simply'].includes(d.id)).map(d => (
                    <option key={d.id} value={d.id}>{d.icone} {d.nome}</option>
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
                    placeholder="Mín. 8 chars, 1 maiúscula, 1 número"
                    className={INP} />
                )}

                {form.gerarSenha && (
                  <div className="bg-black/30 border border-white/5 rounded-xl px-4 py-3 text-gray-500 text-sm">
                    🔐 Senha de 12 caracteres gerada e exibida após criação.
                  </div>
                )}
              </div>

              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3">
                <p className="text-yellow-400 text-xs">
                  ⚠️ A senha temporária será exibida <strong>apenas uma vez</strong>.
                  Copie e envie por canal seguro.
                </p>
              </div>

              {formErr && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm">
                  {formErr}
                </div>
              )}
            </div>

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

      {/* ── MODAL EDITAR USUÁRIO ─────────────────────────────── */}
      {editando && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-end md:items-center justify-center">
          <div className="bg-[#111] border border-white/10 rounded-t-2xl md:rounded-2xl w-full max-w-md max-h-[92dvh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/8 flex-shrink-0">
              <div>
                <h2 className="text-white font-bold">Editar Usuário</h2>
                <p className="text-gray-500 text-xs mt-0.5">{editando.nome} · {editando.email}</p>
              </div>
              <button onClick={() => setEditando(null)} className="text-gray-400 text-xl touch-manipulation">✕</button>
            </div>

            <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">

              {/* Cargo */}
              <div>
                <label className={LBL}>Cargo / Nível de Acesso</label>
                <select value={editForm.role}
                  onChange={e => setEditForm(f => ({ ...f, role: e.target.value as RujaProfile['role'] }))}
                  className={INP}>
                  <option value="voluntario">🙋 Voluntário</option>
                  <option value="visualizador">👁 Visualizador</option>
                  <option value="lider_departamento">⭐ Líder de Departamento</option>
                  {myProfile?.role === 'lider_supremo' && (
                    <>
                      <option value="administrador">🔑 Administrador</option>
                      <option value="lider_supremo">👑 Líder Supremo</option>
                    </>
                  )}
                </select>
              </div>

              {/* Departamento */}
              <div>
                <label className={LBL}>Departamento</label>
                <select value={editForm.departamento_id}
                  onChange={e => setEditForm(f => ({ ...f, departamento_id: e.target.value }))}
                  className={INP}>
                  <option value="">— Sem departamento</option>
                  {departamentos.filter(d => ['teens', 'simply'].includes(d.id)).map(d => (
                    <option key={d.id} value={d.id}>{d.icone} {d.nome}</option>
                  ))}
                </select>
              </div>

              {/* Status ativo */}
              <div>
                <label className={LBL}>Status da Conta</label>
                <div className="flex gap-3">
                  <button
                    onClick={() => setEditForm(f => ({ ...f, ativo: true }))}
                    className={`flex-1 py-3 rounded-xl text-sm font-bold transition touch-manipulation
                      ${editForm.ativo
                        ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                        : 'bg-white/5 text-gray-500 border border-white/5'}`}>
                    ✅ Ativo
                  </button>
                  <button
                    onClick={() => setEditForm(f => ({ ...f, ativo: false }))}
                    className={`flex-1 py-3 rounded-xl text-sm font-bold transition touch-manipulation
                      ${!editForm.ativo
                        ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                        : 'bg-white/5 text-gray-500 border border-white/5'}`}>
                    🚫 Inativo
                  </button>
                </div>
              </div>

              {!editForm.ativo && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2.5">
                  <p className="text-red-400 text-xs">
                    ⚠️ Desativar bloqueia o acesso imediatamente. O usuário não conseguirá fazer login.
                  </p>
                </div>
              )}
            </div>

            <div className="px-5 py-4 border-t border-white/8 flex gap-3 flex-shrink-0">
              <button onClick={() => setEditando(null)}
                className="flex-1 py-3 rounded-xl bg-white/5 text-gray-300 font-semibold touch-manipulation">
                Cancelar
              </button>
              <button onClick={handleSalvarEdicao} disabled={editSaving}
                className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold flex items-center justify-center gap-2 touch-manipulation">
                {editSaving ? <Spinner size="sm" /> : null}
                {editSaving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── TOAST ───────────────────────────────────────────── */}
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
