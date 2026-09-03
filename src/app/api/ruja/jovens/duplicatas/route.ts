import { NextResponse } from 'next/server'
import { requireAdmin, RujaAccessError } from '@/lib/ruja/server-access'
import { encontrarDuplicatas, type JovemDuplicataCandidato } from '@/lib/ruja/duplicatas'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const { admin } = await requireAdmin()
    const { data, error } = await admin
      .from('ruja_jovens')
      .select('id,nome,data_nasc,contato,foto_path,foto_url,endereco,instagram,obs,departamento,lider,status,batizado')
    if (error) throw error

    const grupos = encontrarDuplicatas((data ?? []) as JovemDuplicataCandidato[])
    return NextResponse.json({ ok: true, grupos, total_jovens: data?.length ?? 0 })
  } catch (error) {
    if (error instanceof RujaAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('[jovens/duplicatas]', error)
    return NextResponse.json({ error: 'Não foi possível checar duplicatas agora.' }, { status: 500 })
  }
}
