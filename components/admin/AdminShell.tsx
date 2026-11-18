import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getStaff, type Staff } from '@/lib/auth';
import type { RolStaff } from '@/lib/types';
import { Marca } from '../Marca';
import { BotonSalir } from './BotonSalir';

const NAV: { href: string; texto: string; roles: RolStaff[] }[] = [
  { href: '/admin/ti', texto: 'Tecnología (TI)', roles: ['ti'] },
  { href: '/admin/bienestar', texto: 'Bienestar', roles: ['bienestar'] },
];

const puede = (staff: Staff, roles: RolStaff[]) => staff.rol === 'admin' || roles.includes(staff.rol);

/** Marco de los paneles: valida sesión y rol en el servidor antes de renderizar. */
export async function AdminShell({
  roles,
  actual,
  children,
}: {
  roles: RolStaff[];
  actual: string;
  children: React.ReactNode;
}) {
  const staff = await getStaff();
  if (!staff) redirect(`/admin/login?next=${actual}`);

  return (
    <>
      <Marca subtitulo="Panel administrativo de credenciales">
        <div className="flex items-center gap-3 text-sm">
          <span className="hidden text-gris sm:inline">
            {staff.nombre} · <span className="rotulo text-[11px] text-ue">{staff.rol}</span>
          </span>
          <BotonSalir />
        </div>
      </Marca>
      <nav className="border-b border-linea bg-white">
        <div className="flex gap-2 px-4 sm:px-8">
          {NAV.filter((n) => puede(staff, n.roles)).map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={`font-poppins border-b-2 px-3 py-3 text-sm font-medium ${
                actual === n.href ? 'border-azul text-azul' : 'border-transparent text-gris hover:text-azul'
              }`}
            >
              {n.texto}
            </Link>
          ))}
        </div>
      </nav>
      <main className="w-full flex-1 px-4 py-10 sm:px-8">
        {puede(staff, roles) ? (
          children
        ) : (
          <div className="rounded-xl border border-linea bg-superficie p-8 text-center">
            <p className="font-medium">No tienes permiso para ver este panel.</p>
            <p className="mt-1 text-sm text-gris">Pide a un administrador que te asigne el rol correspondiente.</p>
          </div>
        )}
      </main>
    </>
  );
}
