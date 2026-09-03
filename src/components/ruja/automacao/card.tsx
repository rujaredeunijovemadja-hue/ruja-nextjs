'use client'

import type { LucideIcon } from 'lucide-react'

export default function Card({ icon: Icon, title, subtitle, children }: { icon: LucideIcon; title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#111] border border-white/8 rounded-xl p-5">
      <h2 className="flex items-center gap-2 text-white font-semibold mb-1"><Icon size={17} className="text-red-400" />{title}</h2>
      {subtitle && <p className="text-gray-500 text-xs mb-3">{subtitle}</p>}
      {children}
    </div>
  )
}
