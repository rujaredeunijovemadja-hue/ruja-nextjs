'use client'

import { useState, useEffect, useCallback } from 'react'
import { CalendarDays, X } from 'lucide-react'
import { fetchDepartamentos, fetchLideres } from '@/lib/ruja/queries'
import { createClient } from '@/lib/supabase/client'
import { fetchEventosFixos, criarEventoFixo, alternarEventoFixo, excluirEventoFixo, type EventoFixo, type Recorrencia } from '@/lib/ruja/fixos'
import Card from './card'

const DIAS_SEMANA = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

export default function EventosFixosCard() {
  const [lista, setLista] = useState<EventoFixo[]>([])
  const [departamentos, setDepartamentos] = useState<{ id: string; nome: string }[]>([])
  const [lideres, setLideres] = useState<{ id: string; nome: string }[]>([])
  const [plataformas, setPlataformas] = useState<{ id: string; nome: string }[]>([])
  const [aberto, setAberto] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [form, setForm] = useState({
    nome: '', tipo: 'Reunião', recorrencia: 'semanal' as Recorrencia, dia_semana: 6, dia_mes: 1,
    hora_inicio: '10:00', hora_termino: '', local: '', departamento_id: '',
    lider_responsavel_id: '', plataforma_id: '', cobrar_frequencia: true,
  })

  const carregar = useCallback(async () => {
    try {
      setLista(await fetchEventosFixos())
      setDepartamentos(await fetchDepartamentos())
      setLideres(await fetchLideres())
      const sb = createClient()
      const { data } = await sb.from('ruja_plataformas').select('id, nome').order('nome')
      setPlataformas((data ?? []) as { id: string; nome: string }[])
    } catch (e) { setErro(e instanceof Error ? e.message : 'Erro ao carregar.') }
  }, [])
  useEffect(() => { carregar() }, [carregar])

  async function handleCriar() {
    if (!form.nome.trim() || !form.hora_inicio) { setErro('Preencha nome e horário.'); return }
    setSalvando(true); setErro('')
    try {
      await criarEventoFixo({
        nome: form.nome, tipo: form.tipo, recorrencia: form.recorrencia,
        dia_semana: form.recorrencia === 'semanal' ? form.dia_semana : null,
        dia_mes: form.recorrencia === 'mensal' ? form.dia_mes : null,
        hora_inicio: form.hora_inicio, hora_termino: form.hora_termino || null,
        local: form.local || null, descricao: null,
        departamento_id: form.departamento_id || null,
        departamentos_envolvidos: form.departamento_id ? [] : ['Todos'],
        lider_responsavel_id: form.lider_responsavel_id || null,
        plataforma_id: form.plataforma_id || null,
        cobrar_frequencia: form.cobrar_frequencia,
      })
      setForm({ ...form, nome: '', local: '' }); setAberto(false); await carregar()
    } catch (e) { setErro(e instanceof Error ? e.message : 'Erro ao criar.') }
    finally { setSalvando(false) }
  }

  return <Card icon={CalendarDays} title="Eventos Fixos" subtitle="Se repetem sozinhos toda semana ou todo mês -- o Paulo cria a ocorrência no dia certo, o líder só lança a frequência.">
    <div className="space-y-2 mb-3">
      {lista.length === 0 && <p className="text-gray-600 text-sm">Nenhum evento fixo cadastrado.</p>}
      {lista.map(ev => <div key={ev.id} className="flex items-center justify-between bg-black/30 rounded-lg px-3 py-2">
        <div>
          <p className="text-white text-sm font-medium">{ev.nome}</p>
          <p className="text-gray-500 text-xs">
            {ev.recorrencia === 'semanal' ? DIAS_SEMANA[ev.dia_semana ?? 0] : `Dia ${ev.dia_mes} do mês`} às {ev.hora_inicio.slice(0, 5)}
            {ev.local ? ` · ${ev.local}` : ''}
            {!ev.cobrar_frequencia ? ' · sem cobrança de frequência' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => alternarEventoFixo(ev.id, !ev.ativo).then(carregar)} className={`px-2 py-1 rounded-full text-xs font-semibold ${ev.ativo ? 'bg-green-500/15 text-green-400' : 'bg-white/5 text-gray-500'}`}>{ev.ativo ? 'Ativo' : 'Pausado'}</button>
          <button onClick={() => excluirEventoFixo(ev.id).then(carregar)} className="text-gray-600 hover:text-red-400 text-xs"><X size={14} /></button>
        </div>
      </div>)}
    </div>
    {erro && <p className="text-red-400 text-sm mb-2">{erro}</p>}
    {!aberto ? <button onClick={() => setAberto(true)} className="w-full py-2.5 bg-white/5 hover:bg-white/10 text-gray-300 text-sm rounded-xl">+ Novo evento fixo</button> : <div className="space-y-2 bg-black/30 rounded-lg p-3">
      <input placeholder="Nome do evento" value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-sm" />
      <div className="flex gap-2"><select value={form.recorrencia} onChange={e => setForm({ ...form, recorrencia: e.target.value as Recorrencia })} className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"><option value="semanal">Toda semana</option><option value="mensal">1x por mês</option></select>{form.recorrencia === 'semanal' ? <select value={form.dia_semana} onChange={e => setForm({ ...form, dia_semana: Number(e.target.value) })} className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-sm">{DIAS_SEMANA.map((d, i) => <option key={i} value={i}>{d}</option>)}</select> : <input type="number" min={1} max={31} value={form.dia_mes} onChange={e => setForm({ ...form, dia_mes: Number(e.target.value) })} placeholder="Dia do mês" className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-sm" />}</div>
      <div className="flex gap-2"><input type="time" value={form.hora_inicio} onChange={e => setForm({ ...form, hora_inicio: e.target.value })} className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-sm" /><input type="time" value={form.hora_termino} onChange={e => setForm({ ...form, hora_termino: e.target.value })} placeholder="Término (opcional)" className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-sm" /></div>
      <input placeholder="Local (opcional)" value={form.local} onChange={e => setForm({ ...form, local: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-sm" />
      <select value={form.departamento_id} onChange={e => setForm({ ...form, departamento_id: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"><option value="">Todos os departamentos</option>{departamentos.map(d => <option key={d.id} value={d.id}>{d.nome}</option>)}</select>
      <div className="flex gap-2">
        <select value={form.plataforma_id} onChange={e => setForm({ ...form, plataforma_id: e.target.value })} className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"><option value="">Plataforma (opcional)</option>{plataformas.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}</select>
        <select value={form.lider_responsavel_id} onChange={e => setForm({ ...form, lider_responsavel_id: e.target.value })} className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"><option value="">Responsável (opcional)</option>{lideres.map(l => <option key={l.id} value={l.id}>{l.nome}</option>)}</select>
      </div>
      <label className="flex items-center gap-2 text-gray-300 text-sm px-1">
        <input type="checkbox" checked={form.cobrar_frequencia} onChange={e => setForm({ ...form, cobrar_frequencia: e.target.checked })} className="accent-red-600" />
        Cobrar frequência quando não for lançada
      </label>
      <div className="flex gap-2 pt-1"><button onClick={() => setAberto(false)} className="flex-1 py-2 bg-white/5 text-gray-400 text-sm rounded-lg">Cancelar</button><button onClick={handleCriar} disabled={salvando} className="flex-1 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg">{salvando ? 'Salvando...' : 'Criar'}</button></div>
    </div>}
  </Card>
}
