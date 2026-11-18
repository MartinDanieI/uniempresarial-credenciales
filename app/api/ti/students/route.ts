import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireStaff } from '@/lib/auth';
import { limpiarFila, studentSchema } from '@/lib/excel';
import { errorMessage, normalizeDocumento } from '@/lib/utils';

/** Busca un estudiante por documento para editarlo. */
export async function GET(req: Request) {
  const auth = await requireStaff(['ti']);
  if (auth instanceof NextResponse) return auth;

  const documento = normalizeDocumento(new URL(req.url).searchParams.get('documento'));
  if (!documento) return NextResponse.json({ error: 'Documento requerido' }, { status: 400 });

  const { data, error } = await supabaseAdmin()
    .from('students_credentials')
    .select(
      'fecha_registro, documento_identidad, nombre_completo, programa_academico, modalidad, correo_personal, correo_institucional, usuario_glpi, password_inicial, firma_recibido, estado_correo, ha_ingresado',
    )
    .eq('documento_identidad', documento)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'No existe un estudiante con ese documento' }, { status: 404 });
  return NextResponse.json({ student: data });
}

/** Crea o actualiza un estudiante individual. */
export async function POST(req: Request) {
  const auth = await requireStaff(['ti']);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = (await req.json()) as Record<string, unknown>;
    const parsed = studentSchema.safeParse(limpiarFila(body));
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((i) => `${String(i.path[0])}: ${i.message}`).join(' · ') },
        { status: 400 },
      );
    }
    const datos = parsed.data;
    const db = supabaseAdmin();

    const { data: dueno } = await db
      .from('students_credentials')
      .select('documento_identidad')
      .eq('correo_institucional', datos.correo_institucional)
      .maybeSingle();
    if (dueno && dueno.documento_identidad !== datos.documento_identidad) {
      return NextResponse.json(
        { error: `El correo institucional ya está asignado al documento ${dueno.documento_identidad}` },
        { status: 409 },
      );
    }

    const { data, error } = await db
      .from('students_credentials')
      .upsert(datos, { onConflict: 'documento_identidad' })
      .select('documento_identidad, nombre_completo, usuario_glpi')
      .single();
    if (error) throw error;

    return NextResponse.json({ student: data });
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error) }, { status: 500 });
  }
}
