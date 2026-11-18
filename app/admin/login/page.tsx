import { Suspense } from 'react';
import { Marca } from '@/components/Marca';
import { FormLogin } from '@/components/admin/FormLogin';

export const metadata = { title: 'Ingreso personal · Uniempresarial' };

export default function LoginPage() {
  return (
    <>
      <Marca subtitulo="Panel administrativo de credenciales" />
      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <div className="w-full max-w-sm rounded-xl border border-linea bg-superficie p-8">
          <p className="rotulo text-[11px] text-ue">Acceso restringido</p>
          <h1 className="titulo text-azul-hondo mt-3 text-2xl">Ingreso del personal</h1>
          <p className="mt-2 text-sm text-gris">Tecnología (TI) y Bienestar Universitario.</p>
          <Suspense>
            <FormLogin />
          </Suspense>
        </div>
      </main>
    </>
  );
}
