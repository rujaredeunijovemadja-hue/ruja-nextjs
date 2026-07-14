'use client'

import { useState } from 'react'
import type { Departamento } from '@/lib/ruja/types'
import { departmentSlug } from '@/lib/ruja/departments'

export default function CadastroPublicoForm({ departamentos }: { departamentos: Departamento[] }) {
  const [form, setForm] = useState({
    nome: '',
    telefone: '',
    email: '',
    data_nascimento: '',
    departamento_slug: departamentos[0] ? departmentSlug(departamentos[0]) : '',
    responsavel_nome: '',
    responsavel_telefone: '',
    observacoes: '',
  })
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)
    setMessage('')
    setError('')
    try {
      const response = await fetch('/api/ruja/cadastros-pendentes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? 'Erro ao enviar cadastro.')
      setMessage('Cadastro enviado com sucesso. A liderança vai analisar antes de aprovar.')
      setForm({
        nome: '',
        telefone: '',
        email: '',
        data_nascimento: '',
        departamento_slug: departamentos[0] ? departmentSlug(departamentos[0]) : '',
        responsavel_nome: '',
        responsavel_telefone: '',
        observacoes: '',
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao enviar cadastro.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="min-h-dvh bg-[#0A0A0A] text-white px-4 py-8">
      <div className="max-w-xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <img src="/ruja-logo.png" alt="RUJA" className="w-12 h-12 rounded-full object-contain" />
          <div>
            <h1 className="font-black text-xl">Cadastro RUJA</h1>
            <p className="text-gray-500 text-sm">Escolha Teens ou Simply para análise da liderança.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-[#111] border border-white/10 rounded-2xl p-5 space-y-4">
          <Field label="Nome completo *">
            <input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} className={INPUT} required />
          </Field>
          <Field label="Telefone/WhatsApp *">
            <input value={form.telefone} onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))} className={INPUT} required inputMode="tel" />
          </Field>
          <Field label="Email">
            <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className={INPUT} type="email" />
          </Field>
          <Field label="Data de nascimento">
            <input value={form.data_nascimento} onChange={e => setForm(f => ({ ...f, data_nascimento: e.target.value }))} className={INPUT} type="date" />
          </Field>
          <Field label="Departamento *">
            <select
              value={form.departamento_slug}
              onChange={e => setForm(f => ({ ...f, departamento_slug: e.target.value }))}
              className={INPUT}
              required
            >
              {departamentos.map((departamento) => (
                <option key={departamento.id} value={departmentSlug(departamento)}>
                  {departamento.nome}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Responsável, se menor">
            <input value={form.responsavel_nome} onChange={e => setForm(f => ({ ...f, responsavel_nome: e.target.value }))} className={INPUT} />
          </Field>
          <Field label="Telefone do responsável">
            <input value={form.responsavel_telefone} onChange={e => setForm(f => ({ ...f, responsavel_telefone: e.target.value }))} className={INPUT} inputMode="tel" />
          </Field>
          <Field label="Observações">
            <textarea value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} className={`${INPUT} resize-none`} rows={4} />
          </Field>

          {message && <div className="rounded-xl bg-green-500/10 border border-green-500/20 text-green-300 px-4 py-3 text-sm">{message}</div>}
          {error && <div className="rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 px-4 py-3 text-sm">{error}</div>}

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold py-4 rounded-xl transition"
          >
            {saving ? 'Enviando...' : 'Enviar cadastro'}
          </button>
        </form>
      </div>
    </main>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">{label}</span>
      {children}
    </label>
  )
}

const INPUT = 'w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-red-500/40 transition'
