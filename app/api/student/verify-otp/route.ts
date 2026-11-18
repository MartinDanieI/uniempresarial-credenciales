import { timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { createStudentSession } from '@/lib/student-session';
import { getClientIp, getUbicacion, getUserAgent, hashOtp, normalizeDocumento } from '@/lib/utils';
import { COLUMNAS_CREDENCIALES } from '@/lib/student-data';

const MAX_INTENTOS = 5;

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as { documento_identidad?: unknown; codigo_otp?: unknown };
    const documento = normalizeDocumento(body.documento_identidad);
    const codigo = String(body.codigo_otp ?? '').replace(/\D/g, '');
    if (!documento || codigo.length !== 6) {
      return NextResponse.json({ error: 'Ingresa el código de 6 dígitos.' }, { status: 400 });
    }

    const db = supabaseAdmin();
    const { data: otp, error: otpError } = await db
      .from('otp_verifications')
      .select('id, codigo_hash, intentos')
      .eq('documento_identidad', documento)
      .eq('usado', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (otpError) throw otpError;
    if (!otp) {
      return NextResponse.json({ error: 'Código inválido o expirado. Solicita uno nuevo.' }, { status: 401 });
    }

    const esperado = Buffer.from(otp.codigo_hash, 'hex');
    const recibido = Buffer.from(hashOtp(documento, codigo), 'hex');
    const coincide = esperado.length === recibido.length && timingSafeEqual(esperado, recibido);

    if (!coincide) {
      const intentos = otp.intentos + 1;
      await db
        .from('otp_verifications')
        .update({ intentos, usado: intentos >= MAX_INTENTOS })
        .eq('id', otp.id);
      const restantes = MAX_INTENTOS - intentos;
      return NextResponse.json(
        {
          error:
            restantes > 0
              ? `Código incorrecto. Te quedan ${restantes} intento(s).`
              : 'Superaste el número de intentos. Solicita un código nuevo.',
        },
        { status: 401 },
      );
    }

    await db.from('otp_verifications').update({ usado: true }).eq('id', otp.id);

    const { data: student, error: studentError } = await db
      .from('students_credentials')
      .select(`id, fecha_primer_ingreso, ${COLUMNAS_CREDENCIALES}`)
      .eq('documento_identidad', documento)
      .single();
    if (studentError || !student) throw studentError ?? new Error('Estudiante no encontrado');

    const now = new Date().toISOString();
    await db
      .from('students_credentials')
      .update({
        ha_ingresado: true,
        fecha_primer_ingreso: student.fecha_primer_ingreso || now,
        fecha_ultimo_ingreso: now,
      })
      .eq('id', student.id);

    await db.from('access_logs').insert({
      student_id: student.id,
      accion: 'consulta_credenciales',
      ip_address: getClientIp(req),
      ...getUbicacion(req),
      user_agent: getUserAgent(req),
    });

    await createStudentSession(student.id);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, fecha_primer_ingreso, ...credenciales } = student;
    return NextResponse.json({ student: credenciales });
  } catch (error) {
    console.error('[verify-otp]', error);
    return NextResponse.json({ error: 'No pudimos validar el código.' }, { status: 500 });
  }
}
