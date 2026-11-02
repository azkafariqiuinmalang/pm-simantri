import { createClient } from '@/lib/supabase/server'

function redirectWithinApp(path: '/dashboard' | '/login?reason=confirmation') {
  // Relative Location preserves the browser origin behind a proxy, including
  // 127.0.0.1 versus localhost, without trusting forwarded-host input.
  return new Response(null, {
    status: 303,
    headers: { Location: path, 'Cache-Control': 'private, no-store' },
  })
}

// Email confirmations return a one-time PKCE code. Keep the destination fixed
// so a supplied `next` parameter cannot redirect a session to another site.
export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')

  if (code && !url.searchParams.has('error')) {
    try {
      const supabase = await createClient()
      const { error } = await supabase.auth.exchangeCodeForSession(code)
      if (!error) {
        return redirectWithinApp('/dashboard')
      }
    } catch {
      // Do not expose confirmation codes, tokens or provider errors in URLs.
    }
  }

  return redirectWithinApp('/login?reason=confirmation')
}
