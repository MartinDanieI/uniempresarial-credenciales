import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireStaff } from '@/lib/auth';
import { parseExcel, type StudentInput } from '@/lib/excel';
import { errorMessage } from '@/lib/utils';

const MAX_BYTES = 10 * 1024 * 1024;
const CHUNK = 500;

/**
 * Carga masiva desde Excel.
 *  modo=previsualizar → valida y devuelve el resultado sin escribir nada.
 *  modo=confirmar     → crea el lote y hace upsert de las filas válidas.
 * El seguimiento de Bienestar (estado de correo, ingresos) de estudiantes ya
 * existentes no se modifica: solo se actualizan sus datos y credenciales.
 */
export async function POST(req: Request) {
  const auth = await requireStaff(['ti']);
  if (auth instanceof NextResponse) return auth;

  try {
    const formData = await req.formData();
    const file = formData.get('file');
    const modo = formData.get('modo') === 'confirmar' ? 'confirmar' : 'previsualizar';

    if (!(file instanceof File)) return NextResponse.json({ error: 'Archivo no encontrado' }, { status: 400 });
    if (!/\.(xlsx|xls|csv)$/i.test(file.name)) {
      return NextResponse.json({ error: 'Formato no soportado. Usa .xlsx, .xls o .csv' }, { status: 400 });
    }
    if (file.size > MAX_BYTES) return NextResponse.json({ error: 'El archivo supera 10 MB' }, { status: 400 });

    const resultado = parseExcel(await file.arrayBuffer());
    const db = supabaseAdmin();

    // Cruce con la base: quién ya existe y conflictos de correo institucional
    const documentos = resultado.validas.map((v) => v.documento_identidad);
    const correos = resultado.validas.map((v) => v.correo_institucional);
    const existentes = new Set<string>();
    const duenoCorreo = new Map<string, string>();

    for (let i = 0; i < documentos.length; i += CHUNK) {
      const { data, error } = await db
        .from('students_credentials')
        .select('documento_identidad')
        .in('documento_identidad', documentos.slice(i, i + CHUNK));
      if (error) throw error;
      data.forEach((d) => existentes.add(d.documento_identidad));
    }
    for (let i = 0; i < correos.length; i += CHUNK) {
      const { data, error } = await db
        .from('students_credentials')
        .select('documento_identidad, correo_institucional')
        .in('correo_institucional', correos.slice(i, i + CHUNK));
      if (error) throw error;
      data.forEach((d) => duenoCorreo.set(d.correo_institucional, d.documento_identidad));
    }

    const conflictos = new Set<string>();
    for (const fila of resultado.filas) {
      const { documento_identidad: doc, correo_institucional: correo } = fila.datos;
      if (correo && doc && duenoCorreo.has(correo) && duenoCorreo.get(correo) !== doc) {
        fila.errores.push(`El correo ${correo} ya pertenece al documento ${duenoCorreo.get(correo)}`);
        conflictos.add(doc);
      }
    }
    const aCargar: StudentInput[] = resultado.validas.filter((v) => !conflictos.has(v.documento_identidad));

    const resumen = {
      hoja: resultado.hoja,
      nombreArchivo: file.name,
      columnasArchivo: resultado.columnasArchivo,
      mapeo: resultado.mapeo,
      totalFilas: resultado.filas.length,
      validas: aCargar.length,
      nuevos: aCargar.filter((v) => !existentes.has(v.documento_identidad)).length,
      actualizar: aCargar.filter((v) => existentes.has(v.documento_identidad)).length,
      conErrores: resultado.filas.filter((f) => f.errores.length).length,
      filas: resultado.filas.map((f) => ({
        fila: f.fila,
        errores: f.errores,
        existe: existentes.has(f.datos.documento_identidad ?? ''),
        datos: { ...f.datos, password_inicial: f.datos.password_inicial ? '••••••' : '' },
      })),
    };

    if (modo === 'previsualizar') return NextResponse.json(resumen);

    if (!aCargar.length) {
      return NextResponse.json({ error: 'No hay filas válidas para cargar.', ...resumen }, { status: 400 });
    }

    const { data: lote, error: loteError } = await db
      .from('upload_batches')
      .insert({
        nombre_archivo: file.name,
        total_filas: resultado.filas.length,
        insertados: resumen.nuevos,
        actualizados: resumen.actualizar,
        cargado_por: auth.nombre || auth.email,
      })
      .select('id')
      .single();
    if (loteError) throw loteError;

    let procesados = 0;
    for (let i = 0; i < aCargar.length; i += CHUNK) {
      const payload = aCargar.slice(i, i + CHUNK).map((v) => ({ ...v, lote_id: lote.id }));
      const { data, error } = await db
        .from('students_credentials')
        .upsert(payload, { onConflict: 'documento_identidad' })
        .select('id');
      if (error) throw error;
      procesados += data.length;
    }

    return NextResponse.json({ ...resumen, loteId: lote.id, procesados });
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error) }, { status: 500 });
  }
}
