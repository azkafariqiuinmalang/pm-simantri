import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient(options: { signal?: AbortSignal } = {}) {
  const cookieStore = await cookies()
  const signal = options.signal

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      // A caller may bound its whole operation (Auth and database included).
      // Other callers retain the default Supabase fetch behavior.
      ...(signal ? {
        global: {
          fetch: (input: RequestInfo | URL, init?: RequestInit) => fetch(input, {
            ...init,
            signal: AbortSignal.any([
              signal,
              ...(init?.signal ? [init.signal] : []),
              ...(input instanceof Request ? [input.signal] : []),
            ]),
          }),
        },
      } : {}),
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing user sessions.
          }
        },
      },
    }
  )
}
