'use client'
import { useMemo } from 'react'
import { useRuja } from '@/lib/ruja/context'
import { Spinner } from '@/components/ui/spinner'
import { Avatar } from '@/components/ui/avatar'
import { getDiasParaAniversario, getFreqPct } from '@/lib/ruja/calculos'
import type { DepartmentScope } from '@/lib/ruja/departments'
import { DEPARTMENT_LABELS, filterJovensByScope, jovemMatchesDepartment } from '@/lib/ruja/departments'
import { RujaIcon } from '../layout/ruja-icon'

interface Props {
  scope?: DepartmentScope
  title?: string
}

export default function RujaDashboard({ scope = 'all', title }: Props) {
  const { jovens, frequencias, recuperacoes, metas, historicoMensal, loading } = useRuja()

  const kpis = useMemo(() => {
    const scopedJovens = filterJovensByScope(jovens, scope)
    const scopedIds = new Set(scopedJovens.map(j => j.id))
    const total           = scopedJovens.length
    const ativos          = scopedJovens.filter(j => j.status === 'Ativo').length
    const oscilando       = scopedJovens.filter(j => j.status === 'Oscilando').length
    const ativosDepto     = scopedJovens.filter(j => j.status === 'Ativo' && j.departamento).length
    const emRisco         = scopedJovens.filter(j => j.status === 'Em Risco').length
    const batizados       = scopedJovens.filter(j => j.batizado === 'sim').length
    const batizadosDepto  = scopedJovens.filter(j => j.batizado === 'sim' && j.status === 'Ativo' && j.departamento).length
    const recuperacaoAtiva= recuperacoes.filter(r => r.status === 'ativo' && scopedIds.has(r.jovem_id)).length
    const frequenciaGeral = total > 0
      ? Math.round(scopedJovens.reduce((sum, jovem) => sum + getFreqPct(jovem.id, frequencias), 0) / total)
      : 0
    const totalTeens      = jovens.filter(j => jovemMatchesDepartment(j, 'teens')).length
    const totalSimply     = jovens.filter(j => jovemMatchesDepartment(j, 'simply')).length

    const hoje = new Date()
    hoje.setHours(0,0,0,0)
    const aniversHoje = scopedJovens.filter(j => getDiasParaAniversario(j.data_nasc) === 0)
    const aniversMes  = scopedJovens.filter(j => {
      if (!j.data_nasc) return false
      const m = parseInt(j.data_nasc.split('-')[1])
      return m === hoje.getMonth() + 1
    })

    return { total, ativos, oscilando, ativosDepto, emRisco, batizados, batizadosDepto,
             recuperacaoAtiva, aniversHoje, aniversMes, frequenciaGeral, totalTeens, totalSimply }
  }, [jovens, frequencias, recuperacoes, scope])

  const pctAtivos   = metas.ativosDepto > 0 ? Math.min(100, Math.round((kpis.ativosDepto / metas.ativosDepto) * 100)) : 0
  const pctBatizados= metas.batizadosDepto > 0 ? Math.min(100, Math.round((kpis.batizadosDepto / metas.batizadosDepto) * 100)) : 0

  if (loading) return <div className="flex-1 flex items-center justify-center"><Spinner /></div>

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-7">
      <div>
        <h1 className="text-xl font-bold text-white">
          {title ?? (scope === 'all' ? 'Dashboard Geral' : `Dashboard ${DEPARTMENT_LABELS[scope]}`)}
        </h1>
        <p className="text-gray-500 text-sm">
          {scope === 'all' ? 'Visão consolidada de todos os departamentos da RUJA.' : `Dados filtrados apenas por ${DEPARTMENT_LABELS[scope]}.`}
        </p>
      </div>

      {/* KPIs principais */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Total de Jovens" value={kpis.total} icon="jovens" />
        <KpiCard label="Ativos" value={kpis.ativos} icon="check" color="text-green-400" />
        <KpiCard label="Oscilando" value={kpis.oscilando} icon="alert" color="text-yellow-400" />
        <KpiCard label="Em Risco" value={kpis.emRisco} icon="risco" color="text-red-400" />
        {scope === 'all' && <KpiCard label="Teens" value={kpis.totalTeens} icon="jovens" color="text-white" />}
        {scope === 'all' && <KpiCard label="Simply" value={kpis.totalSimply} icon="jovens" color="text-white" />}
        <KpiCard label="Frequência Geral" value={kpis.frequenciaGeral} icon="frequencia" suffix="%" color="text-white" />
        <KpiCard label="Batizados" value={kpis.batizados} icon="check" color="text-white" />
      </div>

      {/* Metas */}
      <div className="grid md:grid-cols-2 gap-3">
        <MetaCard
          label="Ativos em Departamento"
          atual={kpis.ativosDepto}
          meta={metas.ativosDepto}
          pct={pctAtivos}
          icon="🏛️"
          color="bg-green-500"
        />
        <MetaCard
          label="Batizados Ativos em Dep."
          atual={kpis.batizadosDepto}
          meta={metas.batizadosDepto}
          pct={pctBatizados}
          icon="🔵"
          color="bg-blue-500"
        />
      </div>

      {/* Alertas rápidos */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {kpis.recuperacaoAtiva > 0 && (
          <AlertCard label="Em Recuperação" value={kpis.recuperacaoAtiva} icon="🚑" color="bg-orange-500/20 border-orange-500/30 text-orange-400" />
        )}
        {kpis.aniversHoje.length > 0 && (
          <AlertCard label="Aniversário Hoje" value={kpis.aniversHoje.length} icon="🎂" color="bg-yellow-500/20 border-yellow-500/30 text-yellow-400" />
        )}
        {kpis.aniversMes.length > 0 && (
          <AlertCard label="Aniversários no Mês" value={kpis.aniversMes.length} icon="📅" color="bg-purple-500/20 border-purple-500/30 text-purple-400" />
        )}
      </div>

      {/* Aniversariantes */}
      {(kpis.aniversHoje.length > 0 || kpis.aniversMes.length > 0) && (
        <div className="bg-[#111] border border-white/8 rounded-xl p-4">
          <h3 className="text-white font-semibold mb-3">Aniversariantes</h3>
          <div className="space-y-2">
            {(kpis.aniversHoje.length > 0 ? kpis.aniversHoje : kpis.aniversMes.slice(0, 5)).map(j => {
              const isHoje = getDiasParaAniversario(j.data_nasc) === 0
              return (
                <div key={j.id} className="flex items-center gap-3">
                  <Avatar
                    src={j.foto_url}
                    nome={j.nome}
                    size={64}
                    className="w-16 h-16"
                    bg={isHoje ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-sm font-semibold truncate">{j.nome}</div>
                    <div className="text-gray-500 text-xs">
                      {j.data_nasc && `${j.data_nasc.slice(8,10)}/${j.data_nasc.slice(5,7)}`}
                      {isHoje && <span className="text-red-400 font-bold ml-1">Hoje</span>}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Status breakdown */}
      <div className="bg-[#111] border border-white/8 rounded-xl p-4">
        <h3 className="text-white font-semibold mb-3">Status dos Jovens</h3>
        <div className="space-y-2">
          {(['Ativo','Oscilando','Ocioso','Em Risco'] as const).map(status => {
            const scopedJovens = filterJovensByScope(jovens, scope)
            const count = scopedJovens.filter(j => j.status === status).length
            const pct   = scopedJovens.length > 0 ? Math.round((count / scopedJovens.length) * 100) : 0
            const color = { Ativo:'bg-green-500', Oscilando:'bg-yellow-500', Ocioso:'bg-gray-500', 'Em Risco':'bg-red-500' }[status]
            return (
              <div key={status} className="flex items-center gap-3">
                <div className="w-20 text-gray-400 text-xs text-right">{status}</div>
                <div className="flex-1 bg-white/5 rounded-full h-2">
                  <div className={`${color} h-2 rounded-full transition-all`} style={{ width: `${pct}%` }} />
                </div>
                <div className="text-white text-xs font-bold w-8">{count}</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Histórico mensal */}
      {historicoMensal.length > 0 && (
        <div className="bg-[#111] border border-white/8 rounded-xl p-4">
          <h3 className="text-white font-semibold mb-3">Histórico Mensal</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 text-xs">
                  <th className="text-left pb-2">Mês</th>
                  <th className="text-right pb-2">Total</th>
                  <th className="text-right pb-2">Ativos/Dep</th>
                  <th className="text-right pb-2">Batizados/Dep</th>
                </tr>
              </thead>
              <tbody>
                {historicoMensal.slice(-6).reverse().map(h => (
                  <tr key={h.mes} className="border-t border-white/5">
                    <td className="py-2 text-gray-300">{h.mes}</td>
                    <td className="py-2 text-right text-white">{h.total}</td>
                    <td className="py-2 text-right text-green-400">{h.ativos_depto}</td>
                    <td className="py-2 text-right text-blue-400">{h.batizados_depto}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function KpiCard({ label, value, icon, color='text-white', suffix='' }: { label:string; value:number; icon:string; color?:string; suffix?: string }) {
  return (
    <div className="bg-[#111] border border-white/8 rounded-xl p-4">
      <div className={`mb-3 ${color}`}><RujaIcon name={icon} size={20} /></div>
      <div className={`text-2xl font-black ${color}`}>{value}{suffix}</div>
      <div className="text-gray-500 text-xs mt-1">{label}</div>
    </div>
  )
}

function MetaCard({ label, atual, meta, pct, icon, color }: {
  label:string; atual:number; meta:number; pct:number; icon:string; color:string
}) {
  const atingida = pct >= 100
  return (
    <div className="bg-[#111] border border-white/8 rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-gray-400 text-sm">{icon} {label}</span>
        {atingida && <span className="text-green-400 text-xs font-bold">✅ Meta!</span>}
      </div>
      <div className="text-2xl font-black text-white mb-1">
        {atual} <span className="text-gray-600 text-base font-normal">/ {meta}</span>
      </div>
      <div className="bg-white/5 rounded-full h-2">
        <div className={`${color} h-2 rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <div className="text-gray-500 text-xs mt-1">{pct}%</div>
    </div>
  )
}

function AlertCard({ label, value, icon, color }: { label:string; value:number; icon:string; color:string }) {
  return (
    <div className={`border rounded-xl p-3 ${color}`}>
      <div className="text-2xl">{icon}</div>
      <div className="text-xl font-black mt-1">{value}</div>
      <div className="text-xs mt-0.5 opacity-80">{label}</div>
    </div>
  )
}
