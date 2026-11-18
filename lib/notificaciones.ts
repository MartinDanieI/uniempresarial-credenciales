import 'server-only';
import { supabaseAdmin } from './supabase';
import { ASUNTO_BIENVENIDA, ASUNTO_RECORDATORIO, getWelcomeEmailHtml, sendMail } from './mailer';
import { appUrl, errorMessage } from './utils';
import type { Student } from './types';

type Destinatario = Pick<
  Student,
  'id' | 'nombre_completo' | 'correo_personal' | 'estado_correo' | 'cantidad_recordatorios' | 'fecha_envio_correo'
>;

export const COLUMNAS_DESTINATARIO =
  'id, nombre_completo, correo_personal, estado_correo, cantidad_recordatorios, fecha_envio_correo';

export interface ResultadoEnvio {
  id: string;
  ok: boolean;
  error?: string;
}

/**
 * Envía el correo de bienvenida o un recordatorio y deja la trazabilidad
 * (estado, fechas, contador y registro en access_logs).
 */
export async function enviarCorreoEstudiante(
  student: Destinatario,
  tipo: 'bienvenida' | 'recordatorio',
  origen: string,
): Promise<ResultadoEnvio> {
  const db = supabaseAdmin();
  const esRecordatorio = tipo === 'recordatorio';
  const now = new Date().toISOString();

  try {
    await sendMail(
      student.correo_personal,
      esRecordatorio ? ASUNTO_RECORDATORIO : ASUNTO_BIENVENIDA,
      getWelcomeEmailHtml(student.nombre_completo, appUrl(), esRecordatorio),
    );

    const update = esRecordatorio
      ? {
          estado_correo: 'recordatorio_enviado',
          fecha_ultimo_recordatorio: now,
          cantidad_recordatorios: (student.cantidad_recordatorios ?? 0) + 1,
          fecha_envio_correo: student.fecha_envio_correo ?? now,
          ultimo_error_correo: null,
        }
      : { estado_correo: 'enviado', fecha_envio_correo: now, ultimo_error_correo: null };

    await db.from('students_credentials').update(update).eq('id', student.id);
    await db.from('access_logs').insert({
      student_id: student.id,
      accion: esRecordatorio ? 'recordatorio' : 'correo_bienvenida',
      detalle: `Enviado a ${student.correo_personal} (${origen})`,
    });
    return { id: student.id, ok: true };
  } catch (error) {
    const msg = errorMessage(error).slice(0, 500);
    await db
      .from('students_credentials')
      .update({ estado_correo: 'error', ultimo_error_correo: msg })
      .eq('id', student.id);
    return { id: student.id, ok: false, error: msg };
  }
}
