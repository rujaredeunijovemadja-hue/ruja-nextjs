import Image from 'next/image'

interface AvatarProps {
  src?: string | null
  nome: string
  size: number
  className?: string
  bg?: string
}

export function Avatar({ src, nome, size, className = '', bg = 'bg-red-500/20 text-red-400' }: AvatarProps) {
  return (
    <div className={`rounded-full ${bg} flex items-center justify-center font-bold overflow-hidden flex-shrink-0 ${className}`}>
      {src
        ? <Image src={src} alt={nome} width={size} height={size} className="w-full h-full object-cover" />
        : <span style={{ fontSize: Math.round(size * 0.4) }}>{nome.charAt(0).toUpperCase()}</span>
      }
    </div>
  )
}
