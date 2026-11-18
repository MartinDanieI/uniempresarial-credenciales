import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getStudentFromSession } from '@/lib/student-data';
import { graphConfigurado, resetUserPassword } from '@/lib/microsoft-graph';
import { generatePassword, getClientIp, getUbicacion, getUserAgent } from '@/lib/utils';

const MAX_CAMBIOS_DIA = 3;

/**
 * El estudiante (con sesión OTP vigente) solicita una contraseña temporal nueva.
 * Se restablece en Microsoft 365 vía Graph (passwordProfile) y se refleja en el portal.
 */
export async function POST(req: Request) {
  try {
    const student = await getStudentFromSession();
    if (!student) {
      return NextResponse.json(
        { error: 'Tu sesión expiró. Vuelve a ingresar con tu documento y el código de verificación.' },
        { status: 401 },
      );
    }

    if (!graphConfigurado()) {
      return NextResponse.json(
        {
          error:
            'El restablecimiento automático aún no está habilitado. Solicítalo en la Mesa de Servicios GLPI o escribe a bienestar@uniempresarial.edu.co.',
        },
        { status: 503 },
      );
    }

    const db = supabaseAdmin();
    const { count } = await db
      .from('access_logs')
      .select('id', { count: 'exact', head: true })
      .eq('student_id', student.id)
      .eq('accion', 'cambio_password')
      .gte('created_at', new Date(Date.now() - 24 * 3600_000).toISOString());
    if ((count ?? 0) >= MAX_CAMBIOS_DIA) {
      return NextResponse.json(
        { error: 'Alcanzaste el límite de restablecimientos por hoy. Comunícate con la Mesa de Servicios.' },
        { status: 429 },
      );
    }

    const nuevaPassword = generatePassword(12);
    // El estudiante deberá definir su propia contraseña al iniciar sesión en Office.
    await resetUserPassword(student.correo_institucional, nuevaPassword, true);

    await db
      .from('students_credentials')
      .update({ password_inicial: nuevaPassword, ha_cambiado_password: true })
      .eq('id', student.id);

    await db.from('access_logs').insert({
      student_id: student.id,
      accion: 'cambio_password',
      ip_address: getClientIp(req),
      ...getUbicacion(req),
      user_agent: getUserAgent(req),
      detalle: 'Contraseña temporal restablecida vía Microsoft Graph',
    });

    return NextResponse.json({ password: nuevaPassword });
  } catch (error) {
    console.error('[change-password]', error);
    return NextResponse.json(
      {
        error:
          'No fue posible restablecer la contraseña automáticamente. Solicítalo en la Mesa de Servicios GLPI.',

      },
      { status: 502 },
    );
  }
}
