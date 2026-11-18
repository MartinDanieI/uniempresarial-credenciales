import { timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { COLUMNAS_DESTINATARIO, enviarCorreoEstudiante } from '@/lib/notificaciones';
import { errorMessage } from '@/lib/utils';

export const maxDuration = 60;

const HORAS = Number(process.env.REMINDER_HOURS) || 48;
const MAX_RECORDATORIOS = Number(process.env.REMINDER_MAX) || 3;
const LIMITE_POR_EJECUCION = Number(process.env.REMINDER_BATCH) || 150;

function autorizado(req: Request): boolean {
  const secreto = process.env.CRON_SECRET;
  if (!secreto) return false;
  const recibido = req.headers.get('authorization') || '';
  const esperado = `Bearer ${secreto}`;
  return recibido.length === esperado.length && timingSafeEqual(Buffer.from(recibido), Buffer.from(esperado));
}

/**
 * Recordatorios automáticos: estudiantes con `ha_ingresado = false` cuyo último
 * correo (bienvenida o recordatorio) tiene más de 48 h, hasta un máximo de
 * recordatorios. Vercel Cron lo llama con `Authorization: Bearer CRON_SECRET`
 * (ver vercel.json); cualquier otro programador puede hacer lo mismo.
 */
export async function GET(req: Request) {
  if (!autorizado(req)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  try {
    const limite = new Date(Date.now() - HORAS * 3600_000).toISOString();
    const { data: candidatos, error } = await supabaseAdmin()
      .from('students_credentials')
      .select(COLUMNAS_DESTINATARIO)
      .eq('ha_ingresado', false)
      .in('estado_correo', ['enviado', 'recordatorio_enviado'])
      .lt('cantidad_recordatorios', MAX_RECORDATORIOS)
      .or(
        `fecha_ultimo_recordatorio.lt.${limite},and(fecha_ultimo_recordatorio.is.null,fecha_envio_correo.lt.${limite})`,
      )
      .order('fecha_envio_correo', { ascending: true })
      .limit(LIMITE_POR_EJECUCION);
    if (error) throw error;

    let enviados = 0;
    const errores: { id: string; error?: string }[] = [];
    for (const student of candidatos) {
      const r = await enviarCorreoEstudiante(student, 'recordatorio', 'cron automático');
      if (r.ok) enviados++;
      else errores.push({ id: r.id, error: r.error });
    }

    return NextResponse.json({ candidatos: candidatos.length, enviados, errores, horas: HORAS });
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error) }, { status: 500 });
  }
}
