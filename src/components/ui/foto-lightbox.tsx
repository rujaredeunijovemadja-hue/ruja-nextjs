'use client'
import Image from 'next/image'

interface FotoLightboxProps {
  src: string
  nome: string
  onClose: () => void
}

export function FotoLightbox({ src, nome, onClose }: FotoLightboxProps) {
  return (
    <div
      className="fixed inset-0 bg-black/90 z-[60] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 text-white/70 hover:text-white text-2xl touch-manipulation"
      >
        ✕
      </button>
      <Image
        src={src}
        alt={nome}
        width={600}
        height={600}
        className="max-w-[92vw] max-h-[85vh] w-auto h-auto object-contain rounded-xl"
        onClick={e => e.stopPropagation()}
      />
      <p className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/80 text-sm font-semibold">{nome}</p>
    </div>
  )
}
