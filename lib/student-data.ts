import 'server-only';
import { supabaseAdmin } from './supabase';
import { getStudentSession } from './student-session';
import type { StudentCredenciales } from './types';

export const COLUMNAS_CREDENCIALES =
  'documento_identidad, nombre_completo, programa_academico, modalidad, correo_institucional, usuario_glpi, password_inicial';

/** Estudiante de la sesión actual (cookie firmada tras el OTP) o null. */
export async function getStudentFromSession(): Promise<(StudentCredenciales & { id: string }) | null> {
  const id = await getStudentSession();
  if (!id) return null;
  const { data } = await supabaseAdmin()
    .from('students_credentials')
    .select(`id, ${COLUMNAS_CREDENCIALES}`)
    .eq('id', id)
    .maybeSingle();
  return (data as (StudentCredenciales & { id: string }) | null) ?? null;
}
