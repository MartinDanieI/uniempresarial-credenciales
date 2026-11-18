import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getOtpEmailHtml, sendMail } from '@/lib/mailer';
import { generateOtp, getClientIp, hashOtp, maskEmail, normalizeDocumento } from '@/lib/utils';

const OTP_MINUTOS = 10;
const VENTANA_MIN = 15;
const MAX_POR_DOCUMENTO = 3;
const MAX_POR_IP = 10;

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as { documento_identidad?: unknown };
    const documento = normalizeDocumento(body.documento_identidad);
    if (!/^[A-Za-z0-9]{4,30}$/.test(documento)) {
      return NextResponse.json({ error: 'Ingresa un número de documento válido.' }, { status: 400 });
    }

    const db = supabaseAdmin();
    const ip = getClientIp(req);
    const desde = new Date(Date.now() - VENTANA_MIN * 60_000).toISOString();

    // Límite por IP (evita barridos de cédulas)
    const { count: porIp } = await db
      .from('otp_verifications')
      .select('id', { count: 'exact', head: true })
      .eq('ip_address', ip)
      .gte('created_at', desde);
    if ((porIp ?? 0) >= MAX_POR_IP) {
      return NextResponse.json(
        { error: `Demasiadas solicitudes desde tu conexión. Intenta de nuevo en ${VENTANA_MIN} minutos.` },
        { status: 429 },
      );
    }

    const { data: student, error } = await db
      .from('students_credentials')
      .select('documento_identidad, nombre_completo, correo_personal')
      .eq('documento_identidad', documento)
      .maybeSingle();

    if (error) throw error;
    if (!student) {
      return NextResponse.json(
        {
          error:
            'No se encontraron credenciales para este documento. Si eres admitido(a), escribe a bienestar@uniempresarial.edu.co.',
        },
        { status: 404 },
      );
    }

    // Límite por documento
    const { count: porDoc } = await db
      .from('otp_verifications')
      .select('id', { count: 'exact', head: true })
      .eq('documento_identidad', documento)
      .gte('created_at', desde);
    if ((porDoc ?? 0) >= MAX_POR_DOCUMENTO) {
      return NextResponse.json(
        {
          error: `Ya solicitaste ${MAX_POR_DOCUMENTO} códigos recientemente. Revisa tu bandeja de entrada y spam, o intenta en ${VENTANA_MIN} minutos.`,
        },
        { status: 429 },
      );
    }

    // Invalida códigos anteriores sin usar
    await db
      .from('otp_verifications')
      .update({ usado: true })
      .eq('documento_identidad', documento)
      .eq('usado', false);

    const codigo = generateOtp();
    const { error: insertError } = await db.from('otp_verifications').insert({
      documento_identidad: documento,
      codigo_hash: hashOtp(documento, codigo),
      ip_address: ip,
      expires_at: new Date(Date.now() + OTP_MINUTOS * 60_000).toISOString(),
    });
    if (insertError) throw insertError;

    await sendMail(
      student.correo_personal,
      'Código de verificación - Credenciales Uniempresarial',
      getOtpEmailHtml(student.nombre_completo, codigo, OTP_MINUTOS),
    );

    return NextResponse.json({
      message: 'Código enviado',
      maskedEmail: maskEmail(student.correo_personal),
      expiraEnMinutos: OTP_MINUTOS,
    });
  } catch (error) {
    console.error('[request-otp]', error);
    return NextResponse.json(
      { error: 'No pudimos enviar el código en este momento. Intenta de nuevo en unos minutos.' },
      { status: 500 },
    );
  }
}
