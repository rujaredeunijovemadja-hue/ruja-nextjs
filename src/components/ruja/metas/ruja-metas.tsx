'use client'
import { useState } from 'react'
import { useRuja } from '@/lib/ruja/context'
import { saveConfig } from '@/lib/ruja/queries'
import { Spinner } from '@/components/ui/spinner'
import { DEFAULT_REGRAS, DEFAULT_METAS } from '@/lib/ruja/types'
import { Landmark, Droplet, CheckCircle2, Target, Settings, Save } from 'lucide-react'

function sanitize(val: number, min: number, max: number, def: number): number {
  const n = parseInt(String(val))
  return isNaN(n) || n < min || n > max ? def : n
}

export default function RujaMetas() {
  const { jovens, metas, regras, loading, reload } = useRuja()

  const [formMetas,  setFormMetas]  = useState({ ...metas })
  const [formRegras, setFormRegras] = useState({ ...regras })
  const [saving,     setSaving]     = useState<'metas'|'regras'|null>(null)
  const [toast,      setToast]      = useState('')

  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(''), 3000) }

  async function salvarMetas() {
    setSaving('metas')
    try {
      const payload = {
        ativosDepto:    sanitize(formMetas.ativosDepto,    1, 9999, DEFAULT_METAS.ativosDepto),
        batizadosDepto: sanitize(formMetas.batizadosDepto, 0, 9999, DEFAULT_METAS.batizadosDepto),
      }
      await saveConfig('metas', payload)
      await reload()
      showToast('Metas salvas!')
    } catch (e) {
      showToast('Erro: ' + (e instanceof Error ? e.message : ''))
    } finally {
      setSaving(null)
    }
  }

  async function salvarRegras() {
    setSaving('regras')
    try {
      const payload = {
        ativo:     sanitize(formRegras.ativo,     1, 100, DEFAULT_REGRAS.ativo),
        oscilando: sanitize(formRegras.oscilando, 0, 100, DEFAULT_REGRAS.oscilando),
        risco:     sanitize(formRegras.risco,     1,  20, DEFAULT_REGRAS.risco),
      }
      await saveConfig('regras', payload)
      await reload()
      showToast('Regras salvas!')
    } catch (e) {
      showToast('Erro: ' + (e instanceof Error ? e.message : ''))
    } finally {
      setSaving(null)
    }
  }

  if (loading) return <div className="flex-1 flex items-center justify-center"><Spinner /></div>

  const ativosDepto    = jovens.filter(j => j.status === 'Ativo' && j.departamento).length
  const batizadosDepto = jovens.filter(j => j.batizado === 'sim' && j.status === 'Ativo' && j.departamento).length
  const pctAtivos      = metas.ativosDepto > 0 ? Math.min(100, Math.round((ativosDepto / metas.ativosDepto) * 100)) : 0
  const pctBatizados   = metas.batizadosDepto > 0 ? Math.min(100, Math.round((batizadosDepto / metas.batizadosDepto) * 100)) : 0

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-5">
      <h1 className="text-xl font-bold text-white">Metas do Ministério</h1>

      {/* Progresso atual */}
      <div className="grid md:grid-cols-2 gap-3">
        {[
          { label:'Ativos em Departamento', icon: Landmark, atual: ativosDepto, meta: metas.ativosDepto, pct: pctAtivos, color:'bg-green-500' },
          { label:'Batizados Ativos em Dep.', icon: Droplet, atual: batizadosDepto, meta: metas.batizadosDepto, pct: pctBatizados, color:'bg-blue-500' },
        ].map(({ label, icon: Icon, atual, meta, pct, color }) => (
          <div key={label} className="bg-[#111] border border-white/8 rounded-xl p-4">
            <div className="flex items-center gap-1.5 text-gray-400 text-sm mb-2"><Icon size={14} />{label}</div>
            <div className="text-3xl font-black text-white">
              {atual} <span className="text-gray-600 text-lg font-normal">/ {meta}</span>
            </div>
            <div className="bg-white/5 rounded-full h-2.5 mt-3">
              <div className={`${color} h-2.5 rounded-full transition-all`} style={{ width:`${pct}%` }} />
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-gray-500 text-xs">{pct}%</span>
              {pct >= 100 && <span className="flex items-center gap-1 text-green-400 text-xs font-bold"><CheckCircle2 size={12} />Meta atingida!</span>}
            </div>
          </div>
        ))}
      </div>

      {/* Configurar metas */}
      <div className="bg-[#111] border border-white/8 rounded-xl p-5">
        <h2 className="flex items-center gap-2 text-white font-semibold mb-4"><Target size={17} className="text-red-400" />Configurar Metas</h2>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className={LBL}>Ativos em Departamento</label>
            <input type="number" min={1} max={9999}
              value={formMetas.ativosDepto}
              onChange={e => setFormMetas(f => ({ ...f, ativosDepto: parseInt(e.target.value)||0 }))}
              className={INP} />
          </div>
          <div>
            <label className={LBL}>Batizados em Departamento</label>
            <input type="number" min={0} max={9999}
              value={formMetas.batizadosDepto}
              onChange={e => setFormMetas(f => ({ ...f, batizadosDepto: parseInt(e.target.value)||0 }))}
              className={INP} />
          </div>
        </div>
        <button onClick={salvarMetas} disabled={saving === 'metas'}
          className="w-full py-3 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold rounded-xl touch-manipulation">
          {saving === 'metas' ? 'Salvando...' : <span className="flex items-center justify-center gap-2"><Save size={16} />Salvar Metas</span>}
        </button>
      </div>

      {/* Regras de status */}
      <div className="bg-[#111] border border-white/8 rounded-xl p-5">
        <h2 className="flex items-center gap-2 text-white font-semibold mb-1"><Settings size={17} className="text-red-400" />Regras de Status Automático</h2>
        <p className="text-gray-500 text-xs mb-4">Aplicadas automaticamente ao registrar frequência.</p>
        <div className="space-y-4 mb-4">
          <div>
            <label className={LBL}><span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-1.5" />Ativo — Frequência mínima (%)</label>
            <input type="number" min={1} max={100}
              value={formRegras.ativo}
              onChange={e => setFormRegras(f => ({ ...f, ativo: parseInt(e.target.value)||0 }))}
              className={INP} />
          </div>
          <div>
            <label className={LBL}><span className="inline-block w-2 h-2 rounded-full bg-yellow-400 mr-1.5" />Oscilando — Frequência mínima (%)</label>
            <input type="number" min={0} max={100}
              value={formRegras.oscilando}
              onChange={e => setFormRegras(f => ({ ...f, oscilando: parseInt(e.target.value)||0 }))}
              className={INP} />
          </div>
          <div>
            <label className={LBL}><span className="inline-block w-2 h-2 rounded-full bg-red-500 mr-1.5" />Em Risco — Faltas seguidas</label>
            <input type="number" min={1} max={20}
              value={formRegras.risco}
              onChange={e => setFormRegras(f => ({ ...f, risco: parseInt(e.target.value)||0 }))}
              className={INP} />
          </div>
        </div>
        <button onClick={salvarRegras} disabled={saving === 'regras'}
          className="w-full py-3 bg-white/10 hover:bg-white/15 disabled:opacity-50 text-white font-bold rounded-xl touch-manipulation">
          {saving === 'regras' ? 'Salvando...' : <span className="flex items-center justify-center gap-2"><Save size={16} />Salvar Regras</span>}
        </button>
      </div>

      {toast && <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-gray-800 text-white text-sm px-5 py-2.5 rounded-full shadow-lg">{toast}</div>}
    </div>
  )
}

const LBL = "block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5"
const INP = "w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-red-500/40 transition touch-manipulation"
