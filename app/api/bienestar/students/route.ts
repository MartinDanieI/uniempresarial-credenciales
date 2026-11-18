import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireStaff } from '@/lib/auth';
import { consultaTrazabilidad } from '@/lib/filtros-bienestar';
import { errorMessage } from '@/lib/utils';

const ORDENES = ['nombre_completo', 'documento_identidad', 'fecha_primer_ingreso', 'fecha_ultimo_ingreso', 'created_at'];

/** Tabla de trazabilidad paginada + KPIs y catálogos para filtros. */
export async function GET(req: Request) {
  const auth = await requireStaff(['bienestar']);
  if (auth instanceof NextResponse) return auth;

  try {
    const params = new URL(req.url).searchParams;
    const page = Math.max(1, Number(params.get('page')) || 1);
    const pageSize = Math.min(100, Math.max(10, Number(params.get('pageSize')) || 25));
    const orden = ORDENES.includes(params.get('orden') || '') ? params.get('orden')! : 'created_at';
    const asc = params.get('dir') === 'asc';

    const [lista, resumen] = await Promise.all([
      consultaTrazabilidad(params, { count: true })
        .order(orden, { ascending: asc, nullsFirst: false })
        .range((page - 1) * pageSize, page * pageSize - 1),
      supabaseAdmin().rpc('bienestar_resumen'),
    ]);
    if (lista.error) throw lista.error;
    if (resumen.error) throw resumen.error;

    return NextResponse.json({
      students: lista.data,
      total: lista.count ?? 0,
      page,
      pageSize,
      resumen: resumen.data,
    });
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error) }, { status: 500 });
  }
}
