import { NextResponse, type NextRequest } from 'next/server'

// Proxy minimalista — sem Supabase no Edge Runtime
// Auth verificada no Server Component (src/app/ruja/page.tsx)
export async function proxy(request: NextRequest) {
  return NextResponse.next({ request })
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
