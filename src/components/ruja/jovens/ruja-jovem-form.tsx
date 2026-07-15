'use client'
import { useState, useRef } from 'react'
import { useRuja } from '@/lib/ruja/context'
import { upsertJovem } from '@/lib/ruja/queries'
import { uploadFoto, removeFoto } from '@/lib/ruja/storage'
import { Spinner } from '@/components/ui/spinner'
import type { Jovem, Status, Batizado } from '@/lib/ruja/types'
import type { DepartmentScope } from '@/lib/ruja/departments'
import { activeDepartments, DEPARTMENT_LABELS } from '@/lib/ruja/departments'

const STATUS_OPTS: Status[] = ['Ativo', 'Oscilando', 'Ocioso', 'Em Risco']

interface Props {
  jovem: Jovem | null
  scope?: DepartmentScope
  onClose: () => void
  onSaved: () => void
}

export function RujaJovemForm({ jovem, scope = 'all', onClose, onSaved }: Props) {
  const { lideres, departamentos } = useRuja()
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState('')
  const [fotoFile, setFotoFile] = useState<File | null>(null)
  const [fotoPreview, setFotoPreview] = useState(jovem?.foto_url ?? '')
  const fotoRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({
    nome:        jovem?.nome        ?? '',
    contato:     jovem?.contato     ?? '',
    instagram:   jovem?.instagram   ?? '',
    endereco:    jovem?.endereco    ?? '',
    departamento:jovem?.departamento ?? (scope === 'all' ? '' : DEPARTMENT_LABELS[scope]),
    lider:       jovem?.lider       ?? '',
    status:      (jovem?.status     ?? 'Em Risco') as Status,
    entrada:     jovem?.entrada     ?? '',
    batizado:    (jovem?.batizado   ?? 'nao') as Batizado,
    data_batismo:jovem?.data_batismo ?? '',
    data_nasc:   jovem?.data_nasc   ?? '',
    obs:         jovem?.obs         ?? '',
  })

  const deptosSelecionados = form.departamento
    ? form.departamento.split(';').filter(Boolean)
    : []
  const deptos = activeDepartments(departamentos)

  function toggleDepto(d: string) {
    const atual = new Set(deptosSelecionados)
    if (atual.has(d)) atual.delete(d)
    else atual.add(d)
    setForm(f => ({ ...f, departamento: Array.from(atual).join(';') }))
  }

  function handleFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFotoFile(file)
    setFotoPreview(URL.createObjectURL(file))
  }

  async function handleSave() {
    if (!form.nome.trim() || !form.contato.trim()) {
      setError('Nome e WhatsApp são obrigatórios.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const id = jovem?.id ?? String(Date.now())
      let foto_path = jovem?.foto_path ?? ''
      let foto_url  = jovem?.foto_url  ?? ''

      // Upload de foto se houver nova
      if (fotoFile) {
        if (foto_path) await removeFoto(foto_path).catch(() => {})
        const result = await uploadFoto(id, fotoFile)
        foto_path = result.path
        foto_url  = result.url
      }

      await upsertJovem({
        id,
        ...form,
        foto_path,
        foto_url,
        idade: 0,
      })
      onSaved()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao salvar.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-end md:items-center justify-center">
      <div className="bg-[#111] border border-white/10 rounded-t-2xl md:rounded-2xl w-full max-w-lg max-h-[92dvh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
          <h2 className="text-white font-bold">{jovem ? 'Editar Jovem' : 'Novo Jovem'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl touch-manipulation">✕</button>
        </div>

        {/* Scroll area */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
          {/* Foto */}
          <div className="flex items-center gap-4">
            <div
              onClick={() => fotoRef.current?.click()}
              className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center text-red-400 font-bold text-xl cursor-pointer overflow-hidden border-2 border-dashed border-red-500/30 touch-manipulation"
            >
              {fotoPreview
                ? <img src={fotoPreview} className="w-full h-full object-cover" alt="" />
                : form.nome.charAt(0).toUpperCase() || '+'
              }
            </div>
            <div>
              <button onClick={() => fotoRef.current?.click()}
                className="text-sm text-red-400 hover:text-red-300 touch-manipulation">
                {fotoPreview ? 'Trocar foto' : '+ Adicionar foto'}
              </button>
              <p className="text-gray-600 text-xs mt-0.5">JPG, PNG ou WebP · máx 2MB</p>
            </div>
            <input ref={fotoRef} type="file" accept="image/*" onChange={handleFoto} className="hidden" />
          </div>

          {/* Nome */}
          <Field label="Nome completo *">
            <input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
              placeholder="Nome do jovem" className={INPUT} />
          </Field>

          {/* WhatsApp */}
          <Field label="WhatsApp *">
            <input value={form.contato} onChange={e => setForm(f => ({ ...f, contato: e.target.value }))}
              placeholder="(21) 99999-9999" inputMode="tel" className={INPUT} />
          </Field>

          {/* Instagram */}
          <Field label="Instagram">
            <input value={form.instagram} onChange={e => setForm(f => ({ ...f, instagram: e.target.value }))}
              placeholder="@usuario" className={INPUT} />
          </Field>

          {/* Status */}
          <Field label="Status">
            <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as Status }))}
              className={INPUT}>
              {STATUS_OPTS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>

          {/* Departamentos */}
          <Field label="Departamentos">
            <div className="flex flex-wrap gap-2">
              {deptos.map(d => (
                <button key={d.id} type="button"
                  onClick={() => toggleDepto(d.nome)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition touch-manipulation
                    ${deptosSelecionados.includes(d.nome)
                      ? 'bg-red-600 text-white'
                      : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
                >
                  {d.nome}
                </button>
              ))}
            </div>
          </Field>

          {/* Líder */}
          <Field label="Líder responsável">
            <select value={form.lider} onChange={e => setForm(f => ({ ...f, lider: e.target.value }))}
              className={INPUT}>
              <option value="">— Selecionar líder</option>
              {lideres.map(l => <option key={l.id} value={l.nome}>{l.nome}</option>)}
            </select>
          </Field>

          {/* Data de entrada */}
          <Field label="Data de entrada">
            <input type="date" value={form.entrada}
              onChange={e => setForm(f => ({ ...f, entrada: e.target.value }))} className={INPUT} />
          </Field>

          {/* Data de nascimento */}
          <Field label="Data de nascimento">
            <input type="date" value={form.data_nasc}
              onChange={e => setForm(f => ({ ...f, data_nasc: e.target.value }))} className={INPUT} />
          </Field>

          {/* Batizado */}
          <Field label="Batizado">
            <div className="flex gap-3">
              {(['sim','nao'] as Batizado[]).map(b => (
                <button key={b} type="button"
                  onClick={() => setForm(f => ({ ...f, batizado: b }))}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition touch-manipulation
                    ${form.batizado === b ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-white/5 text-gray-400'}`}
                >
                  {b === 'sim' ? '✅ Sim' : '❌ Não'}
                </button>
              ))}
            </div>
          </Field>

          {form.batizado === 'sim' && (
            <Field label="Data do batismo">
              <input type="date" value={form.data_batismo}
                onChange={e => setForm(f => ({ ...f, data_batismo: e.target.value }))} className={INPUT} />
            </Field>
          )}

          {/* Endereço */}
          <Field label="Endereço">
            <input value={form.endereco} onChange={e => setForm(f => ({ ...f, endereco: e.target.value }))}
              placeholder="Rua, bairro" className={INPUT} />
          </Field>

          {/* Observações */}
          <Field label="Observações">
            <textarea value={form.obs} onChange={e => setForm(f => ({ ...f, obs: e.target.value }))}
              rows={3} placeholder="Anotações internas..." className={INPUT + ' resize-none'} />
          </Field>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-white/8 flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-3 rounded-xl bg-white/5 text-gray-300 font-semibold touch-manipulation">
            Cancelar
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold flex items-center justify-center gap-2 touch-manipulation">
            {saving ? <Spinner size="sm" /> : null}
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  )
}

const INPUT = "w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-red-500/40 transition touch-manipulation"

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">{label}</label>
      {children}
    </div>
  )
}
