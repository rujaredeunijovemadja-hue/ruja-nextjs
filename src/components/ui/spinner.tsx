export function Spinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const s = size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-10 h-10' : 'w-6 h-6'
  return (
    <div className={`${s} border-2 border-red-500/30 border-t-red-500 rounded-full animate-spin`} />
  )
}

export function LoadingScreen() {
  return (
    <div className="fixed inset-0 bg-[#0A0A0A] flex flex-col items-center justify-center gap-4 z-50">
      <Spinner size="lg" />
      <p className="text-gray-400 text-sm">Carregando RUJA...</p>
    </div>
  )
}
