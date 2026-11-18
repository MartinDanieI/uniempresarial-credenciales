// Carga un Excel de admitidos directo a Supabase (misma validación que el panel TI).
// Uso: npm run cargar -- pruebas/admitidos-prueba.xlsx
import { readFileSync } from 'node:fs';
import { basename } from 'node:path';
import { parseExcel } from '../lib/excel';
import { supabaseAdmin } from '../lib/supabase';

async function main() {
  const ruta = process.argv[2];
  if (!ruta) throw new Error('Indica el archivo: npm run cargar -- ruta/al/archivo.xlsx');

  const buf = readFileSync(ruta);
  const r = parseExcel(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer);
  const conError = r.filas.filter((f) => f.errores.length);
  conError.forEach((f) => console.warn(`  fila ${f.fila}: ${f.errores.join(' · ')}`));
  if (!r.validas.length) throw new Error('No hay filas válidas.');

  const db = supabaseAdmin();
  const { data: existentes, error: e1 } = await db
    .from('students_credentials')
    .select('documento_identidad')
    .in('documento_identidad', r.validas.map((v) => v.documento_identidad));
  if (e1) throw e1;
  const ya = new Set(existentes.map((x) => x.documento_identidad));

  const { data: lote, error: e2 } = await db
    .from('upload_batches')
    .insert({
      nombre_archivo: basename(ruta),
      total_filas: r.filas.length,
      insertados: r.validas.filter((v) => !ya.has(v.documento_identidad)).length,
      actualizados: r.validas.filter((v) => ya.has(v.documento_identidad)).length,
      cargado_por: 'script cargar-excel',
    })
    .select('id')
    .single();
  if (e2) throw e2;

  const { data, error } = await db
    .from('students_credentials')
    .upsert(r.validas.map((v) => ({ ...v, lote_id: lote.id })), { onConflict: 'documento_identidad' })
    .select('documento_identidad, usuario_glpi');
  if (error) throw error;

  console.log(`✓ ${data.length} estudiantes cargados (${conError.length} filas con error omitidas). Lote ${lote.id}`);
}

main().catch((e) => {
  console.error('✗', e.message ?? e);
  process.exit(1);
});
