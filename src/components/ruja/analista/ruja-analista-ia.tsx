'use client'
// ─── ANALISTA IA DO RUJA ──────────────────────────────────────
// Layout: flex-col direto, funciona dentro de overflow-hidden no pai.
// Contexto: comprimido para caber dentro do limite do Groq (~4k tokens).

import { useState, useRef, useEffect, useMemo } from 'react'
import { useRuja } from '@/lib/ruja/context'
import { Spinner } from '@/components/ui/spinner'
import { getFreqPct, getFaltasSeguidas, calcularStatus, getDiasParaAniversario } from '@/lib/ruja/calculos'

const SUGESTOES = [
  { icon: '📊', texto: 'Como está a frequência geral da juventude?' },
  { icon: '🚨', texto: 'Quem está em risco e precisa de atenção urgente?' },
  { icon: '📈', texto: 'Analise o crescimento do grupo nos últimos meses.' },
  { icon: '🏛️', texto: 'Como estão os departamentos? Qual tem mais jovens ativos?' },
  { icon: '🎯', texto: 'Estamos perto de bater as metas deste mês?' },
  { icon: '🚑', texto: 'Qual é a situação atual da recuperação?' },
  { icon: '🎂', texto: 'Quem faz aniversário nos próximos 7 dias?' },
  { icon: '📝', texto: 'Gere um resumo semanal completo da juventude.' },
]

interface Mensagem {
  role: 'user' | 'assistant'
  content: string
}

// ── Contexto comprimido — cabe em ~3k tokens ──────────────────
function montarContexto(state: ReturnType<typeof useRuja>): string {
  const { jovens, frequencias, departamentos, lideres, recuperacoes,
          historicoMensal, regras, metas } = state

  const totalJovens = jovens.length
  const ativos      = jovens.filter(j => calcularStatus(j.id, frequencias, regras) === 'Ativo').length
  const oscilando   = jovens.filter(j => calcularStatus(j.id, frequencias, regras) === 'Oscilando').length
  const emRisco     = jovens.filter(j => calcularStatus(j.id, frequencias, regras) === 'Em Risco').length
  const ociosos     = jovens.filter(j => calcularStatus(j.id, frequencias, regras) === 'Ocioso').length
  const batizados   = jovens.filter(j => j.batizado === 'sim').length

  // Jovens em risco (máx 10 — mais relevantes para alerta)
  const jovensEmRisco = jovens
    .filter(j => calcularStatus(j.id, frequencias, regras) === 'Em Risco')
    .map(j => `${j.nome}(${getFaltasSeguidas(j.id, frequencias)}f seguidas,${j.departamento || 'sem depto'})`)
    .slice(0, 10)
    .join('; ')

  // Aniversariantes próximos 7 dias
  const aniversariantes = jovens
    .filter(j => getDiasParaAniversario(j.data_nasc) <= 7)
    .map(j => `${j.nome}(${getDiasParaAniversario(j.data_nasc) === 0 ? 'hoje' : getDiasParaAniversario(j.data_nasc) + 'd'})`)
    .join('; ')

  // Frequência por departamento
  const deptosResumo = departamentos.map(d => {
    const membros = jovens.filter(j => j.departamento?.includes(d.nome))
    const atv = membros.filter(j => calcularStatus(j.id, frequencias, regras) === 'Ativo').length
    const osc = membros.filter(j => calcularStatus(j.id, frequencias, regras) === 'Oscilando').length
    const rsk = membros.filter(j => calcularStatus(j.id, frequencias, regras) === 'Em Risco').length
    return `${d.nome}:${membros.length}total,${atv}ativos,${osc}oscilando,${rsk}risco`
  }).join(' | ')

  // Recuperação ativa
  const recuperacaoAtiva = recuperacoes
    .filter(r => r.status === 'ativo')
    .map(r => {
      const nome = jovens.find(j => j.id === r.jovem_id)?.nome ?? '?'
      return `${nome}(${r.motivo},líder:${r.lider_resp})`
    }).join('; ')

  // Histórico mensal comprimido
  const historico = historicoMensal
    .slice(-6)
    .map(h => `${h.mes}:${h.total}t,${h.ativos_depto}a,${h.batizados_depto}b`)
    .join(' | ')

  // Top jovens por frequência (10 melhores e 10 piores)
  const jovensComFreq = jovens
    .map(j => ({ nome: j.nome, pct: getFreqPct(j.id, frequencias), depto: j.departamento || '-' }))
    .filter(j => getFreqPct(jovens.find(x => x.nome === j.nome)?.id ?? '', frequencias) > 0)
    .sort((a, b) => b.pct - a.pct)

  const top10 = jovensComFreq.slice(0, 10).map(j => `${j.nome}(${j.pct}%,${j.depto})`).join('; ')
  const bot10 = jovensComFreq.slice(-10).map(j => `${j.nome}(${j.pct}%,${j.depto})`).join('; ')

  return `Você é o Analista IA do RUJA (Rede UniJovem ADJA). Analisa dados reais. NUNCA invente números. Apenas leitura — nunca altere dados. Responda em português, de forma pastoral e objetiva.

DATA: ${new Date().toLocaleDateString('pt-BR')}
REGRAS STATUS: Ativo≥${regras.ativo}% | Oscilando≥${regras.oscilando}% | Em Risco:${regras.risco}+ faltas seguidas

VISÃO GERAL:
Total:${totalJovens} | Ativos:${ativos} | Oscilando:${oscilando} | EmRisco:${emRisco} | Ociosos:${ociosos} | Batizados:${batizados}
Frequências registradas:${frequencias.length} | Recuperação ativa:${recuperacoes.filter(r => r.status === 'ativo').length}
METAS: Ativos depto:${ativos}/${metas.ativosDepto} | Batizados:${batizados}/${metas.batizadosDepto}

DEPARTAMENTOS: ${deptosResumo || 'Nenhum'}
LÍDERES(${lideres.length}): ${lideres.map(l => `${l.nome}(${l.funcao},${l.departamento})`).join('; ') || 'Nenhum'}

EM RISCO: ${jovensEmRisco || 'Nenhum'}
RECUPERAÇÃO ATIVA: ${recuperacaoAtiva || 'Nenhum'}
ANIVERSARIANTES 7 DIAS: ${aniversariantes || 'Nenhum'}

MELHORES FREQUÊNCIAS: ${top10 || 'Sem dados'}
PIORES FREQUÊNCIAS: ${bot10 || 'Sem dados'}

HISTÓRICO MENSAL (últ.6): ${historico || 'Sem dados'}`
}

export default function RujaAnalistaIA() {
  const rujaState = useRuja()
  const { loading } = rujaState

  const [mensagens, setMensagens] = useState<Mensagem[]>([])
  const [input,     setInput]     = useState('')
  const [pensando,  setPensando]  = useState(false)
  const [erro,      setErro]      = useState('')
  const bottomRef   = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensagens, pensando])

  const contexto = useMemo(() => montarContexto(rujaState), [rujaState])

  async function enviar(texto?: string) {
    const pergunta = (texto ?? input).trim()
    if (!pergunta || pensando) return
    setInput('')
    setErro('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'

    const novasMsgs: Mensagem[] = [...mensagens, { role: 'user', content: pergunta }]
    setMensagens(novasMsgs)
    setPensando(true)

    try {
      const response = await fetch('/api/ruja/analista', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ mensagens: novasMsgs, contexto }),
      })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const data = await response.json()
      const resposta = data.content?.[0]?.text ?? 'Sem resposta da IA.'
      setMensagens(prev => [...prev, { role: 'assistant', content: resposta }])
    } catch {
      setErro('Erro ao conectar com a IA. Tente novamente.')
    } finally {
      setPensando(false)
    }
  }

  function handleTextareaChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
  }

  if (loading) return <div className="flex-1 flex items-center justify-center"><Spinner /></div>

  // O pai (ruja-layout) usa overflow-hidden quando page === 'analista-ia',
  // então este componente recebe altura real via flex-1.
  return (
    <div className="flex flex-col h-full bg-[#0A0A0A]">

      {/* ── HEADER ──────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 md:px-6 pt-4 pb-3 border-b border-white/8 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-red-500/15 rounded-xl flex items-center justify-center text-lg shrink-0">🦁</div>
          <div>
            <h1 className="text-white font-bold text-base leading-tight">Analista IA</h1>
            <p className="text-gray-500 text-xs">Dados reais · Apenas leitura</p>
          </div>
        </div>
        {mensagens.length > 0 && (
          <button
            onClick={() => { setMensagens([]); setErro('') }}
            className="text-xs text-gray-600 hover:text-gray-400 transition px-3 py-1.5 rounded-lg hover:bg-white/5 touch-manipulation"
          >
            Nova conversa
          </button>
        )}
      </div>

      {/* ── MENSAGENS ───────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4 space-y-4 min-h-0">

        {mensagens.length === 0 && !pensando && (
          <div className="space-y-4">
            <div className="text-center pt-6 pb-2">
              <div className="text-4xl mb-3">🦁</div>
              <h2 className="text-white font-semibold text-base">Olá! Sou o Analista da Juventude.</h2>
              <p className="text-gray-500 text-sm mt-1 max-w-xs mx-auto">
                Analiso dados reais da sua juventude. Pergunte qualquer coisa.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {SUGESTOES.map(s => (
                <button key={s.texto} onClick={() => enviar(s.texto)}
                  className="flex items-center gap-3 p-3.5 bg-[#111] hover:bg-white/5 border border-white/8 hover:border-white/15 rounded-xl text-left transition touch-manipulation group">
                  <span className="text-lg shrink-0">{s.icon}</span>
                  <span className="text-gray-400 group-hover:text-gray-200 text-sm leading-snug transition">{s.texto}</span>
                </button>
              ))}
            </div>

            <div className="bg-blue-500/8 border border-blue-500/20 rounded-xl px-4 py-3 flex items-start gap-3">
              <span className="text-blue-400 shrink-0">ℹ️</span>
              <p className="text-blue-300/80 text-xs leading-relaxed">
                A IA atua <strong>apenas como analista</strong>. Não altera dados, não registra presenças e não modifica cadastros. Dados em tempo real do banco.
              </p>
            </div>
          </div>
        )}

        {mensagens.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className="w-7 h-7 bg-red-500/15 rounded-lg flex items-center justify-center text-sm shrink-0 mt-0.5 mr-2">🦁</div>
            )}
            <div className={`max-w-[85%] md:max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed
              ${msg.role === 'user'
                ? 'bg-red-600 text-white rounded-br-sm'
                : 'bg-[#1a1a1a] border border-white/8 text-gray-200 rounded-bl-sm'}`}>
              {msg.role === 'assistant' ? <MensagemFormatada texto={msg.content} /> : msg.content}
            </div>
          </div>
        ))}

        {pensando && (
          <div className="flex items-start gap-2">
            <div className="w-7 h-7 bg-red-500/15 rounded-lg flex items-center justify-center text-sm shrink-0 mt-0.5">🦁</div>
            <div className="bg-[#1a1a1a] border border-white/8 rounded-2xl rounded-bl-sm px-4 py-3">
              <div className="flex gap-1.5 items-center">
                {[0,1,2].map(i => (
                  <div key={i} className="w-1.5 h-1.5 bg-red-500 rounded-full animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
                <span className="text-gray-600 text-xs ml-1">Analisando dados...</span>
              </div>
            </div>
          </div>
        )}

        {erro && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-sm">{erro}</div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── INPUT ───────────────────────────────────────────── */}
      <div className="px-4 md:px-6 pb-4 md:pb-6 pt-3 border-t border-white/8 shrink-0">
        <div className="flex gap-2 items-end">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleTextareaChange}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar() } }}
            placeholder="Pergunte sobre frequência, jovens, metas, alertas..."
            rows={1}
            className="flex-1 bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-red-500/40 transition resize-none touch-manipulation"
            style={{ maxHeight: '120px' }}
          />
          <button onClick={() => enviar()} disabled={!input.trim() || pensando}
            className="w-11 h-11 bg-red-600 hover:bg-red-700 disabled:opacity-40 rounded-xl flex items-center justify-center shrink-0 transition touch-manipulation">
            {pensando ? <Spinner size="sm" /> : <span className="text-white font-bold text-base">↑</span>}
          </button>
        </div>
        <p className="text-gray-700 text-xs text-center mt-2">Enter para enviar · Shift+Enter para nova linha</p>
      </div>
    </div>
  )
}

function MensagemFormatada({ texto }: { texto: string }) {
  return (
    <div className="space-y-1">
      {texto.split('\n').map((linha, i) => {
        if (linha.startsWith('## ')) return <p key={i} className="font-bold text-white text-base mt-2 mb-1">{linha.slice(3)}</p>
        if (linha.startsWith('# '))  return <p key={i} className="font-bold text-red-400 text-lg mt-2">{linha.slice(2)}</p>
        if (linha.startsWith('- ') || linha.startsWith('• ')) return <p key={i} className="text-gray-300 pl-2">· {linha.slice(2)}</p>
        if (linha.trim() === '') return <div key={i} className="h-1" />
        return <p key={i} className="text-gray-200">{linha}</p>
      })}
    </div>
  )
}
