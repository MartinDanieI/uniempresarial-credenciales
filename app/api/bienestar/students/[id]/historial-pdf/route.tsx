import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import { requireStaff } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { COLUMNAS_TRAZABILIDAD } from '@/lib/filtros-bienestar';
import { HistorialPdf } from '@/lib/pdf/HistorialPdf';
import { errorMessage } from '@/lib/utils';
import type { AccessLog, StudentTrazabilidad } from '@/lib/types';

/** Historial del estudiante en PDF, con el mismo diseño y colores del panel. */
export async function GET(_req: Request, ctx: RouteContext<'/api/bienestar/students/[id]/historial-pdf'>) {
  const auth = await requireStaff(['bienestar']);
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await ctx.params;
    const db = supabaseAdmin();
    const [est, reg] = await Promise.all([
      db.from('students_credentials').select(COLUMNAS_TRAZABILIDAD).eq('id', id).maybeSingle(),
      db
        .from('access_logs')
        .select('id, accion, ciudad, region, pais, user_agent, detalle, created_at')
        .eq('student_id', id)
        .order('created_at', { ascending: false })
        .limit(500),
    ]);
    if (est.error) throw est.error;
    if (reg.error) throw reg.error;
    if (!est.data) return NextResponse.json({ error: 'Estudiante no encontrado' }, { status: 404 });

    const student = est.data as unknown as StudentTrazabilidad;
    const logo = await readFile(join(process.cwd(), 'public', 'logo-uniempresarial.png'));
    const pdf = await renderToBuffer(
      <HistorialPdf student={student} logs={reg.data as AccessLog[]} logo={logo} generadoPor={auth.nombre || auth.email} />,
    );

    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Historial-${student.documento_identidad}.pdf"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error) }, { status: 500 });
  }
}
