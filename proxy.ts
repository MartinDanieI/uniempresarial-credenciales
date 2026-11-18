import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

/**
 * Protege /admin/*: refresca la sesión de Supabase Auth y redirige al login
 * si no hay usuario. La validación de rol se hace en cada página y ruta API.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  const { data: { user } } = await supabase.auth.getUser();
  const enLogin = request.nextUrl.pathname.startsWith('/admin/login');

  const esApi = request.nextUrl.pathname.startsWith('/api/');

  // Las rutas API responden 401 por sí mismas (requireStaff); aquí solo se refresca la sesión.
  if (!user && !enLogin && !esApi) {
    const url = request.nextUrl.clone();
    url.pathname = '/admin/login';
    url.searchParams.set('next', request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ['/admin/:path*', '/api/ti/:path*', '/api/bienestar/:path*'],
};
