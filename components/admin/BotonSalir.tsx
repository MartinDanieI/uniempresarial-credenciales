'use client';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase-browser';

export function BotonSalir() {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={async () => {
        await supabaseBrowser().auth.signOut();
        router.replace('/admin/login');
        router.refresh();
      }}
      className="font-poppins rounded-pill border border-linea-media px-4 py-1.5 text-xs font-medium text-tinta hover:border-azul hover:text-azul"
    >
      Cerrar sesión
    </button>
  );
}
