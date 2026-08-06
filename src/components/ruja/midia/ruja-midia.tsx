'use client'

import { useRuja } from '@/lib/ruja/context'
import { Spinner } from '@/components/ui/spinner'
import type { PlatformAccess } from '@/lib/ruja/platforms'

const STEPS = [
  ['Solicitacoes', 'Pedidos recebidos e briefing inicial.', '📥'],
  ['Planejamento', 'Pauta, prazo, responsavel e prioridade.', '🗓️'],
  ['Producao', 'Execucao de arte, video, texto ou cobertura.', '🎬'],
  ['Revisao', 'Conferencia interna antes da aprovacao.', '🔎'],
  ['Aprovacao', 'Validacao do responsavel solicitante.', '✅'],
  ['Entrega', 'Publicacao, envio e registro do material final.', '📤'],
] as const

export default function RujaMidia({ access }: { access: PlatformAccess }) {
  const { loading } = useRuja()
  if (loading) return <div className="flex-1 flex items-center justify-center"><Spinner /></div>

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      <header>
        <div className="flex items-center gap-3">
          <span className="text-3xl">🎥</span>
          <div>
            <h1 className="text-xl font-bold text-white">Mídia</h1>
            <p className="text-gray-500 text-sm">Piloto da nova arquitetura operacional.</p>
          </div>
        </div>
        <div className="mt-4 bg-violet-500/10 border border-violet-500/20 rounded-xl p-4 text-violet-200 text-sm">
          O catálogo e o controle de acesso já estão ativos. Os registros de produção serão habilitados na próxima migration do piloto.
        </div>
      </header>

      <section>
        <h2 className="text-white font-semibold mb-3">Fluxo operacional</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {STEPS.map(([label, description, icon], index) => (
            <div key={label} className="bg-[#111] border border-white/8 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-2xl">{icon}</span>
                <span className="text-xs text-gray-600 font-bold">0{index + 1}</span>
              </div>
              <h3 className="text-white font-semibold">{label}</h3>
              <p className="text-gray-500 text-sm mt-1">{description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-[#111] border border-white/8 rounded-xl p-4">
        <h2 className="text-white font-semibold">Módulos habilitados</h2>
        <div className="flex flex-wrap gap-2 mt-3">
          {access.modules.map(module => (
            <span key={module} className="px-3 py-1.5 rounded-full bg-violet-500/15 text-violet-300 text-xs font-semibold">{module}</span>
          ))}
        </div>
      </section>
    </div>
  )
}
