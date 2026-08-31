'use client'
// ─── PAULO CONTROL CENTER ──────────────────────────────────────
// Aba dedicada a tudo que é responsável pela automação da RUJA (o "Paulo"):
// conexão do WhatsApp, eventos fixos e missões fixas (templates recorrentes
// que o worker do servidor gera sozinho toda semana/mês). Layout inspirado
// no "Jarvis Control Center" do Agora Cortex -- uma página só pra isso,
// restrita a lider_supremo/administrador (ver allowedPages em ruja-layout.tsx).
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { fetchDepartamentos } from '@/lib/ruja/queries'
import {
  fetchEventosFixos, criarEventoFixo, alternarEventoFixo, excluirEventoFixo,
  fetchMissoesFixas, criarMissaoFixa, alternarMissaoFixa, excluirMissaoFixa,
  type EventoFixo, type MissaoFixa, type Recorrencia,
} from '@/lib/ruja/fixos'
import { Bot, MessageCircle, CalendarDays, Target, CheckCircle2, RefreshCw, X, type LucideIcon } from 'lucide-react'

const DIAS_SEMANA = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

function Card({ icon: Icon, title, subtitle, children }: { icon: LucideIcon; title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#111] border border-white/8 rounded-xl p-5">
      <h2 className="flex items-center gap-2 text-white font-semibold mb-1"><Icon size={17} className="text-red-400" />{title}</h2>
      {subtitle && <p className="text-gray-500 text-xs mb-3">{subtitle}</p>}
      {children}
    </div>
  )
}

// ─── Card: WhatsApp da automação (movido de Configurações) ──────────────
function WhatsappAutomacaoCard() {
  const [qr, setQr] = useState<string | null>(null)
  const [connected, setConnected] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')

  const buscarQr = useCallback(async () => {
    setLoading(true)
    setErro('')
    try {
      const res = await fetch('/api/ruja/whatsapp/qrcode')
      const data = await res.json()
      if (!res.ok || data.ok === false) {
        const detalhe = [data.causeCode, data.causeMessage].filter(Boolean).join(': ')
        setErro((data.error ?? 'Erro ao gerar QR code.') + (detalhe ? ` (${detalhe})` : ''))
        setQr(null)
        return
      }
      setConnected(Boolean(data.connected))
      setQr(data.connected ? null : (data.base64 ?? null))
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao conectar.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (connected) return
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/ruja/whatsapp/qrcode?check=state')
        const data = await res.json()
        if (data.connected) {
          setConnected(true)
          setQr(null)
        }
      } catch {
        // silencioso -- próximo poll tenta de novo
      }
    }, 4000)
    return () => clearInterval(interval)
  }, [connected])

  return (
    <Card icon={MessageCircle} title="WhatsApp da Automação" subtitle="Número oficial da RUJA usado pro grupo de líderes e o SOS de acolhimento.">
      {connected === true && (
        <div className="flex items-center gap-2 text-green-400 text-sm py-3">
          <CheckCircle2 size={16} /> Conectado
        </div>
      )}

      {connected !== true && qr && (
        <div className="flex flex-col items-center gap-3 py-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} alt="QR Code do WhatsApp" className="w-56 h-56 rounded-lg bg-white p-2" />
          <p className="text-gray-500 text-xs text-center">
            Escaneie em WhatsApp → Aparelhos conectados → Conectar um aparelho.
            <br />O código expira rápido -- gere outro se der tempo.
          </p>
        </div>
      )}

      {erro && <p className="text-red-400 text-sm mb-2">{erro}</p>}

      <button
        onClick={buscarQr}
        disabled={loading}
        className="w-full py-3 bg-white/10 hover:bg-white/15 disabled:opacity-50 text-white font-bold rounded-xl touch-manipulation"
      >
        {loading ? 'Gerando...' : connected ? (<span className="flex items-center justify-center gap-2"><RefreshCw size={16}/>Verificar conexão</span>) : 'Gerar QR Code'}
      </button>
    </Card>
  )
}

// ─── Card: Eventos fixos ─────────────────────────────────────────────
function EventosFixosCard() {
  const [lista, setLista] = useState<EventoFixo[]>([])
  const [departamentos, setDepartamentos] = useState<{ id: string; nome: string }[]>([])
  const [aberto, setAberto] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [form, setForm] = useState({
    nome: '', tipo: 'Reunião', recorrencia: 'semanal' as Recorrencia,
    dia_semana: 6, dia_mes: 1, hora_inicio: '10:00', hora_termino: '',
    local: '', departamento_id: '',
  })

  const carregar = useCallback(async () => {
    try {
      setLista(await fetchEventosFixos())
      setDepartamentos(await fetchDepartamentos())
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao carregar.')
    }
  }, [])

  useEffect(() => { carregar() }, [carregar])

  async function handleCriar() {
    if (!form.nome.trim() || !form.hora_inicio) { setErro('Preencha nome e horário.'); return }
    setSalvando(true)
    setErro('')
    try {
      await criarEventoFixo({
        nome: form.nome, tipo: form.tipo, recorrencia: form.recorrencia,
        dia_semana: form.recorrencia === 'semanal' ? form.dia_semana : null,
        dia_mes: form.recorrencia === 'mensal' ? form.dia_mes : null,
        hora_inicio: form.hora_inicio, hora_termino: form.hora_termino || null,
        local: form.local || null, descricao: null,
        departamento_id: form.departamento_id || null,
        departamentos_envolvidos: form.departamento_id ? [] : ['Todos'],
        lider_responsavel_id: null,
      })
      setForm({ ...form, nome: '', local: '' })
      setAberto(false)
      await carregar()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao criar.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Card icon={CalendarDays} title="Eventos Fixos" subtitle="Se repetem sozinhos toda semana ou todo mês -- o Paulo cria a ocorrência no dia certo, o líder só lança a frequência.">
      <div className="space-y-2 mb-3">
        {lista.length === 0 && <p className="text-gray-600 text-sm">Nenhum evento fixo cadastrado.</p>}
        {lista.map(ev => (
          <div key={ev.id} className="flex items-center justify-between bg-black/30 rounded-lg px-3 py-2">
            <div>
              <p className="text-white text-sm font-medium">{ev.nome}</p>
              <p className="text-gray-500 text-xs">
                {ev.recorrencia === 'semanal' ? DIAS_SEMANA[ev.dia_semana ?? 0] : `Dia ${ev.dia_mes} do mês`} às {ev.hora_inicio.slice(0, 5)}
                {ev.local ? ` · ${ev.local}` : ''}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => alternarEventoFixo(ev.id, !ev.ativo).then(carregar)}
                className={`px-2 py-1 rounded-full text-xs font-semibold ${ev.ativo ? 'bg-green-500/15 text-green-400' : 'bg-white/5 text-gray-500'}`}>
                {ev.ativo ? 'Ativo' : 'Pausado'}
              </button>
              <button onClick={() => excluirEventoFixo(ev.id).then(carregar)} className="text-gray-600 hover:text-red-400 text-xs"><X size={14} /></button>
            </div>
          </div>
        ))}
      </div>

      {erro && <p className="text-red-400 text-sm mb-2">{erro}</p>}

      {!aberto ? (
        <button onClick={() => setAberto(true)} className="w-full py-2.5 bg-white/5 hover:bg-white/10 text-gray-300 text-sm rounded-xl">+ Novo evento fixo</button>
      ) : (
        <div className="space-y-2 bg-black/30 rounded-lg p-3">
          <input placeholder="Nome do evento" value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })}
            className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-sm" />
          <div className="flex gap-2">
            <select value={form.recorrencia} onChange={e => setForm({ ...form, recorrencia: e.target.value as Recorrencia })}
              className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-sm">
              <option value="semanal">Toda semana</option>
              <option value="mensal">1x por mês</option>
            </select>
            {form.recorrencia === 'semanal' ? (
              <select value={form.dia_semana} onChange={e => setForm({ ...form, dia_semana: Number(e.target.value) })}
                className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-sm">
                {DIAS_SEMANA.map((d, i) => <option key={i} value={i}>{d}</option>)}
              </select>
            ) : (
              <input type="number" min={1} max={31} value={form.dia_mes} onChange={e => setForm({ ...form, dia_mes: Number(e.target.value) })}
                placeholder="Dia do mês" className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-sm" />
            )}
          </div>
          <div className="flex gap-2">
            <input type="time" value={form.hora_inicio} onChange={e => setForm({ ...form, hora_inicio: e.target.value })}
              className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-sm" />
            <input type="time" value={form.hora_termino} onChange={e => setForm({ ...form, hora_termino: e.target.value })}
              placeholder="Término (opcional)" className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-sm" />
          </div>
          <input placeholder="Local (opcional)" value={form.local} onChange={e => setForm({ ...form, local: e.target.value })}
            className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-sm" />
          <select value={form.departamento_id} onChange={e => setForm({ ...form, departamento_id: e.target.value })}
            className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-sm">
            <option value="">Todos os departamentos</option>
            {departamentos.map(d => <option key={d.id} value={d.id}>{d.nome}</option>)}
          </select>
          <div className="flex gap-2 pt-1">
            <button onClick={() => setAberto(false)} className="flex-1 py-2 bg-white/5 text-gray-400 text-sm rounded-lg">Cancelar</button>
            <button onClick={handleCriar} disabled={salvando} className="flex-1 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg">
              {salvando ? 'Salvando...' : 'Criar'}
            </button>
          </div>
        </div>
      )}
    </Card>
  )
}

// ─── Card: Missões fixas ─────────────────────────────────────────────
function MissoesFixasCard() {
  const [lista, setLista] = useState<MissaoFixa[]>([])
  const [plataformas, setPlataformas] = useState<{ id: string; nome: string }[]>([])
  const [aberto, setAberto] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [form, setForm] = useState({
    titulo: '', descricao: '', alvo_tipo: 'lider' as 'jovem' | 'lider' | 'usuario', alvo_nome: '',
    plataforma_id: '', prioridade: 'normal' as MissaoFixa['prioridade'],
    recorrencia: 'semanal' as Recorrencia, dia_semana: 6, dia_mes: 1, prazo_dias: 2,
  })

  const carregar = useCallback(async () => {
    try {
      setLista(await fetchMissoesFixas())
      const sb = createClient()
      const { data } = await sb.from('ruja_plataformas').select('id, nome').order('nome')
      setPlataformas((data ?? []) as { id: string; nome: string }[])
      if (data?.[0] && !form.plataforma_id) setForm(f => ({ ...f, plataforma_id: data[0].id }))
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao carregar.')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => { carregar() }, [carregar])

  async function handleCriar() {
    if (!form.titulo.trim() || !form.alvo_nome.trim() || !form.plataforma_id) { setErro('Preencha título, alvo e plataforma.'); return }
    setSalvando(true)
    setErro('')
    try {
      await criarMissaoFixa({
        plataforma_id: form.plataforma_id, departamento_id: null,
        titulo: form.titulo, descricao: form.descricao,
        alvo_tipo: form.alvo_tipo, alvo_id: null, alvo_nome: form.alvo_nome, alvo_usuario_id: null,
        prioridade: form.prioridade, recorrencia: form.recorrencia,
        dia_semana: form.recorrencia === 'semanal' ? form.dia_semana : null,
        dia_mes: form.recorrencia === 'mensal' ? form.dia_mes : null,
        prazo_dias: form.prazo_dias,
      })
      setForm({ ...form, titulo: '', descricao: '', alvo_nome: '' })
      setAberto(false)
      await carregar()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao criar.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Card icon={Target} title="Missões Fixas" subtitle="Atribuídas a um líder ou jovem específico, se repetem toda semana ou todo mês. A pessoa registra o cumprimento no app; o relatório de segunda cobra quem atrasar.">
      <div className="space-y-2 mb-3">
        {lista.length === 0 && <p className="text-gray-600 text-sm">Nenhuma missão fixa cadastrada.</p>}
        {lista.map(m => (
          <div key={m.id} className="flex items-center justify-between bg-black/30 rounded-lg px-3 py-2">
            <div>
              <p className="text-white text-sm font-medium">{m.titulo}</p>
              <p className="text-gray-500 text-xs">
                {m.alvo_nome} ({m.alvo_tipo}) · {m.recorrencia === 'semanal' ? DIAS_SEMANA[m.dia_semana ?? 0] : `dia ${m.dia_mes}`} · prazo +{m.prazo_dias}d
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => alternarMissaoFixa(m.id, !m.ativo).then(carregar)}
                className={`px-2 py-1 rounded-full text-xs font-semibold ${m.ativo ? 'bg-green-500/15 text-green-400' : 'bg-white/5 text-gray-500'}`}>
                {m.ativo ? 'Ativo' : 'Pausado'}
              </button>
              <button onClick={() => excluirMissaoFixa(m.id).then(carregar)} className="text-gray-600 hover:text-red-400 text-xs"><X size={14} /></button>
            </div>
          </div>
        ))}
      </div>

      {erro && <p className="text-red-400 text-sm mb-2">{erro}</p>}

      {!aberto ? (
        <button onClick={() => setAberto(true)} className="w-full py-2.5 bg-white/5 hover:bg-white/10 text-gray-300 text-sm rounded-xl">+ Nova missão fixa</button>
      ) : (
        <div className="space-y-2 bg-black/30 rounded-lg p-3">
          <input placeholder="Título da missão" value={form.titulo} onChange={e => setForm({ ...form, titulo: e.target.value })}
            className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-sm" />
          <textarea placeholder="Descrição (opcional)" value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })}
            className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-sm" rows={2} />
          <div className="flex gap-2">
            <select value={form.alvo_tipo} onChange={e => setForm({ ...form, alvo_tipo: e.target.value as typeof form.alvo_tipo })}
              className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-sm">
              <option value="lider">Líder</option>
              <option value="jovem">Jovem</option>
              <option value="usuario">Usuário</option>
            </select>
            <input placeholder="Nome do alvo" value={form.alvo_nome} onChange={e => setForm({ ...form, alvo_nome: e.target.value })}
              className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-sm" />
          </div>
          <div className="flex gap-2">
            <select value={form.plataforma_id} onChange={e => setForm({ ...form, plataforma_id: e.target.value })}
              className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-sm">
              {plataformas.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
            <select value={form.prioridade} onChange={e => setForm({ ...form, prioridade: e.target.value as MissaoFixa['prioridade'] })}
              className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-sm">
              <option value="baixa">Baixa</option>
              <option value="normal">Normal</option>
              <option value="alta">Alta</option>
              <option value="urgente">Urgente</option>
            </select>
          </div>
          <div className="flex gap-2">
            <select value={form.recorrencia} onChange={e => setForm({ ...form, recorrencia: e.target.value as Recorrencia })}
              className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-sm">
              <option value="semanal">Toda semana</option>
              <option value="mensal">1x por mês</option>
            </select>
            {form.recorrencia === 'semanal' ? (
              <select value={form.dia_semana} onChange={e => setForm({ ...form, dia_semana: Number(e.target.value) })}
                className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-sm">
                {DIAS_SEMANA.map((d, i) => <option key={i} value={i}>{d}</option>)}
              </select>
            ) : (
              <input type="number" min={1} max={31} value={form.dia_mes} onChange={e => setForm({ ...form, dia_mes: Number(e.target.value) })}
                className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-sm" />
            )}
            <input type="number" min={0} value={form.prazo_dias} onChange={e => setForm({ ...form, prazo_dias: Number(e.target.value) })}
              placeholder="Prazo (dias)" className="w-24 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-sm" />
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={() => setAberto(false)} className="flex-1 py-2 bg-white/5 text-gray-400 text-sm rounded-lg">Cancelar</button>
            <button onClick={handleCriar} disabled={salvando} className="flex-1 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg">
              {salvando ? 'Salvando...' : 'Criar'}
            </button>
          </div>
        </div>
      )}
    </Card>
  )
}

export default function RujaAutomacao() {
  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-5">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold text-white"><Bot size={20} className="text-red-400" />Automação (Paulo)</h1>
        <p className="text-gray-500 text-xs mt-1">
          Conexão do WhatsApp, eventos e missões recorrentes. O Paulo cobra evento sem frequência,
          cadastro pendente e missão atrasada no grupo STAFF RUJA -- toda segunda às 20h sai o
          relatório de uso, e todo sábado às 10h o lembrete pra semana.
        </p>
      </div>
      <WhatsappAutomacaoCard />
      <EventosFixosCard />
      <MissoesFixasCard />
    </div>
  )
}
