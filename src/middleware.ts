import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name) => request.cookies.get(name)?.value,
        set: (name, value, options) => {
          response.cookies.set({ name, value, ...options });
        },
        remove: (name, options) => {
          response.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  const publicPaths = ['/login', '/_next', '/favicon.ico'];
  const isPublic = publicPaths.some(p => request.nextUrl.pathname.startsWith(p));

  if (!user && !isPublic) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (user && request.nextUrl.pathname === '/login') {
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('rol')
      .eq('user_id', user.id)
      .maybeSingle();

    if (roleData?.rol === 'profesional') {
      return NextResponse.redirect(new URL('/asistencia', request.url));
    }
    return NextResponse.redirect(new URL('/', request.url));
  }

  if (user && !isPublic) {
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('rol')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!roleData?.rol) {
      await supabase.auth.signOut();
      return NextResponse.redirect(new URL('/login', request.url));
    }

    if (roleData.rol === 'profesional' && request.nextUrl.pathname !== '/asistencia') {
      return NextResponse.redirect(new URL('/asistencia', request.url));
    }
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
