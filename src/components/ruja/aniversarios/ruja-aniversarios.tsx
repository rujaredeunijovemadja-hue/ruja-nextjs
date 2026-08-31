'use client'
import { useState, useMemo } from 'react'
import { useRuja } from '@/lib/ruja/context'
import { Spinner } from '@/components/ui/spinner'
import { Avatar } from '@/components/ui/avatar'
import { getDiasParaAniversario, getIdade, diasLabel } from '@/lib/ruja/calculos'
import { Cake, CalendarDays, Clock, Users, CheckCircle2, PartyPopper, MessageCircle, type LucideIcon } from 'lucide-react'

type Tab = 'hoje' | 'mes' | '30dias' | 'todos'

export default function RujaAniversarios() {
  const { jovens, lideres, loading } = useRuja()
  const [tab,    setTab]    = useState<Tab>('mes')
  const [selecionado, setSel] = useState<string | null>(null)
  const [msg,    setMsg]    = useState('')
  const [toast,  setToast]  = useState('')

  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(''), 3000) }

  const todos = useMemo(() => {
    const hoje = new Date()
    const mesAtual = hoje.getMonth() + 1

    return [...jovens, ...lideres]
      .filter(p => p.data_nasc)
      .map(p => ({ ...p, dias: getDiasParaAniversario(p.data_nasc), idade: getIdade(p.data_nasc) }))
      .sort((a, b) => a.dias - b.dias)
      .map(p => ({ ...p, tipo: jovens.find(j => j.id === p.id) ? 'jovem' : 'lider' as const }))
  }, [jovens, lideres])

  const filtrados = useMemo(() => {
    switch (tab) {
      case 'hoje':   return todos.filter(p => p.dias === 0)
      case 'mes':    return todos.filter(p => {
        if (!p.data_nasc) return false
        return parseInt(p.data_nasc.split('-')[1]) === new Date().getMonth() + 1
      })
      case '30dias': return todos.filter(p => p.dias <= 30)
      default:       return todos
    }
  }, [todos, tab])

  const TABS: { key: Tab; label: string; icon: LucideIcon; count: number }[] = [
    { key: 'hoje',   label: 'Hoje',       icon: Cake,        count: todos.filter(p => p.dias === 0).length },
    { key: 'mes',    label: 'Este mês',   icon: CalendarDays, count: todos.filter(p => { if (!p.data_nasc) return false; return parseInt(p.data_nasc.split('-')[1]) === new Date().getMonth()+1 }).length },
    { key: '30dias', label: '30 dias',    icon: Clock,       count: todos.filter(p => p.dias <= 30).length },
    { key: 'todos',  label: 'Todos',      icon: Users,       count: todos.length },
  ]

  function getMensagem(nome: string, dias: number): string {
    if (dias === 0) return `🎂 Feliz aniversário, ${nome}! Que Deus te abençoe muito nesse dia especial! 🎉`
    return `🎂 Oi ${nome}! Passando para te lembrar que seu aniversário está chegando! Que seja muito abençoado! 🙏`
  }

  function abrirWpp(p: typeof todos[0]) {
    const contato = 'contato' in p ? p.contato : null
    if (!contato) { showToast('Sem WhatsApp cadastrado.'); return }
    const numero = contato.replace(/\D/g,'')
    const texto  = getMensagem(p.nome, p.dias)
    window.open(`https://wa.me/55${numero}?text=${encodeURIComponent(texto)}`, '_blank')
  }

  if (loading) return <div className="flex-1 flex items-center justify-center"><Spinner /></div>

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <h1 className="text-xl font-bold text-white mb-4">Aniversariantes</h1>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-[#111] border border-white/8 rounded-xl p-3 text-center">
          <div className="text-2xl font-black text-yellow-400">{TABS[0].count}</div>
          <div className="text-gray-500 text-xs">Hoje</div>
        </div>
        <div className="bg-[#111] border border-white/8 rounded-xl p-3 text-center">
          <div className="text-2xl font-black text-white">{TABS[1].count}</div>
          <div className="text-gray-500 text-xs">Este mês</div>
        </div>
        <div className="bg-[#111] border border-white/8 rounded-xl p-3 text-center">
          <div className="text-2xl font-black text-gray-400">{todos.filter(p => !p.data_nasc).length === 0 ? <CheckCircle2 className="inline" size={20} /> : todos.filter(p => !p.data_nasc).length}</div>
          <div className="text-gray-500 text-xs">Sem data</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition touch-manipulation
              ${tab === t.key ? 'bg-red-600 text-white' : 'bg-white/5 text-gray-400'}`}>
            <span className="inline-flex items-center gap-1"><t.icon size={13} />{t.label}</span> {t.count > 0 && <span className="ml-1 opacity-70">({t.count})</span>}
          </button>
        ))}
      </div>

      {/* Lista */}
      {filtrados.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <div className="flex justify-center mb-3"><Cake size={36} className="text-gray-600" /></div>
          <p>Nenhum aniversariante {tab === 'hoje' ? 'hoje' : tab === 'mes' ? 'este mês' : 'nos próximos 30 dias'}.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtrados.map(p => {
            const isHoje = p.dias === 0
            const contato = 'contato' in p ? p.contato : null
            const foto = 'foto_url' in p ? p.foto_url : null
            return (
              <div key={p.id} className={`bg-[#111] border rounded-xl p-4 flex items-center gap-3
                ${isHoje ? 'border-yellow-500/40 bg-yellow-500/5' : 'border-white/8'}`}>
                <Avatar
                  src={foto}
                  nome={p.nome}
                  size={80}
                  className="w-16 h-16 md:w-20 md:h-20"
                  bg={isHoje ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-white font-semibold text-sm">{p.nome}</span>
                    {isHoje && <span className="flex items-center gap-1 text-yellow-400 text-xs font-bold"><PartyPopper size={12} />Hoje!</span>}
                  </div>
                  <div className="text-gray-500 text-xs">
                    {p.data_nasc ? `${p.data_nasc.slice(8,10)}/${p.data_nasc.slice(5,7)}` : '—'}
                    {p.idade != null && ` · ${p.idade} anos`}
                    {!isHoje && ` · ${diasLabel(p.dias)}`}
                  </div>
                </div>
                {contato && (
                  <button onClick={() => abrirWpp(p)}
                    className="p-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition touch-manipulation flex-shrink-0">
                    <MessageCircle size={16} />
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {toast && <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-gray-800 text-white text-sm px-5 py-2.5 rounded-full shadow-lg">{toast}</div>}
    </div>
  )
}
