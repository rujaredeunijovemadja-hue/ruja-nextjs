'use client'

import { useState, useEffect } from 'react'
import { Bot, Circle, Clock3, MessageCircle, Settings2, TriangleAlert } from 'lucide-react'
import WhatsappAutomacaoCard from './whatsapp-card'
import EventosFixosCard from './eventos-fixos-card'
import MissoesFixasCard from './missoes-fixas-card'

type Aba = 'visao-geral' | 'automacoes' | 'whatsapp' | 'historico'

const abas: { id: Aba; label: string }[] = [
  { id: 'visao-geral', label: 'Visão Geral' },
  { id: 'automacoes', label: 'Automações' },
  { id: 'whatsapp', label: 'WhatsApp' },
  { id: 'historico', label: 'Histórico' },
]

const rotinas = [
  ['Frequência de eventos', 'Cobra responsável quando a frequência não é concluída', 'Contínuo'],
  ['Cadastros pendentes', 'Avisa liderança sobre cadastros aguardando análise', 'Contínuo'],
  ['Missões atrasadas', 'Cobra responsáveis por atividades recorrentes', 'Contínuo'],
  ['Resumo semanal', 'Relatório de uso no grupo STAFF RUJA', 'Segunda às 20h'],
  ['Lembrete da semana', 'Lembrete para a semana no grupo STAFF RUJA', 'Sábado às 10h'],
]

function StatusWhatsApp() {
  const [connected, setConnected] = useState<boolean | null>(null)

  useEffect(() => {
    let ativo = true
    const verificar = async () => {
      try {
        const res = await fetch('/api/ruja/whatsapp/qrcode?check=state')
        const data = await res.json()
        if (ativo) setConnected(Boolean(data.connected))
      } catch { if (ativo) setConnected(false) }
    }
    verificar()
    const interval = setInterval(verificar, 4000)
    return () => { ativo = false; clearInterval(interval) }
  }, [])

  return <div className="flex items-center gap-2 text-sm text-gray-400"><span className={`h-2 w-2 rounded-full ${connected === true ? 'bg-green-400' : connected === false ? 'bg-red-400' : 'bg-gray-500'}`} />WhatsApp {connected === true ? 'conectado' : connected === false ? 'desconectado' : 'verificando...'}</div>
}

function VisaoGeral() {
  return <div className="space-y-4">
    <div className="bg-[#111] border border-white/8 rounded-xl px-4 py-3"><StatusWhatsApp /></div>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {/* TODO: sem endpoint ainda pra esse número */}<div className="bg-[#111] border border-white/8 rounded-xl p-4"><Settings2 size={17} className="text-red-400 mb-3" /><p className="text-2xl font-bold text-white">—</p><p className="text-xs text-gray-500 mt-1">Automações ativas</p></div>
      {/* TODO: sem endpoint ainda pra esse número */}<div className="bg-[#111] border border-white/8 rounded-xl p-4"><Clock3 size={17} className="text-red-400 mb-3" /><p className="text-2xl font-bold text-white">—</p><p className="text-xs text-gray-500 mt-1">Pendências</p></div>
      {/* TODO: sem endpoint ainda pra esse número */}<div className="bg-[#111] border border-white/8 rounded-xl p-4"><TriangleAlert size={17} className="text-red-400 mb-3" /><p className="text-2xl font-bold text-white">—</p><p className="text-xs text-gray-500 mt-1">Falhas hoje</p></div>
      {/* TODO: sem endpoint ainda pra esse número */}<div className="bg-[#111] border border-white/8 rounded-xl p-4"><MessageCircle size={17} className="text-red-400 mb-3" /><p className="text-2xl font-bold text-white">—</p><p className="text-xs text-gray-500 mt-1">Envios semana</p></div>
    </div>
  </div>
}

function Automacoes() {
  return <div className="space-y-3">
    {rotinas.map(([nome, descricao, horario]) => <div key={nome} className="flex items-center justify-between gap-4 bg-[#111] border border-white/8 rounded-xl p-4"><div><p className="text-white text-sm font-semibold">{nome}</p><p className="text-gray-500 text-xs mt-1">{descricao}</p></div><span className="shrink-0 text-xs text-red-300 bg-red-500/10 rounded-full px-2.5 py-1">{horario}</span></div>)}
    <div className="pt-3 space-y-4"><EventosFixosCard /><MissoesFixasCard /></div>
  </div>
}

export default function RujaAutomacao() {
  const [aba, setAba] = useState<Aba>('visao-geral')
  return <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-5">
    <div><h1 className="flex items-center gap-2 text-xl font-bold text-white"><Bot size={20} className="text-red-400" />Automação (Paulo)</h1><p className="text-gray-500 text-xs mt-1">Conexão do WhatsApp, eventos e missões recorrentes. O Paulo cobra evento sem frequência, cadastro pendente e missão atrasada no grupo STAFF RUJA.</p></div>
    <div className="border-b border-white/8 overflow-x-auto"><div className="flex min-w-max gap-1">{abas.map(item => <button key={item.id} onClick={() => setAba(item.id)} className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${aba === item.id ? 'text-red-400 border-red-400' : 'text-gray-500 border-transparent hover:text-gray-300'}`}>{item.label}</button>)}</div></div>
    {aba === 'visao-geral' && <VisaoGeral />}
    {aba === 'automacoes' && <Automacoes />}
    {aba === 'whatsapp' && <WhatsappAutomacaoCard />}
    {aba === 'historico' && <div className="bg-[#111] border border-white/8 rounded-xl p-10 text-center"><Circle size={24} className="mx-auto text-gray-600 mb-3" /><p className="text-white font-medium">Histórico de execuções chegando em breve</p><p className="text-gray-500 text-sm mt-1">Ainda não há um backend de histórico disponível.</p></div>}
  </div>
}
