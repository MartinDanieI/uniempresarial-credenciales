'use client';
import { createBrowserClient } from '@supabase/ssr';

/** Cliente público (anon key) para el inicio de sesión del personal. */
export function supabaseBrowser() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
