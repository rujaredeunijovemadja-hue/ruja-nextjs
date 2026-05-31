'use client'
import { useRuja } from '@/lib/ruja/context'
import { Spinner } from '@/components/ui/spinner'

export default function RujaConfig() {
  const { loading } = useRuja()
  if (loading) return <div className="flex-1 flex items-center justify-center"><Spinner /></div>
  return (
    <div className="p-4 md:p-6">
      <h2 className="text-lg font-bold text-white mb-4">Config</h2>
      <div className="text-gray-500 text-sm">Em implementação...</div>
    </div>
  )
}
