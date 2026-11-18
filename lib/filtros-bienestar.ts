import 'server-only';
import { supabaseAdmin } from './supabase';
import { sanitizeSearch } from './utils';

export const COLUMNAS_TRAZABILIDAD =
  'id, fecha_registro, documento_identidad, nombre_completo, programa_academico, modalidad, correo_personal, correo_institucional, usuario_glpi, firma_recibido, estado_correo, fecha_envio_correo, fecha_ultimo_recordatorio, cantidad_recordatorios, ultimo_error_correo, ha_ingresado, fecha_primer_ingreso, fecha_ultimo_ingreso, ha_cambiado_password, lote_id, created_at, updated_at';

/** Construye la consulta de trazabilidad aplicando los filtros de la URL. */
export function consultaTrazabilidad(params: URLSearchParams, opts: { count?: boolean } = {}) {
  let query = supabaseAdmin()
    .from('students_credentials')
    .select(COLUMNAS_TRAZABILIDAD, opts.count ? { count: 'exact' } : undefined);

  const q = sanitizeSearch(params.get('q') || '');
  if (q) {
    query = query.or(
      `documento_identidad.ilike.%${q}%,nombre_completo.ilike.%${q}%,correo_institucional.ilike.%${q}%,correo_personal.ilike.%${q}%`,
    );
  }
  const programa = params.get('programa');
  if (programa) query = query.eq('programa_academico', programa);
  const modalidad = params.get('modalidad');
  if (modalidad) query = query.eq('modalidad', modalidad);
  const ingreso = params.get('ingreso');
  if (ingreso === 'si') query = query.eq('ha_ingresado', true);
  if (ingreso === 'no') query = query.eq('ha_ingresado', false);
  const estado = params.get('estado');
  if (estado) query = query.eq('estado_correo', estado);

  return query;
}
