import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { requireStaff } from '@/lib/auth';
import { consultaTrazabilidad } from '@/lib/filtros-bienestar';
import { errorMessage } from '@/lib/utils';
import type { StudentTrazabilidad } from '@/lib/types';

const fecha = (v: string | null) =>
  v ? new Date(v).toLocaleString('es-CO', { timeZone: 'America/Bogota', dateStyle: 'short', timeStyle: 'short' }) : '';
const fechaCorta = (iso: string | null) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : '');

const ESTADOS: Record<string, string> = {
  pendiente: 'Pendiente',
  enviado: 'Enviado',
  recordatorio_enviado: 'Recordatorio',
  error: 'Error',
};

/**
 * Exporta la trazabilidad filtrada a Excel con las columnas de la plantilla oficial
 * (sin la contraseña: Bienestar no la ve) y, a la derecha, las columnas de seguimiento.
 * FIRMA RECIBIDO = constancia digital: fecha y hora en que el estudiante abrió sus credenciales.
 */
export async function GET(req: Request) {
  const auth = await requireStaff(['bienestar']);
  if (auth instanceof NextResponse) return auth;

  try {
    const params = new URL(req.url).searchParams;
    const filas: StudentTrazabilidad[] = [];
    for (let desde = 0; ; desde += 1000) {
      const { data, error } = await consultaTrazabilidad(params)
        .order('nombre_completo')
        .range(desde, desde + 999);
      if (error) throw error;
      filas.push(...(data as unknown as StudentTrazabilidad[]));
      if (data.length < 1000) break;
    }

    const encabezados = [
      'FECHA',
      'NOMBRE',
      'DOCUMENTO',
      'CORREO PERSONAL',
      'PROGRAMA',
      'Usuario Ue',
      'USUARIO CORREO UE',
      'FIRMA RECIBIDO',
      'MODALIDAD',
      'ESTADO DE ENVÍO',
      'FECHA ENVÍO BIENVENIDA',
      'RECORDATORIOS',
      'ÚLTIMO ACCESO',
      'RESTABLECIÓ CONTRASEÑA',
    ];

    const datos = filas.map((s) => [
      fechaCorta(s.fecha_registro),
      s.nombre_completo,
      s.documento_identidad,
      s.correo_personal,
      s.programa_academico,
      s.usuario_glpi,
      s.correo_institucional,
      s.ha_ingresado ? `Recibido digitalmente ${fecha(s.fecha_primer_ingreso)}` : (s.firma_recibido ?? ''),
      s.modalidad,
      ESTADOS[s.estado_correo] ?? s.estado_correo,
      fecha(s.fecha_envio_correo),
      s.cantidad_recordatorios ?? 0,
      fecha(s.fecha_ultimo_ingreso),
      s.ha_cambiado_password ? 'Sí' : 'No',
    ]);

    const hoja = XLSX.utils.aoa_to_sheet([encabezados, ...datos]);
    hoja['!cols'] = [12, 34, 14, 32, 34, 18, 36, 34, 16, 16, 20, 14, 20, 12].map((wch) => ({ wch }));
    hoja['!autofilter'] = { ref: `A1:N${datos.length + 1}` };
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, 'Trazabilidad');
    const archivo = XLSX.write(libro, { type: 'buffer', bookType: 'xlsx' }) as Buffer;

    const hoy = new Date().toISOString().slice(0, 10);
    return new NextResponse(new Uint8Array(archivo), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="trazabilidad-credenciales-${hoy}.xlsx"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error) }, { status: 500 });
  }
}
