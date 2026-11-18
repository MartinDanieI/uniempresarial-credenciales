import 'server-only';
import * as XLSX from 'xlsx';
import { z } from 'zod';
import { DOMINIO_INSTITUCIONAL } from './institucional';
import { normalizeDocumento } from './utils';

/**
 * Encabezados aceptados (se normalizan: mayúsculas, sin tildes, espacios → _).
 * El primero de cada lista es el de la plantilla oficial "PLANTILLA PLATAFORMA.xlsx":
 * FECHA · NOMBRE · DOCUMENTO · CORREO PERSONAL · PROGRAMA · Usuario Ue ·
 * USUARIO CORREO UE · CONTRASEÑA CORREO UE · FIRMA RECIBIDO
 */
const ALIAS: Record<string, string[]> = {
  fecha_registro: ['FECHA', 'FECHA_REGISTRO', 'FECHA_CREACION'],
  nombre_completo: ['NOMBRE', 'NOMBRE_COMPLETO', 'NOMBRES_Y_APELLIDOS', 'ESTUDIANTE'],
  documento_identidad: ['DOCUMENTO', 'CEDULA', 'DOCUMENTO_IDENTIDAD', 'NUMERO_DOCUMENTO', 'CC', 'IDENTIFICACION'],
  correo_personal: ['CORREO_PERSONAL', 'EMAIL_PERSONAL', 'CORREO', 'EMAIL'],
  programa_academico: ['PROGRAMA', 'PROGRAMA_ACADEMICO', 'CARRERA'],
  usuario_ue: ['USUARIO_UE', 'USUARIO_GLPI', 'USUARIO'],
  correo_institucional: ['USUARIO_CORREO_UE', 'CORREO_INSTITUCIONAL', 'CORREO_UE', 'USUARIO_CORREO'],
  password_inicial: ['CONTRASENA_CORREO_UE', 'CONTRASENA', 'PASSWORD', 'CLAVE', 'PASSWORD_INICIAL'],
  firma_recibido: ['FIRMA_RECIBIDO', 'FIRMA', 'RECIBIDO'],
  modalidad: ['MODALIDAD', 'JORNADA'],
};

/** Encabezados de la plantilla oficial, en su orden. */
export const ENCABEZADOS_PLANTILLA = [
  'FECHA',
  'NOMBRE',
  'DOCUMENTO',
  'CORREO PERSONAL',
  'PROGRAMA',
  'Usuario Ue',
  'USUARIO CORREO UE',
  'CONTRASEÑA  CORREO UE',
  'FIRMA RECIBIDO',
] as const;

export const CAMPOS_REQUERIDOS = [
  'documento_identidad',
  'nombre_completo',
  'programa_academico',
  'correo_personal',
  'correo_institucional',
  'password_inicial',
] as const;

export const studentSchema = z.object({
  documento_identidad: z.string().regex(/^[A-Za-z0-9]{4,30}$/, 'Documento inválido'),
  nombre_completo: z.string().min(3, 'Nombre requerido').max(200),
  programa_academico: z.string().min(2, 'Programa requerido').max(200),
  modalidad: z.string().min(2).max(50).default('Presencial'),
  correo_personal: z.email('Correo personal inválido'),
  correo_institucional: z
    .email('Correo institucional inválido')
    .refine((v) => v.endsWith(DOMINIO_INSTITUCIONAL), `Debe terminar en ${DOMINIO_INSTITUCIONAL}`),
  password_inicial: z.string().min(6, 'Contraseña muy corta').max(128),
  fecha_registro: z.iso.date('Fecha inválida (usa día/mes/año)').optional(),
  firma_recibido: z.string().max(200).optional(),
});

export type StudentInput = z.infer<typeof studentSchema>;

/** Datos de una fila tal como vienen del Excel (incluye "Usuario Ue", que solo se usa para verificar). */
export type FilaDatos = Partial<Record<keyof StudentInput | 'usuario_ue', string>>;

export interface FilaPrevia {
  fila: number; // número de fila en Excel (1 = encabezado)
  datos: FilaDatos;
  errores: string[];
}

export interface ResultadoExcel {
  hoja: string;
  columnasArchivo: string[];
  mapeo: Record<string, string | null>; // campo → encabezado encontrado
  filas: FilaPrevia[];
  validas: StudentInput[];
}

const normalizarEncabezado = (h: string) =>
  h
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[«»"]/g, '')
    .trim()
    .toUpperCase()
    .replace(/[\s.\-]+/g, '_');

const dos = (n: number) => String(n).padStart(2, '0');

/**
 * Convierte la FECHA del Excel a AAAA-MM-DD. Acepta celdas de fecha de Excel
 * (número de serie) y texto día/mes/año (formato colombiano) o AAAA-MM-DD.
 * Devuelve undefined si está vacía y el texto original si no se reconoce (lo marca el validador).
 */
export function fechaISO(v: unknown): string | undefined {
  if (v === undefined || v === null || v === '') return undefined;
  if (typeof v === 'number' && v > 20000 && v < 80000) {
    const d = XLSX.SSF.parse_date_code(v);
    return `${d.y}-${dos(d.m)}-${dos(d.d)}`;
  }
  const t = String(v).trim();
  if (!t) return undefined;
  let m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return `${m[1]}-${dos(+m[2])}-${dos(+m[3])}`;
  m = t.match(/^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{2,4})$/);
  if (m) {
    const anio = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
    return `${anio}-${dos(+m[2])}-${dos(+m[1])}`;
  }
  return t;
}

export function limpiarFila(raw: Record<string, unknown>): FilaDatos {
  const s = (v: unknown) => (v === undefined || v === null ? '' : String(v).trim());
  const firma = s(raw.firma_recibido);
  const usuario = s(raw.usuario_ue).replace(/@.*$/, '').toLowerCase();
  return {
    fecha_registro: fechaISO(raw.fecha_registro),
    documento_identidad: normalizeDocumento(raw.documento_identidad),
    nombre_completo: s(raw.nombre_completo).replace(/\s+/g, ' '),
    programa_academico: s(raw.programa_academico).replace(/\s+/g, ' '),
    modalidad: s(raw.modalidad) || 'Presencial',
    correo_personal: s(raw.correo_personal).toLowerCase(),
    correo_institucional: s(raw.correo_institucional).toLowerCase(),
    password_inicial: s(raw.password_inicial),
    ...(usuario ? { usuario_ue: usuario } : {}),
    ...(firma ? { firma_recibido: firma } : {}),
  };
}

export function parseExcel(buffer: ArrayBuffer): ResultadoExcel {
  const workbook = XLSX.read(buffer, { type: 'array' });
  const hoja = workbook.SheetNames[0];
  if (!hoja) throw new Error('El archivo no tiene hojas.');
  const sheet = workbook.Sheets[hoja];
  // raw: true conserva las fechas como número de serie y las cédulas sin formato de miles
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '', raw: true });

  // Encabezados desde la primera fila de la hoja (así se reconocen aunque la plantilla venga sin estudiantes)
  const primera = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, range: 0, defval: '' })[0] ?? [];
  const columnasArchivo = primera.map((c) => String(c)).filter((c) => c.trim());
  const porNormalizado = new Map(columnasArchivo.map((c) => [normalizarEncabezado(c), c]));

  const mapeo: Record<string, string | null> = {};
  for (const [campo, alias] of Object.entries(ALIAS)) {
    mapeo[campo] = alias.map((a) => porNormalizado.get(a)).find(Boolean) ?? null;
  }

  const faltantes = CAMPOS_REQUERIDOS.filter((c) => !mapeo[c]);
  if (rows.length && faltantes.length) {
    throw new Error(
      `Faltan columnas obligatorias: ${faltantes.join(', ')}. Columnas encontradas: ${columnasArchivo.join(', ')}`,
    );
  }

  const vistos = new Map<string, number>();
  const correosVistos = new Map<string, number>();
  const filas: FilaPrevia[] = [];
  const validas: StudentInput[] = [];

  rows.forEach((row, i) => {
    const fila = i + 2;
    const raw: Record<string, unknown> = {};
    for (const [campo, col] of Object.entries(mapeo)) if (col) raw[campo] = row[col];
    const datos = limpiarFila(raw);

    // Filas sin datos de estudiante (la plantilla trae cientos vacías, a veces solo con la fecha) se ignoran
    const conDatos = Object.entries(datos).some(([k, v]) => v && k !== 'fecha_registro' && k !== 'modalidad');
    if (!conDatos) return;

    const errores: string[] = [];
    const parsed = studentSchema.safeParse(datos);
    if (!parsed.success) errores.push(...parsed.error.issues.map((e) => `${String(e.path[0])}: ${e.message}`));

    // "Usuario Ue" debe ser lo que va antes de la @ del correo institucional (así lo calcula el sistema)
    const esperado = datos.correo_institucional?.split('@')[0];
    if (datos.usuario_ue && esperado && datos.usuario_ue !== esperado) {
      errores.push(`Usuario Ue "${datos.usuario_ue}" no coincide con el correo (debería ser "${esperado}")`);
    }

    if (datos.documento_identidad) {
      const previa = vistos.get(datos.documento_identidad);
      if (previa) errores.push(`Documento duplicado (también en fila ${previa})`);
      else vistos.set(datos.documento_identidad, fila);
    }
    if (datos.correo_institucional) {
      const previa = correosVistos.get(datos.correo_institucional);
      if (previa) errores.push(`Correo institucional duplicado (también en fila ${previa})`);
      else correosVistos.set(datos.correo_institucional, fila);
    }

    filas.push({ fila, datos, errores });
    if (!errores.length && parsed.success) validas.push(parsed.data);
  });

  return { hoja, columnasArchivo, mapeo, filas, validas };
}
