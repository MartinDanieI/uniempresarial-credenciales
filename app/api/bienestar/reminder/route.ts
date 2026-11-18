import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireStaff } from '@/lib/auth';
import { COLUMNAS_DESTINATARIO, enviarCorreoEstudiante } from '@/lib/notificaciones';
import { errorMessage } from '@/lib/utils';


/** Reenvío manual a un estudiante: bienvenida si nunca se envió, recordatorio si ya. */
export async function POST(req: Request) {
  const auth = await requireStaff(['bienestar']);
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = (await req.json()) as { id?: string };
    if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 });

    const { data: student, error } = await supabaseAdmin()
      .from('students_credentials')
      .select(COLUMNAS_DESTINATARIO)
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    if (!student) return NextResponse.json({ error: 'Estudiante no encontrado' }, { status: 404 });

    const tipo = student.fecha_envio_correo ? 'recordatorio' : 'bienvenida';
    const resultado = await enviarCorreoEstudiante(student, tipo, `manual por ${auth.nombre}`);
    if (!resultado.ok) return NextResponse.json({ error: resultado.error }, { status: 502 });

    return NextResponse.json({ ok: true, tipo });
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error) }, { status: 500 });
  }
}
