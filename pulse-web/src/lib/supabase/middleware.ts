import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Public routes that don't need auth
  const publicRoutes = ['/landing', '/login', '/signup', '/auth'];
  const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route));
  const isApiRoute = pathname.startsWith('/api');
  const isStaticAsset = pathname.startsWith('/_next') || pathname.includes('.');

  // Skip protection for public routes, API routes, and static assets
  if (isPublicRoute || isApiRoute || isStaticAsset) {
    return supabaseResponse;
  }

  // Root route: redirect based on auth state
  if (pathname === '/') {
    if (user) {
      const url = request.nextUrl.clone();
      url.pathname = '/dashboard';
      return NextResponse.redirect(url);
    } else {
      const url = request.nextUrl.clone();
      url.pathname = '/landing';
      return NextResponse.redirect(url);
    }
  }

  // Protected routes: redirect to login if not authenticated
  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
