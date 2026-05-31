import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const sb = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll()  { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await sb.auth.getUser()

  // Redirecionar para login se não autenticado e tentar acessar /ruja
  if (!user && request.nextUrl.pathname.startsWith('/ruja')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Redirecionar para app se já autenticado e tentando acessar login
  if (user && request.nextUrl.pathname === '/login') {
    return NextResponse.redirect(new URL('/ruja', request.url))
  }

  // Redirecionar raiz para /ruja ou /login
  if (request.nextUrl.pathname === '/') {
    return NextResponse.redirect(new URL(user ? '/ruja' : '/login', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/', '/login', '/ruja/:path*'],
}
