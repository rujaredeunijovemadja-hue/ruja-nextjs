'use client'

import type { PlatformAccess } from '@/lib/ruja/platforms'
import { platformDefinition } from '@/lib/ruja/platforms'

export default function RujaPlataformaWorkspace({ access }: { access: PlatformAccess }) {
  const definition = platformDefinition(access.slug)
  const label = definition?.label ?? access.slug
  return <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6"><header className="flex items-center gap-3"><span className="text-3xl">{definition?.icon ?? '🧩'}</span><div><h1 className="text-xl font-bold text-white">{label}</h1><p className="text-gray-500 text-sm">{definition?.description ?? 'Workspace operacional da plataforma.'}</p></div></header><div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 text-blue-200 text-sm">Esta plataforma está ativa no catálogo. Os módulos abaixo já estão reservados para o fluxo operacional específico.</div><section><h2 className="text-white font-semibold mb-3">Módulos habilitados</h2><div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">{access.modules.map(module => <div key={module} className="bg-[#111] border border-white/8 rounded-xl p-4"><div className="text-violet-300 text-sm font-semibold">{module}</div><p className="text-gray-600 text-xs mt-2">Módulo disponível para implementação deste workspace.</p></div>)}</div></section></div>
}
