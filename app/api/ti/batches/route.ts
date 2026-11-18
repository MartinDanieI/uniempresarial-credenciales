import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireStaff } from '@/lib/auth';
import { errorMessage } from '@/lib/utils';

/** Lotes cargados recientemente. */
export async function GET() {
  const auth = await requireStaff(['ti']);
  if (auth instanceof NextResponse) return auth;

  try {
    const { data, error } = await supabaseAdmin()
      .from('upload_batches')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(25);
    if (error) throw error;
    return NextResponse.json({ lotes: data });
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error) }, { status: 500 });
  }
}
