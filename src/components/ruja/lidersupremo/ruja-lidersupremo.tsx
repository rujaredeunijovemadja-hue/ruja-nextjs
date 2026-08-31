'use client'
import { useState, useRef } from 'react'
import { useRuja } from '@/lib/ruja/context'
import { saveConfig } from '@/lib/ruja/queries'
import { uploadFoto } from '@/lib/ruja/storage'
import { Spinner } from '@/components/ui/spinner'
import type { LiderSupremo } from '@/lib/ruja/types'
import { X, Crown, Pencil, MessageCircle, Camera, BookOpen, Target, FileText, Clock, CalendarDays, type LucideIcon } from 'lucide-react'

export default function RujaLiderSupremo() {
  const { liderSupremo, loading, reload } = useRuja()
  const [editando, setEditando] = useState(false)
  const [saving,   setSaving]   = useState(false)
  const [toast,    setToast]    = useState('')
  const [fotoFile, setFotoFile] = useState<File | null>(null)
  const [fotoPreview, setFotoPreview] = useState('')
  const fotoRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState<LiderSupremo>({ ...liderSupremo })

  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(''), 3000) }

  function abrirEditar() {
    setForm({ ...liderSupremo })
    setFotoPreview(liderSupremo.foto ?? '')
    setFotoFile(null)
    setEditando(true)
  }

  function handleFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFotoFile(file)
    setFotoPreview(URL.createObjectURL(file))
  }

  async function handleSave() {
    setSaving(true)
    try {
      let foto = form.foto
      if (fotoFile) {
        const result = await uploadFoto('lider-supremo', fotoFile)
        foto = result.url
      }
      await saveConfig('lider_supremo', { ...form, foto })
      await reload()
      setEditando(false)
      showToast('Perfil salvo!')
    } catch (e) {
      showToast('Erro: ' + (e instanceof Error ? e.message : ''))
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="flex-1 flex items-center justify-center"><Spinner /></div>

  const ls = liderSupremo

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <h1 className="flex items-center gap-2 text-xl font-bold text-white"><Crown size={20} className="text-yellow-400" />Líder Supremo</h1>
        <button onClick={abrirEditar}
          className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white font-bold px-4 py-2.5 rounded-xl text-sm touch-manipulation">
          <Pencil size={14} />Editar
        </button>
      </div>

      {/* Perfil */}
      <div className="bg-[#111] border border-white/8 rounded-2xl overflow-hidden mb-4">
        {/* Header com foto */}
        <div className="relative h-32 bg-gradient-to-br from-red-900/40 to-black">
          <div className="absolute -bottom-10 left-6">
            <div className="w-20 h-20 rounded-full border-4 border-[#111] overflow-hidden bg-red-500/20 flex items-center justify-center">
              {ls.foto
                ? <img src={ls.foto} alt={ls.nome} className="w-full h-full object-cover" />
                : ls.nome ? <span className="text-red-400 font-black text-2xl">{ls.nome.charAt(0)}</span> : <Crown size={28} className="text-red-400" />
              }
            </div>
          </div>
        </div>

        <div className="pt-14 px-6 pb-6">
          <h2 className="text-white text-xl font-black">{ls.nome || '—'}</h2>
          <p className="text-red-400 text-sm font-semibold mt-0.5">{ls.funcao || 'Líder Supremo'}</p>

          <div className="grid grid-cols-2 gap-3 mt-4">
            {ls.contato && (
              <a href={`https://wa.me/55${ls.contato.replace(/\D/g,'')}`} target="_blank" rel="noreferrer"
                className="flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-xl px-3 py-2.5 text-green-400 text-sm touch-manipulation hover:bg-green-500/20 transition">
                <MessageCircle size={15} />WhatsApp
              </a>
            )}
            {ls.instagram && (
              <a href={`https://instagram.com/${ls.instagram.replace('@','')}`} target="_blank" rel="noreferrer"
                className="flex items-center gap-2 bg-purple-500/10 border border-purple-500/20 rounded-xl px-3 py-2.5 text-purple-400 text-sm touch-manipulation hover:bg-purple-500/20 transition">
                <Camera size={15} />Instagram
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Informações */}
      <div className="space-y-3">
        {ls.versiculoLider && (
          <InfoCard icon={BookOpen} label="Versículo" value={ls.versiculoLider} highlight />
        )}
        {ls.visao && (
          <InfoCard icon={Target} label="Visão do Ministério" value={ls.visao} />
        )}
        {ls.descricao && (
          <InfoCard icon={FileText} label="Sobre" value={ls.descricao} />
        )}
        {ls.tempoRuja && (
          <InfoCard icon={Clock} label="Tempo na RUJA" value={ls.tempoRuja} />
        )}
        {ls.dataPosseLider && (
          <InfoCard icon={CalendarDays} label="Data de Posse" value={ls.dataPosseLider} />
        )}
      </div>

      {/* Modal de edição */}
      {editando && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-end md:items-center justify-center">
          <div className="bg-[#111] border border-white/10 rounded-t-2xl md:rounded-2xl w-full max-w-lg max-h-[92dvh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/8 flex-shrink-0">
              <h2 className="text-white font-bold">Editar Perfil</h2>
              <button onClick={() => setEditando(false)} className="text-gray-400 text-xl touch-manipulation"><X size={16} /></button>
            </div>

            <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
              {/* Foto */}
              <div className="flex items-center gap-4">
                <div onClick={() => fotoRef.current?.click()}
                  className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center text-red-400 font-bold text-xl cursor-pointer overflow-hidden border-2 border-dashed border-red-500/30 touch-manipulation flex-shrink-0">
                  {fotoPreview
                    ? <img src={fotoPreview} className="w-full h-full object-cover" alt="" />
                    : (form.nome ? form.nome.charAt(0) : <Crown size={22} />)
                  }
                </div>
                <button onClick={() => fotoRef.current?.click()}
                  className="text-sm text-red-400 hover:text-red-300 touch-manipulation">
                  {fotoPreview ? 'Trocar foto' : '+ Adicionar foto'}
                </button>
                <input ref={fotoRef} type="file" accept="image/*" onChange={handleFoto} className="hidden" />
              </div>

              {[
                { key: 'nome',           label: 'Nome completo',           placeholder: 'Nome do líder' },
                { key: 'funcao',         label: 'Função / Cargo',          placeholder: 'Ex: Pastor, Líder' },
                { key: 'contato',        label: 'WhatsApp',                placeholder: '(21) 99999-9999' },
                { key: 'instagram',      label: 'Instagram',               placeholder: '@usuario' },
                { key: 'dataPosseLider', label: 'Data de Posse',           placeholder: 'Ex: 15/03/2022' },
                { key: 'tempoRuja',      label: 'Tempo na RUJA',           placeholder: 'Ex: Desde 2018 · 6 anos' },
                { key: 'versiculoLider', label: 'Versículo',               placeholder: 'Ex: Josué 1:9' },
              ].map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label className={LBL}>{label}</label>
                  <input
                    value={(form as unknown as Record<string, string>)[key] ?? ''}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className={INP}
                  />
                </div>
              ))}

              {[
                { key: 'visao',    label: 'Visão do Ministério', placeholder: 'Descreva a visão...' },
                { key: 'descricao',label: 'Sobre o Líder',       placeholder: 'Breve descrição...' },
              ].map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label className={LBL}>{label}</label>
                  <textarea rows={3}
                    value={(form as unknown as Record<string, string>)[key] ?? ''}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className={INP + ' resize-none'}
                  />
                </div>
              ))}
            </div>

            <div className="px-5 py-4 border-t border-white/8 flex gap-3 flex-shrink-0">
              <button onClick={() => setEditando(false)}
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
      )}

      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-gray-800 text-white text-sm px-5 py-2.5 rounded-full shadow-lg">{toast}</div>
      )}
    </div>
  )
}

function InfoCard({ icon: Icon, label, value, highlight }: { icon: LucideIcon; label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`bg-[#111] border rounded-xl p-4 ${highlight ? 'border-red-500/20' : 'border-white/8'}`}>
      <div className="flex items-center gap-1.5 text-gray-500 text-xs uppercase tracking-wider mb-1"><Icon size={12} />{label}</div>
      <p className={`text-sm leading-relaxed ${highlight ? 'text-red-300 italic' : 'text-gray-300'}`}>{value}</p>
    </div>
  )
}

const LBL = "block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5"
const INP = "w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-red-500/40 transition touch-manipulation"
