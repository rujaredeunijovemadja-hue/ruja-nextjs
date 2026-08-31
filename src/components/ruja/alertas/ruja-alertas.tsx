'use client'
import { useMemo } from 'react'
import { useRuja } from '@/lib/ruja/context'
import { Spinner } from '@/components/ui/spinner'
import { getFaltasSeguidas, getFreqPct, getDiasParaAniversario } from '@/lib/ruja/calculos'
import { CheckCircle2, AlertTriangle, Cake, MessageCircle, type LucideIcon } from 'lucide-react'

export default function RujaAlertas() {
  const { jovens, frequencias, recuperacoes, regras, loading } = useRuja()

  const alertas = useMemo(() => {
    const lista: {
      tipo: 'risco' | 'falta' | 'recuperacao' | 'aniversario'
      prioridade: 1 | 2 | 3
      jovemId: string
      nome: string
      contato: string
      descricao: string
      acao?: string
    }[] = []

    jovens.forEach(j => {
      const faltas  = getFaltasSeguidas(j.id, frequencias)
      const pct     = getFreqPct(j.id, frequencias)
      const dias    = j.data_nasc ? getDiasParaAniversario(j.data_nasc) : 999
      const emRecup = recuperacoes.some(r => r.jovem_id === j.id && r.status === 'ativo')

      // Em Risco sem plano de recuperação
      if (j.status === 'Em Risco' && !emRecup) {
        lista.push({
          tipo: 'risco', prioridade: 1,
          jovemId: j.id, nome: j.nome, contato: j.contato,
          descricao: `${faltas} falta${faltas !== 1 ? 's' : ''} seguida${faltas !== 1 ? 's' : ''} · ${pct}% de frequência`,
          acao: 'Criar plano de recuperação'
        })
      }

      // Muitas faltas mas ainda não Em Risco
      if (j.status !== 'Em Risco' && faltas >= regras.risco - 1 && faltas > 0) {
        lista.push({
          tipo: 'falta', prioridade: 2,
          jovemId: j.id, nome: j.nome, contato: j.contato,
          descricao: `${faltas} falta${faltas !== 1 ? 's' : ''} seguida${faltas !== 1 ? 's' : ''} · Status: ${j.status}`,
          acao: 'Entrar em contato'
        })
      }

      // Aniversário hoje
      if (dias === 0) {
        lista.push({
          tipo: 'aniversario', prioridade: 2,
          jovemId: j.id, nome: j.nome, contato: j.contato,
          descricao: 'Aniversário hoje!',
          acao: 'Enviar mensagem'
        })
      }
    })

    return lista.sort((a, b) => a.prioridade - b.prioridade)
  }, [jovens, frequencias, recuperacoes, regras])

  const porTipo = {
    risco:       alertas.filter(a => a.tipo === 'risco'),
    falta:       alertas.filter(a => a.tipo === 'falta'),
    aniversario: alertas.filter(a => a.tipo === 'aniversario'),
  }

  if (loading) return <div className="flex-1 flex items-center justify-center"><Spinner /></div>

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <div className="mb-5">
        <h1 className="text-xl font-bold text-white">Alertas</h1>
        <p className="text-gray-500 text-sm">{alertas.length} alertas ativos</p>
      </div>

      {alertas.length === 0 ? (
        <div className="text-center py-20">
          <div className="flex justify-center mb-4"><CheckCircle2 size={48} className="text-green-400" /></div>
          <p className="text-white font-bold text-lg">Tudo em ordem!</p>
          <p className="text-gray-500 text-sm mt-1">Nenhum alerta no momento.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Em Risco sem plano */}
          {porTipo.risco.length > 0 && (
            <Section
              title="Em Risco sem Plano de Recuperação"
              icon={AlertTriangle}
              iconColor="text-red-400"
              cor="border-red-500/30 bg-red-500/5"
              items={porTipo.risco}
            />
          )}

          {/* Atenção — faltas crescendo */}
          {porTipo.falta.length > 0 && (
            <Section
              title="Atenção — Faltas Consecutivas"
              icon={AlertTriangle}
              iconColor="text-yellow-400"
              cor="border-yellow-500/30 bg-yellow-500/5"
              items={porTipo.falta}
            />
          )}

          {/* Aniversários hoje */}
          {porTipo.aniversario.length > 0 && (
            <Section
              title="Aniversários Hoje"
              icon={Cake}
              iconColor="text-yellow-300"
              cor="border-yellow-400/30 bg-yellow-400/5"
              items={porTipo.aniversario}
            />
          )}
        </div>
      )}
    </div>
  )
}

function Section({ title, icon: Icon, iconColor, cor, items }: {
  title: string
  icon: LucideIcon
  iconColor: string
  cor: string
  items: { jovemId: string; nome: string; contato: string; descricao: string; acao?: string }[]
}) {
  return (
    <div>
      <h2 className="flex items-center gap-1.5 text-white font-semibold text-sm mb-2"><Icon size={14} className={iconColor} />{title} ({items.length})</h2>
      <div className={`border rounded-xl overflow-hidden ${cor}`}>
        {items.map((item, i) => (
          <div key={item.jovemId + i}
            className={`flex items-center gap-3 px-4 py-3 ${i > 0 ? 'border-t border-white/5' : ''}`}>
            <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
              {item.nome.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white font-semibold text-sm truncate">{item.nome}</div>
              <div className="text-gray-400 text-xs">{item.descricao}</div>
            </div>
            {item.contato && (
              <a
                href={`https://wa.me/55${item.contato.replace(/\D/g,'')}`}
                target="_blank" rel="noreferrer"
                className="flex-shrink-0 p-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition touch-manipulation text-sm"
                title={item.acao}
              >
                <MessageCircle size={16} />
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
