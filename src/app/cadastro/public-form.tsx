'use client'

import { useMemo, useRef, useState } from 'react'
import type { Departamento } from '@/lib/ruja/types'
import { ageFromBirthDate, formatPhone, isValidDate, normalizePhone } from '@/lib/ruja/cadastro-publico'
import { departmentSlug } from '@/lib/ruja/departments'

type FormState = {
  nome: string
  telefone: string
  email: string
  data_nascimento: string
  departamento_slug: string
  endereco: string
  tempo_ruja: string
  batizado: boolean
  data_batismo: string
  responsavel_nome: string
  responsavel_telefone: string
  autorizacao_responsavel: boolean
  consentimento_dados: boolean
  observacoes: string
}

const emptyForm = (departamentos: Departamento[]): FormState => ({
  nome: '', telefone: '', email: '', data_nascimento: '',
  departamento_slug: departamentos[0] ? departmentSlug(departamentos[0]) : 'teens',
  endereco: '', tempo_ruja: '', batizado: false, data_batismo: '',
  responsavel_nome: '', responsavel_telefone: '', autorizacao_responsavel: false,
  consentimento_dados: false, observacoes: '',
})

export default function CadastroPublicoForm({ departamentos }: { departamentos: Departamento[] }) {
  const [form, setForm] = useState<FormState>(() => emptyForm(departamentos))
  const [foto, setFoto] = useState<File | null>(null)
  const [fotoPreview, setFotoPreview] = useState('')
  const [submissionToken, setSubmissionToken] = useState('')
  const [saving, setSaving] = useState(false)
  const [protocolo, setProtocolo] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const fileRef = useRef<HTMLInputElement>(null)

  const idade = useMemo(() => isValidDate(form.data_nascimento)
    ? ageFromBirthDate(form.data_nascimento)
    : null, [form.data_nascimento])
  const menor = idade !== null && idade < 18

  function update<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm(current => ({ ...current, [field]: value }))
    setErrors(current => ({ ...current, [field]: '' }))
  }

  function selectPhoto(file: File | null) {
    setErrors(current => ({ ...current, foto: '' }))
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setErrors(current => ({ ...current, foto: 'Use uma foto JPG, PNG ou WEBP.' }))
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrors(current => ({ ...current, foto: 'A foto deve ter no máximo 5 MB.' }))
      return
    }
    if (fotoPreview) URL.revokeObjectURL(fotoPreview)
    setFoto(file)
    setFotoPreview(URL.createObjectURL(file))
  }

  function validate() {
    const next: Record<string, string> = {}
    if (form.nome.trim().length < 3) next.nome = 'Informe o nome completo.'
    if (!isValidDate(form.data_nascimento)) next.data_nascimento = 'Informe uma data válida.'
    if (normalizePhone(form.telefone).length < 10) next.telefone = 'Informe telefone com DDD.'
    if (!['teens', 'simply'].includes(form.departamento_slug)) next.departamento_slug = 'Escolha Teens ou Simply.'
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) next.email = 'Informe um email válido.'
    if (!form.consentimento_dados) next.consentimento_dados = 'Esta autorização é necessária.'
    if (menor) {
      if (form.responsavel_nome.trim().length < 3) next.responsavel_nome = 'Informe o responsável.'
      if (normalizePhone(form.responsavel_telefone).length < 10) next.responsavel_telefone = 'Informe telefone com DDD.'
      if (!form.autorizacao_responsavel) next.autorizacao_responsavel = 'A autorização do responsável é necessária.'
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (saving || !validate()) return
    const token = submissionToken || crypto.randomUUID()
    if (!submissionToken) setSubmissionToken(token)
    setSaving(true)
    setErrors({})

    try {
      const payload = new FormData()
      Object.entries(form).forEach(([key, value]) => payload.set(key, String(value)))
      payload.set('submission_token', token)
      if (foto) payload.set('foto', foto)

      const response = await fetch('/api/ruja/cadastros-pendentes', { method: 'POST', body: payload })
      const data = await response.json()
      if (!response.ok) {
        if (data.field) setErrors({ [data.field]: data.error })
        else setErrors({ form: data.error ?? 'Erro ao enviar cadastro.' })
        return
      }

      setProtocolo(data.protocolo)
      setForm(emptyForm(departamentos))
      setFoto(null)
      if (fotoPreview) URL.revokeObjectURL(fotoPreview)
      setFotoPreview('')
      setSubmissionToken('')
    } catch {
      setErrors({ form: 'Falha de conexão. Confira sua internet e tente novamente.' })
    } finally {
      setSaving(false)
    }
  }

  if (protocolo) {
    return (
      <main className="min-h-dvh bg-[#0A0A0A] text-white px-4 py-10 flex items-center">
        <section className="max-w-md mx-auto w-full text-center">
          <img src="/ruja-logo.png" alt="RUJA" className="w-16 h-16 rounded-full object-contain mx-auto mb-5" />
          <h1 className="font-black text-2xl mb-2">Cadastro enviado</h1>
          <p className="text-gray-400 text-sm mb-6">A liderança do departamento vai analisar seus dados antes de criar o cadastro de jovem.</p>
          <div className="border border-green-500/25 bg-green-500/10 rounded-xl px-5 py-4 mb-6">
            <div className="text-green-300 text-xs uppercase font-semibold mb-1">Protocolo</div>
            <div className="text-white font-mono text-xl font-bold">{protocolo}</div>
          </div>
          <button onClick={() => setProtocolo('')} className="w-full bg-white/8 hover:bg-white/12 text-white font-semibold py-3 rounded-xl">
            Enviar outro cadastro
          </button>
        </section>
      </main>
    )
  }

  return (
    <main className="min-h-dvh bg-[#0A0A0A] text-white px-4 py-7 md:py-10">
      <div className="max-w-xl mx-auto">
        <header className="flex items-center gap-3 mb-6">
          <img src="/ruja-logo.png" alt="RUJA" className="w-12 h-12 rounded-full object-contain" />
          <div>
            <h1 className="font-black text-xl">Cadastro RUJA</h1>
            <p className="text-gray-500 text-sm">Seus dados serão analisados pela liderança.</p>
          </div>
        </header>

        <form onSubmit={handleSubmit} noValidate className="bg-[#111] border border-white/10 rounded-xl p-4 md:p-6 space-y-5">
          <SectionTitle title="Dados pessoais" />
          <Field label="Nome completo" required error={errors.nome}>
            <input value={form.nome} onChange={e => update('nome', e.target.value)} className={inputClass(errors.nome)} autoComplete="name" />
          </Field>
          <div className="grid md:grid-cols-2 gap-4">
            <Field label="Data de nascimento" required error={errors.data_nascimento}>
              <input value={form.data_nascimento} onChange={e => update('data_nascimento', e.target.value)} className={inputClass(errors.data_nascimento)} type="date" />
            </Field>
            <Field label="Telefone/WhatsApp" required error={errors.telefone}>
              <input value={form.telefone} onChange={e => update('telefone', formatPhone(e.target.value))} className={inputClass(errors.telefone)} inputMode="tel" autoComplete="tel" placeholder="(21) 99999-9999" />
            </Field>
          </div>
          <Field label="Email" error={errors.email}>
            <input value={form.email} onChange={e => update('email', e.target.value)} className={inputClass(errors.email)} type="email" inputMode="email" autoComplete="email" />
          </Field>
          <Field label="Endereço">
            <input value={form.endereco} onChange={e => update('endereco', e.target.value)} className={inputClass()} autoComplete="street-address" />
          </Field>

          <SectionTitle title="Vínculo com a RUJA" />
          <Field label="Departamento" required error={errors.departamento_slug}>
            <select value={form.departamento_slug} onChange={e => update('departamento_slug', e.target.value)} className={inputClass(errors.departamento_slug)}>
              {departamentos.map(departamento => (
                <option key={departamento.id} value={departmentSlug(departamento)}>{departamento.nome}</option>
              ))}
            </select>
          </Field>
          <Field label="Congrega há quanto tempo?">
            <input value={form.tempo_ruja} onChange={e => update('tempo_ruja', e.target.value)} className={inputClass()} placeholder="Ex: 2 anos" />
          </Field>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={form.batizado} onChange={e => update('batizado', e.target.checked)} className="w-5 h-5 accent-red-600" />
            <span className="text-gray-300 text-sm">Sou batizado(a) nas águas</span>
          </label>
          {form.batizado && (
            <Field label="Data do batismo" error={errors.data_batismo}>
              <input type="date" value={form.data_batismo} onChange={e => update('data_batismo', e.target.value)} className={inputClass(errors.data_batismo)} />
            </Field>
          )}

          <SectionTitle title="Foto" />
          <div className="flex items-center gap-4">
            <button type="button" onClick={() => fileRef.current?.click()} className="w-24 h-24 border border-dashed border-white/20 rounded-xl overflow-hidden bg-black/30 text-gray-500 text-xs shrink-0">
              {fotoPreview ? <img src={fotoPreview} alt="Prévia" className="w-full h-full object-cover" /> : 'Adicionar foto'}
            </button>
            <div className="text-gray-500 text-xs leading-relaxed">JPG, PNG ou WEBP.<br />Tamanho máximo: 5 MB.</div>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={e => selectPhoto(e.target.files?.[0] ?? null)} className="hidden" />
          </div>
          {errors.foto && <ErrorText>{errors.foto}</ErrorText>}

          {menor && (
            <>
              <SectionTitle title="Responsável" subtitle="Obrigatório para menores de 18 anos" />
              <Field label="Nome do responsável" required error={errors.responsavel_nome}>
                <input value={form.responsavel_nome} onChange={e => update('responsavel_nome', e.target.value)} className={inputClass(errors.responsavel_nome)} />
              </Field>
              <Field label="Telefone do responsável" required error={errors.responsavel_telefone}>
                <input value={form.responsavel_telefone} onChange={e => update('responsavel_telefone', formatPhone(e.target.value))} className={inputClass(errors.responsavel_telefone)} inputMode="tel" />
              </Field>
              <Consent checked={form.autorizacao_responsavel} onChange={value => update('autorizacao_responsavel', value)} error={errors.autorizacao_responsavel}>
                Confirmo que o responsável autoriza este cadastro.
              </Consent>
            </>
          )}

          <Field label="Observações">
            <textarea value={form.observacoes} onChange={e => update('observacoes', e.target.value)} className={`${inputClass()} resize-none`} rows={4} maxLength={1000} />
          </Field>

          <Consent checked={form.consentimento_dados} onChange={value => update('consentimento_dados', value)} error={errors.consentimento_dados}>
            Autorizo o armazenamento destes dados para gestão interna da RUJA.
          </Consent>

          {errors.form && <div className="rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 px-4 py-3 text-sm">{errors.form}</div>}
          <button type="submit" disabled={saving} className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold py-4 rounded-xl transition min-h-14">
            {saving ? 'Enviando com segurança...' : 'Enviar cadastro'}
          </button>
        </form>
      </div>
    </main>
  )
}

function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return <div className="pt-1"><h2 className="text-white font-bold text-sm">{title}</h2>{subtitle && <p className="text-gray-500 text-xs mt-0.5">{subtitle}</p>}</div>
}

function Field({ label, required, error, children }: { label: string; required?: boolean; error?: string; children: React.ReactNode }) {
  return <label className="block"><span className="block text-xs font-semibold text-gray-400 uppercase mb-1.5">{label}{required ? ' *' : ''}</span>{children}{error && <ErrorText>{error}</ErrorText>}</label>
}

function Consent({ checked, onChange, error, children }: { checked: boolean; onChange: (value: boolean) => void; error?: string; children: React.ReactNode }) {
  return <div><label className="flex items-start gap-3 cursor-pointer"><input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="w-5 h-5 mt-0.5 accent-red-600 shrink-0" /><span className="text-gray-300 text-sm leading-relaxed">{children}</span></label>{error && <ErrorText>{error}</ErrorText>}</div>
}

function ErrorText({ children }: { children: React.ReactNode }) {
  return <p className="text-red-400 text-xs mt-1.5">{children}</p>
}

function inputClass(error?: string) {
  return `w-full bg-black/40 border rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm focus:outline-none transition ${error ? 'border-red-500/60' : 'border-white/10 focus:border-red-500/40'}`
}
