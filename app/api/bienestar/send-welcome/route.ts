import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireStaff } from '@/lib/auth';
import { COLUMNAS_DESTINATARIO, enviarCorreoEstudiante } from '@/lib/notificaciones';
import { errorMessage } from '@/lib/utils';

export const maxDuration = 60;

const TANDA = 20;

/**
 * Envía el correo de bienvenida a una tanda de estudiantes en estado `pendiente`
 * (o con `error` si reintentarErrores=true). El panel llama en bucle hasta que
 * `restantes` sea 0, así ninguna petición excede el tiempo máximo del servidor.
 */
export async function POST(req: Request) {
  const auth = await requireStaff(['bienestar']);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = (await req.json().catch(() => ({}))) as { reintentarErrores?: boolean };
    const estados = body.reintentarErrores ? ['pendiente', 'error'] : ['pendiente'];
    const db = supabaseAdmin();

    const { data: tanda, error } = await db
      .from('students_credentials')
      .select(COLUMNAS_DESTINATARIO)
      .in('estado_correo', estados)
      .is('fecha_envio_correo', null)
      .order('created_at', { ascending: true })
      .limit(TANDA);
    if (error) throw error;

    const resultados = [];
    for (const student of tanda) {
      resultados.push(await enviarCorreoEstudiante(student, 'bienvenida', `masivo por ${auth.nombre}`));
    }

    const { count } = await db
      .from('students_credentials')
      .select('id', { count: 'exact', head: true })
      .eq('estado_correo', 'pendiente');

    return NextResponse.json({
      enviados: resultados.filter((r) => r.ok).length,
      errores: resultados.filter((r) => !r.ok),
      restantes: count ?? 0,
    });
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error) }, { status: 500 });
  }
}
