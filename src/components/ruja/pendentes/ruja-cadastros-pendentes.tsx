'use client'

import { useMemo, useState } from 'react'
import { useRuja } from '@/lib/ruja/context'
import {
  analisarCadastroPendente,
  aprovarCadastroPendente,
  rejeitarCadastroPendente,
  salvarObservacaoCadastro,
  solicitarCorrecaoCadastro,
} from '@/lib/ruja/queries'
import { ageFromBirthDate, CADASTRO_STATUS, type CadastroStatus } from '@/lib/ruja/cadastro-publico'
import { Spinner } from '@/components/ui/spinner'
import type { CadastroPendente } from '@/lib/ruja/types'
import type { DepartmentScope } from '@/lib/ruja/departments'
import { activeOfficialDepartments, DEPARTMENT_LABELS, departmentSlug } from '@/lib/ruja/departments'

const STATUS_LABELS: Record<CadastroStatus, string> = {
  pendente: 'Pendente', em_analise: 'Em análise', correcao_solicitada: 'Correção solicitada',
  aprovado: 'Aprovado', rejeitado: 'Rejeitado',
}
const CORRECTION_FIELDS = [
  ['nome', 'Nome'], ['data_nascimento', 'Nascimento'], ['telefone', 'Telefone'],
  ['email', 'Email'], ['foto', 'Foto'], ['departamento', 'Departamento'],
  ['responsavel', 'Responsável'], ['endereco', 'Endereço'], ['batismo', 'Batismo'], ['outro', 'Outro'],
] as const

export default function RujaCadastrosPendentes({ scope = 'all' }: { scope?: DepartmentScope }) {
  const { cadastrosPendentes, departamentos, loading, reload, can } = useRuja()
  const canManage = can('approve_pending')
  const [selectedId, setSelectedId] = useState('')
  const [action, setAction] = useState<{ type: 'rejeitar' | 'correcao'; cadastro: CadastroPendente } | null>(null)
  const [motivo, setMotivo] = useState('')
  const [campos, setCampos] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')
  const [filters, setFilters] = useState({ busca: '', departamento: '', status: '', data: '', duplicidade: false })

  const showToast = (message: string) => { setToast(message); setTimeout(() => setToast(''), 3500) }
  const officialDepartments = activeOfficialDepartments(departamentos)
  const scoped = useMemo(() => cadastrosPendentes.filter(cadastro => {
    if (scope === 'all') return true
    return cadastro.departamento ? departmentSlug(cadastro.departamento) === scope : cadastro.departamento_id === scope
  }), [cadastrosPendentes, scope])
  const filtrados = useMemo(() => scoped.filter(cadastro => {
    const busca = filters.busca.trim().toLowerCase()
    if (busca && !cadastro.nome.toLowerCase().includes(busca) && !(cadastro.telefone ?? '').includes(busca)) return false
    if (filters.departamento && cadastro.departamento_id !== filters.departamento) return false
    if (filters.status && cadastro.status !== filters.status) return false
    if (filters.data && cadastro.created_at.slice(0, 10) !== filters.data) return false
    if (filters.duplicidade && !cadastro.possivel_duplicidade) return false
    return true
  }), [scoped, filters])
  const selected = cadastrosPendentes.find(item => item.id === selectedId) ?? null
  const month = new Date().toISOString().slice(0, 7)
  const kpis = {
    pendentes: scoped.filter(c => c.status === 'pendente').length,
    analise: scoped.filter(c => c.status === 'em_analise').length,
    duplicidades: scoped.filter(c => c.possivel_duplicidade).length,
    aprovados: scoped.filter(c => c.status === 'aprovado' && c.aprovado_em?.startsWith(month)).length,
    rejeitados: scoped.filter(c => c.status === 'rejeitado' && c.rejeitado_em?.startsWith(month)).length,
  }

  async function openDetails(cadastro: CadastroPendente) {
    setSelectedId(cadastro.id)
    if (canManage && cadastro.status === 'pendente') {
      try { await analisarCadastroPendente(cadastro.id); await reload() } catch { /* detalhe continua disponível */ }
    }
  }

  async function approve(cadastro: CadastroPendente) {
    if (!window.confirm(`Aprovar ${cadastro.nome} e criar o jovem?`)) return
    setSaving(true)
    try {
      const result = await aprovarCadastroPendente(cadastro)
      await reload()
      showToast(result.ja_aprovado ? 'Este cadastro já estava aprovado.' : 'Cadastro aprovado e jovem criado uma única vez.')
    } catch (error) { showToast(messageOf(error)) } finally { setSaving(false) }
  }

  async function submitAction() {
    if (!action || motivo.trim().length < 3) { showToast('Descreva o motivo.'); return }
    if (action.type === 'correcao' && campos.length === 0) { showToast('Selecione ao menos um campo.'); return }
    setSaving(true)
    try {
      if (action.type === 'rejeitar') await rejeitarCadastroPendente(action.cadastro.id, motivo)
      else await solicitarCorrecaoCadastro(action.cadastro.id, motivo, campos)
      await reload()
      setAction(null); setMotivo(''); setCampos([])
      showToast(action.type === 'rejeitar' ? 'Cadastro rejeitado e mantido no histórico.' : 'Correção registrada para acompanhamento.')
    } catch (error) { showToast(messageOf(error)) } finally { setSaving(false) }
  }

  if (loading) return <div className="flex-1 flex items-center justify-center"><Spinner /></div>

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <div className="mb-5">
        <h1 className="text-xl font-bold text-white">Cadastros Pendentes{scope !== 'all' ? ` · ${DEPARTMENT_LABELS[scope]}` : ''}</h1>
        <p className="text-gray-500 text-sm">Análise segura por departamento · {filtrados.length} exibidos</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-5">
        <Kpi label="Pendentes" value={kpis.pendentes} tone="yellow" />
        <Kpi label="Em análise" value={kpis.analise} tone="blue" />
        <Kpi label="Duplicidades" value={kpis.duplicidades} tone="red" />
        <Kpi label="Aprovados no mês" value={kpis.aprovados} tone="green" />
        <Kpi label="Rejeitados no mês" value={kpis.rejeitados} tone="gray" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-2 mb-5">
        <input type="search" value={filters.busca} onChange={e => setFilters(f => ({ ...f, busca: e.target.value }))} placeholder="Nome ou telefone" className={INPUT} />
        {scope === 'all' && <select value={filters.departamento} onChange={e => setFilters(f => ({ ...f, departamento: e.target.value }))} className={INPUT}><option value="">Todos departamentos</option>{officialDepartments.map(d => <option key={d.id} value={d.id}>{d.nome}</option>)}</select>}
        <select value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))} className={INPUT}><option value="">Todos status</option>{CADASTRO_STATUS.map(status => <option key={status} value={status}>{STATUS_LABELS[status]}</option>)}</select>
        <input type="date" value={filters.data} onChange={e => setFilters(f => ({ ...f, data: e.target.value }))} className={INPUT} />
        <label className="flex items-center gap-2 px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-gray-300 text-xs"><input type="checkbox" checked={filters.duplicidade} onChange={e => setFilters(f => ({ ...f, duplicidade: e.target.checked }))} /> Possível duplicidade</label>
      </div>

      {filtrados.length === 0 ? <Empty /> : (
        <div className="space-y-3">
          {filtrados.map(cadastro => (
            <article key={cadastro.id} className="bg-[#111] border border-white/8 rounded-xl p-4 flex flex-col md:flex-row md:items-center gap-4">
              {cadastro.foto_path ? <img src={`/api/ruja/cadastros-pendentes/${cadastro.id}/foto`} alt="" className="w-16 h-16 rounded-lg object-cover shrink-0" /> : <div className="w-16 h-16 rounded-lg bg-white/5 flex items-center justify-center text-gray-600 text-xl shrink-0">{cadastro.nome.charAt(0)}</div>}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2"><h2 className="text-white font-semibold truncate">{cadastro.nome}</h2><StatusPill status={cadastro.status} />{cadastro.possivel_duplicidade && <span className="text-xs bg-red-500/15 text-red-300 px-2 py-0.5 rounded-full">Possível duplicidade</span>}</div>
                <p className="text-gray-500 text-xs mt-1">{cadastro.data_nascimento ? `${ageFromBirthDate(cadastro.data_nascimento)} anos` : 'Nascimento pendente'} · {cadastro.telefone} · {cadastro.departamento?.nome ?? cadastro.departamento_id}</p>
                <p className="text-gray-600 text-xs mt-1">Enviado em {formatDate(cadastro.created_at)}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => openDetails(cadastro)} className={BUTTON}>Ver detalhes</button>
                {canManage && !['aprovado', 'rejeitado'].includes(cadastro.status) && <button onClick={() => approve(cadastro)} disabled={saving} className={`${BUTTON} bg-green-600 text-white`}>Aprovar</button>}
                {canManage && !['aprovado', 'rejeitado'].includes(cadastro.status) && <button onClick={() => { setAction({ type: 'correcao', cadastro }); setMotivo(''); setCampos([]) }} className={`${BUTTON} bg-blue-500/15 text-blue-300`}>Solicitar correção</button>}
                {canManage && !['aprovado', 'rejeitado'].includes(cadastro.status) && <button onClick={() => { setAction({ type: 'rejeitar', cadastro }); setMotivo(''); setCampos([]) }} className={`${BUTTON} bg-red-500/15 text-red-300`}>Rejeitar</button>}
              </div>
            </article>
          ))}
        </div>
      )}

      {selected && <CadastroModal key={selected.id} cadastro={selected} canManage={canManage} saving={saving} onClose={() => setSelectedId('')} onApprove={() => approve(selected)} onCorrection={() => { setAction({ type: 'correcao', cadastro: selected }); setMotivo(''); setCampos([]) }} onReject={() => { setAction({ type: 'rejeitar', cadastro: selected }); setMotivo(''); setCampos([]) }} onSaved={async message => { await reload(); showToast(message) }} />}
      {action && <ActionModal type={action.type} cadastro={action.cadastro} motivo={motivo} setMotivo={setMotivo} campos={campos} setCampos={setCampos} saving={saving} onClose={() => setAction(null)} onSubmit={submitAction} />}
      {toast && <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[70] bg-gray-800 text-white text-sm px-5 py-2.5 rounded-full shadow-lg whitespace-nowrap max-w-[90vw] overflow-hidden text-ellipsis">{toast}</div>}
    </div>
  )
}

function CadastroModal({ cadastro, canManage, saving, onClose, onApprove, onCorrection, onReject, onSaved }: { cadastro: CadastroPendente; canManage: boolean; saving: boolean; onClose: () => void; onApprove: () => void; onCorrection: () => void; onReject: () => void; onSaved: (message: string) => Promise<void> }) {
  const [note, setNote] = useState(cadastro.observacao_administrativa ?? '')
  const active = !['aprovado', 'rejeitado'].includes(cadastro.status)
  async function saveNote() {
    try { await salvarObservacaoCadastro(cadastro.id, note); await onSaved('Observação administrativa salva.') } catch (error) { await onSaved(messageOf(error)) }
  }
  return <div className="fixed inset-0 bg-black/85 z-50 flex items-end md:items-center justify-center"><div className="bg-[#111] border border-white/10 rounded-t-xl md:rounded-xl w-full max-w-2xl max-h-[92dvh] flex flex-col"><header className="flex items-center justify-between px-5 py-4 border-b border-white/8"><div><h2 className="text-white font-bold">{cadastro.nome}</h2><div className="flex gap-2 mt-1"><StatusPill status={cadastro.status} />{cadastro.possivel_duplicidade && <span className="text-red-300 text-xs">Verificar duplicidade</span>}</div></div><button onClick={onClose} className="text-gray-400 text-xl p-2">✕</button></header><div className="overflow-y-auto p-5 space-y-5">
    {cadastro.foto_path && <img src={`/api/ruja/cadastros-pendentes/${cadastro.id}/foto`} alt={`Foto de ${cadastro.nome}`} className="w-40 h-40 rounded-xl object-cover mx-auto" />}
    <div className="grid md:grid-cols-2 gap-2"><Info label="Nascimento" value={cadastro.data_nascimento ? `${cadastro.data_nascimento} · ${ageFromBirthDate(cadastro.data_nascimento)} anos` : 'Não informado'} /><Info label="Departamento" value={cadastro.departamento?.nome ?? cadastro.departamento_id} /><Info label="Telefone" value={cadastro.telefone || '—'} /><Info label="Email" value={cadastro.email || '—'} /><Info label="Endereço" value={cadastro.endereco || '—'} /><Info label="Tempo na RUJA" value={cadastro.tempo_ruja || '—'} /><Info label="Batizado" value={cadastro.batizado ? `Sim${cadastro.data_batismo ? ` · ${cadastro.data_batismo}` : ''}` : 'Não'} /><Info label="Responsável" value={cadastro.responsavel_nome ? `${cadastro.responsavel_nome} · ${cadastro.responsavel_telefone || 'sem telefone'}` : 'Não informado'} /></div>
    <Info label="Observações enviadas" value={cadastro.observacoes || '—'} />
    {cadastro.solicitacao_correcao && <Info label="Correção solicitada" value={`${(cadastro.campos_correcao ?? []).join(', ')} · ${cadastro.solicitacao_correcao}`} />}
    {cadastro.motivo_rejeicao && <Info label="Motivo da rejeição" value={cadastro.motivo_rejeicao} />}
    <section><h3 className="text-white font-semibold text-sm mb-2">Registros semelhantes</h3>{cadastro.duplicidade_detalhes?.length ? <div className="space-y-2">{cadastro.duplicidade_detalhes.map(item => <div key={`${item.origem}-${item.id}`} className="bg-red-500/8 border border-red-500/15 rounded-lg px-3 py-2 text-sm"><div className="text-red-200 font-medium">{item.nome}</div><div className="text-gray-500 text-xs">{item.origem} · {item.motivos.join(', ')}</div></div>)}</div> : <p className="text-gray-600 text-sm">Nenhuma semelhança identificada.</p>}</section>
    <section><h3 className="text-white font-semibold text-sm mb-2">Histórico</h3><div className="space-y-2">{cadastro.acoes?.length ? cadastro.acoes.map(acao => <div key={acao.id} className="flex justify-between gap-3 text-xs border-b border-white/5 pb-2"><span className="text-gray-300">{actionLabel(acao.acao)}{acao.motivo ? ` · ${acao.motivo}` : ''}</span><span className="text-gray-600 whitespace-nowrap">{formatDate(acao.created_at)}</span></div>) : <p className="text-gray-600 text-sm">Sem ações registradas.</p>}</div></section>
    {canManage && <section><label className="text-white font-semibold text-sm block mb-2">Observação administrativa</label><textarea value={note} onChange={e => setNote(e.target.value)} rows={3} maxLength={1000} className={`${INPUT} resize-none`} /><button onClick={saveNote} className={`${BUTTON} bg-white/8 text-gray-200 mt-2`}>Salvar observação</button></section>}
  </div>{canManage && active && <footer className="p-4 border-t border-white/8 flex flex-wrap gap-2"><button onClick={onApprove} disabled={saving} className={`${BUTTON} bg-green-600 text-white flex-1`}>Aprovar</button><button onClick={onCorrection} className={`${BUTTON} bg-blue-500/15 text-blue-300 flex-1`}>Correção</button><button onClick={onReject} className={`${BUTTON} bg-red-500/15 text-red-300 flex-1`}>Rejeitar</button></footer>}</div></div>
}

function ActionModal({ type, cadastro, motivo, setMotivo, campos, setCampos, saving, onClose, onSubmit }: { type: 'rejeitar' | 'correcao'; cadastro: CadastroPendente; motivo: string; setMotivo: (value: string) => void; campos: string[]; setCampos: (value: string[]) => void; saving: boolean; onClose: () => void; onSubmit: () => void }) {
  return <div className="fixed inset-0 bg-black/85 z-[60] flex items-end md:items-center justify-center"><div className="bg-[#111] border border-white/10 rounded-t-xl md:rounded-xl w-full max-w-md p-5"><h2 className="text-white font-bold">{type === 'rejeitar' ? 'Rejeitar cadastro' : 'Solicitar correção'}</h2><p className="text-gray-500 text-sm mt-1 mb-4">{cadastro.nome}</p>{type === 'correcao' && <div className="flex flex-wrap gap-2 mb-4">{CORRECTION_FIELDS.map(([value, label]) => <label key={value} className={`px-3 py-2 rounded-lg text-xs cursor-pointer ${campos.includes(value) ? 'bg-blue-500/20 text-blue-300' : 'bg-white/5 text-gray-400'}`}><input type="checkbox" className="sr-only" checked={campos.includes(value)} onChange={() => setCampos(campos.includes(value) ? campos.filter(item => item !== value) : [...campos, value])} />{label}</label>)}</div>}<textarea value={motivo} onChange={e => setMotivo(e.target.value)} rows={4} placeholder={type === 'rejeitar' ? 'Motivo obrigatório' : 'Explique o que precisa ser corrigido'} className={`${INPUT} resize-none`} /><div className="flex gap-3 mt-4"><button onClick={onClose} className={`${BUTTON} bg-white/5 text-gray-300 flex-1`}>Cancelar</button><button onClick={onSubmit} disabled={saving} className={`${BUTTON} ${type === 'rejeitar' ? 'bg-red-600' : 'bg-blue-600'} text-white flex-1`}>{saving ? 'Salvando...' : 'Confirmar'}</button></div></div></div>
}

function Kpi({ label, value, tone }: { label: string; value: number; tone: 'yellow' | 'blue' | 'red' | 'green' | 'gray' }) { const colors = { yellow: 'text-yellow-300', blue: 'text-blue-300', red: 'text-red-300', green: 'text-green-300', gray: 'text-gray-300' }; return <div className="bg-[#111] border border-white/8 rounded-lg p-3"><div className={`text-xl font-bold ${colors[tone]}`}>{value}</div><div className="text-gray-500 text-[11px] mt-1">{label}</div></div> }
function Info({ label, value }: { label: string; value: string }) { return <div className="rounded-lg bg-white/5 px-3 py-2.5"><div className="text-gray-500 text-[10px] uppercase mb-1">{label}</div><div className="text-gray-200 text-sm break-words">{value}</div></div> }
function StatusPill({ status }: { status: CadastroStatus }) { const styles: Record<CadastroStatus, string> = { pendente: 'bg-yellow-500/15 text-yellow-300', em_analise: 'bg-blue-500/15 text-blue-300', correcao_solicitada: 'bg-orange-500/15 text-orange-300', aprovado: 'bg-green-500/15 text-green-300', rejeitado: 'bg-red-500/15 text-red-300' }; return <span className={`text-xs px-2 py-0.5 rounded-full ${styles[status]}`}>{STATUS_LABELS[status]}</span> }
function Empty() { return <div className="text-center py-16 text-gray-500"><div className="text-4xl mb-3">📋</div><p>Nenhum cadastro para estes filtros.</p></div> }
function formatDate(value: string) { return new Date(value).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) }
function messageOf(error: unknown) { return error instanceof Error ? error.message : 'Não foi possível concluir a ação.' }
function actionLabel(action: string) { return ({ cadastro_publico_enviado: 'Cadastro enviado', cadastro_em_analise: 'Análise iniciada', cadastro_aprovado: 'Cadastro aprovado', cadastro_rejeitado: 'Cadastro rejeitado', correcao_solicitada: 'Correção solicitada', duplicidade_identificada: 'Possível duplicidade identificada' } as Record<string, string>)[action] ?? action }
const INPUT = 'w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-red-500/40'
const BUTTON = 'px-3 py-2 rounded-lg text-xs font-semibold disabled:opacity-50 touch-manipulation'
