import { createClient } from '../supabase/client'

const BUCKET = process.env.NEXT_PUBLIC_FOTO_BUCKET ?? 'ruja-jovens-fotos'

export async function uploadFoto(
  jovemId: string,
  file: File
): Promise<{ path: string; url: string }> {
  const sb   = createClient()
  const ext  = file.name.split('.').pop() ?? 'jpg'
  const path = `jovens/${jovemId}/perfil.${ext}`

  // Remover foto anterior se existir
  await sb.storage.from(BUCKET).remove([path]).catch(() => {})

  const { error: upErr } = await sb.storage
    .from(BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type })
  if (upErr) throw upErr

  const { data: urlData, error: urlErr } = await sb.storage
    .from(BUCKET)
    .createSignedUrl(path, 60 * 60 * 24 * 365)
  if (urlErr) throw urlErr

  return { path, url: urlData.signedUrl }
}

export async function removeFoto(path: string): Promise<void> {
  const sb = createClient()
  await sb.storage.from(BUCKET).remove([path])
}

export async function renovarSignedUrl(path: string): Promise<string | null> {
  if (!path) return null
  const sb = createClient()
  const { data } = await sb.storage
    .from(BUCKET)
    .createSignedUrl(path, 60 * 60 * 24 * 365)
  return data?.signedUrl ?? null
}
