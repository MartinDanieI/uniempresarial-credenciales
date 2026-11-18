import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireStaff } from '@/lib/auth';

/** Historial exacto de accesos y envíos de un estudiante (para atender reclamos). */
export async function GET(_req: Request, ctx: RouteContext<'/api/bienestar/students/[id]/logs'>) {
  const auth = await requireStaff(['bienestar']);
  if (auth instanceof NextResponse) return auth;

  const { id } = await ctx.params;
  const { data, error } = await supabaseAdmin()
    .from('access_logs')
    .select('id, accion, ciudad, region, pais, user_agent, detalle, created_at')
    .eq('student_id', id)
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ logs: data });
}
