import 'server-only';
import { NextResponse } from 'next/server';
import { supabaseServer } from './supabase-server';
import { supabaseAdmin } from './supabase';
import type { RolStaff } from './types';

export interface Staff {
  userId: string;
  email: string;
  nombre: string;
  rol: RolStaff;
}

/** Devuelve el miembro del personal autenticado (o null). */
export async function getStaff(): Promise<Staff | null> {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabaseAdmin()
    .from('staff_users')
    .select('nombre, rol')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!data) return null;

  return { userId: user.id, email: user.email ?? '', nombre: data.nombre, rol: data.rol as RolStaff };
}

/**
 * Para rutas API: valida sesión y rol. `admin` tiene acceso a todo.
 * Uso: const auth = await requireStaff(['ti']); if (auth instanceof NextResponse) return auth;
 */
export async function requireStaff(roles: RolStaff[]): Promise<Staff | NextResponse> {
  const staff = await getStaff();
  if (!staff) {
    return NextResponse.json({ error: 'Sesión no válida. Inicia sesión de nuevo.' }, { status: 401 });
  }
  if (staff.rol !== 'admin' && !roles.includes(staff.rol)) {
    return NextResponse.json({ error: 'No tienes permiso para esta acción.' }, { status: 403 });
  }
  return staff;
}
