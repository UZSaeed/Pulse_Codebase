import { createClient } from '@/lib/supabase/server';
import { NextResponse, NextRequest } from 'next/server';
import { redirect } from 'next/navigation';

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const next = request.nextUrl.searchParams.get('next') ?? '/dashboard';
  const origin = request.nextUrl.origin;

  let errorMsg = 'auth_failed';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Get the authenticated user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Upsert user into our Prisma User table
        try {
          await fetch(`${origin}/api/user/sync`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: user.id,
              email: user.email,
              name: user.user_metadata?.full_name || user.user_metadata?.name || null,
              image: user.user_metadata?.avatar_url || null,
            }),
          });
        } catch (e) {
          console.error('Failed to sync user to database:', e);
        }
      }

      const forwardedHost = request.headers.get('x-forwarded-host');
      const isLocalEnv = process.env.NODE_ENV === 'development';

      if (isLocalEnv) {
        redirect(`${origin}${next}`);
      } else if (forwardedHost) {
        redirect(`https://${forwardedHost}${next}`);
      } else {
        redirect(`${origin}${next}`);
      }
    } else {
      errorMsg = error.message;
      console.error("Auth exchange error:", error);
    }
  }

  // Auth code exchange failed — redirect to landing with error
  redirect(`${origin}/landing?error=${encodeURIComponent(errorMsg)}`);
}
