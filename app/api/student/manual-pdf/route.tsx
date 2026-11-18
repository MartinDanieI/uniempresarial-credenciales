import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import QRCode from 'qrcode';
import { ManualPdf } from '@/lib/pdf/ManualPdf';
import { QRS } from '@/lib/institucional';
import { getStudentFromSession } from '@/lib/student-data';
import { STUDENT_DEMO } from '@/lib/demo';
import { supabaseAdmin } from '@/lib/supabase';
import { getClientIp, getUbicacion, getUserAgent } from '@/lib/utils';
import type { StudentCredenciales } from '@/lib/types';


/** Genera el manual de ingreso personalizado en PDF (requiere sesión OTP vigente). */
export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const demo = process.env.NODE_ENV === 'development' && params.has('demo');
  const imprimir = params.has('imprimir');

  let student: StudentCredenciales;
  let studentId: string | null = null;
  if (demo) {
    student = STUDENT_DEMO;
  } else {
    const actual = await getStudentFromSession();
    if (!actual) {
      return NextResponse.json({ error: 'Tu sesión expiró. Vuelve a validar tu documento.' }, { status: 401 });
    }
    const { id, ...resto } = actual;
    student = resto;
    studentId = id;
  }

  const qrs = await Promise.all(
    QRS.map(async (q) => ({
      titulo: q.titulo,
      dataUrl: await QRCode.toDataURL(q.url, { margin: 1, width: 300, color: { dark: '#1f1f1f' } }),
    })),
  );

  const logo = await readFile(join(process.cwd(), 'public', 'logo-uniempresarial.png'));
  const pdf = await renderToBuffer(<ManualPdf student={student} qrs={qrs} logo={logo} />);

  if (studentId) {
    await supabaseAdmin().from('access_logs').insert({
      student_id: studentId,
      accion: imprimir ? 'impresion_pdf' : 'descarga_pdf',
      ip_address: getClientIp(req),
      ...getUbicacion(req),
      user_agent: getUserAgent(req),
    });
  }

  const nombreArchivo = `Credenciales-Uniempresarial-${student.documento_identidad}.pdf`;
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `${imprimir ? 'inline' : 'attachment'}; filename="${nombreArchivo}"`,
      'Cache-Control': 'no-store',
    },
  });
}
