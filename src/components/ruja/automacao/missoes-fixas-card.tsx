'use client'

import { useState, useEffect, useCallback } from 'react'
import { Target, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { fetchMissoesFixas, criarMissaoFixa, alternarMissaoFixa, excluirMissaoFixa, type MissaoFixa, type Recorrencia } from '@/lib/ruja/fixos'
import Card from './card'

const DIAS_SEMANA = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

export default function MissoesFixasCard() {
  const [lista, setLista] = useState<MissaoFixa[]>([])
  const [plataformas, setPlataformas] = useState<{ id: string; nome: string }[]>([])
  const [aberto, setAberto] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [form, setForm] = useState({ titulo: '', descricao: '', alvo_tipo: 'lider' as 'jovem' | 'lider' | 'usuario', alvo_nome: '', plataforma_id: '', prioridade: 'normal' as MissaoFixa['prioridade'], recorrencia: 'semanal' as Recorrencia, dia_semana: 6, dia_mes: 1, prazo_dias: 2, cobrar_atraso: true })

  const carregar = useCallback(async () => {
    try {
      setLista(await fetchMissoesFixas())
      const sb = createClient()
      const { data } = await sb.from('ruja_plataformas').select('id, nome').order('nome')
      setPlataformas((data ?? []) as { id: string; nome: string }[])
      if (data?.[0] && !form.plataforma_id) setForm(f => ({ ...f, plataforma_id: data[0].id }))
    } catch (e) { setErro(e instanceof Error ? e.message : 'Erro ao carregar.') }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(() => { carregar() }, [carregar])

  async function handleCriar() {
    if (!form.titulo.trim() || !form.alvo_nome.trim() || !form.plataforma_id) { setErro('Preencha título, alvo e plataforma.'); return }
    setSalvando(true); setErro('')
    try {
      await criarMissaoFixa({ plataforma_id: form.plataforma_id, departamento_id: null, titulo: form.titulo, descricao: form.descricao, alvo_tipo: form.alvo_tipo, alvo_id: null, alvo_nome: form.alvo_nome, alvo_usuario_id: null, prioridade: form.prioridade, recorrencia: form.recorrencia, dia_semana: form.recorrencia === 'semanal' ? form.dia_semana : null, dia_mes: form.recorrencia === 'mensal' ? form.dia_mes : null, prazo_dias: form.prazo_dias, cobrar_atraso: form.cobrar_atraso })
      setForm({ ...form, titulo: '', descricao: '', alvo_nome: '' }); setAberto(false); await carregar()
    } catch (e) { setErro(e instanceof Error ? e.message : 'Erro ao criar.') }
    finally { setSalvando(false) }
  }

  return <Card icon={Target} title="Missões Fixas" subtitle="Atribuídas a um líder ou jovem específico, se repetem toda semana ou todo mês. A pessoa registra o cumprimento no app; o relatório de segunda cobra quem atrasar.">
    <div className="space-y-2 mb-3">
      {lista.length === 0 && <p className="text-gray-600 text-sm">Nenhuma missão fixa cadastrada.</p>}
      {lista.map(m => <div key={m.id} className="flex items-center justify-between bg-black/30 rounded-lg px-3 py-2"><div><p className="text-white text-sm font-medium">{m.titulo}</p><p className="text-gray-500 text-xs">{m.alvo_nome} ({m.alvo_tipo}) · {m.recorrencia === 'semanal' ? DIAS_SEMANA[m.dia_semana ?? 0] : `dia ${m.dia_mes}`} · prazo +{m.prazo_dias}d{!m.cobrar_atraso ? ' · sem cobrança de atraso' : ''}</p></div><div className="flex items-center gap-2"><button onClick={() => alternarMissaoFixa(m.id, !m.ativo).then(carregar)} className={`px-2 py-1 rounded-full text-xs font-semibold ${m.ativo ? 'bg-green-500/15 text-green-400' : 'bg-white/5 text-gray-500'}`}>{m.ativo ? 'Ativo' : 'Pausado'}</button><button onClick={() => excluirMissaoFixa(m.id).then(carregar)} className="text-gray-600 hover:text-red-400 text-xs"><X size={14} /></button></div></div>)}
    </div>
    {erro && <p className="text-red-400 text-sm mb-2">{erro}</p>}
    {!aberto ? <button onClick={() => setAberto(true)} className="w-full py-2.5 bg-white/5 hover:bg-white/10 text-gray-300 text-sm rounded-xl">+ Nova missão fixa</button> : <div className="space-y-2 bg-black/30 rounded-lg p-3">
      <input placeholder="Título da missão" value={form.titulo} onChange={e => setForm({ ...form, titulo: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-sm" /><textarea placeholder="Descrição (opcional)" value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-sm" rows={2} />
      <div className="flex gap-2"><select value={form.alvo_tipo} onChange={e => setForm({ ...form, alvo_tipo: e.target.value as typeof form.alvo_tipo })} className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"><option value="lider">Líder</option><option value="jovem">Jovem</option><option value="usuario">Usuário</option></select><input placeholder="Nome do alvo" value={form.alvo_nome} onChange={e => setForm({ ...form, alvo_nome: e.target.value })} className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-sm" /></div>
      <div className="flex gap-2"><select value={form.plataforma_id} onChange={e => setForm({ ...form, plataforma_id: e.target.value })} className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-sm">{plataformas.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}</select><select value={form.prioridade} onChange={e => setForm({ ...form, prioridade: e.target.value as MissaoFixa['prioridade'] })} className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"><option value="baixa">Baixa</option><option value="normal">Normal</option><option value="alta">Alta</option><option value="urgente">Urgente</option></select></div>
      <div className="flex gap-2"><select value={form.recorrencia} onChange={e => setForm({ ...form, recorrencia: e.target.value as Recorrencia })} className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"><option value="semanal">Toda semana</option><option value="mensal">1x por mês</option></select>{form.recorrencia === 'semanal' ? <select value={form.dia_semana} onChange={e => setForm({ ...form, dia_semana: Number(e.target.value) })} className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-sm">{DIAS_SEMANA.map((d, i) => <option key={i} value={i}>{d}</option>)}</select> : <input type="number" min={1} max={31} value={form.dia_mes} onChange={e => setForm({ ...form, dia_mes: Number(e.target.value) })} className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-sm" />}<input type="number" min={0} value={form.prazo_dias} onChange={e => setForm({ ...form, prazo_dias: Number(e.target.value) })} placeholder="Prazo (dias)" className="w-24 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-sm" /></div>
      <label className="flex items-center gap-2 text-gray-300 text-sm px-1">
        <input type="checkbox" checked={form.cobrar_atraso} onChange={e => setForm({ ...form, cobrar_atraso: e.target.checked })} className="accent-red-600" />
        Cobrar no relatório semanal quando atrasar
      </label>
      <div className="flex gap-2 pt-1"><button onClick={() => setAberto(false)} className="flex-1 py-2 bg-white/5 text-gray-400 text-sm rounded-lg">Cancelar</button><button onClick={handleCriar} disabled={salvando} className="flex-1 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg">{salvando ? 'Salvando...' : 'Criar'}</button></div>
    </div>}
  </Card>
}
