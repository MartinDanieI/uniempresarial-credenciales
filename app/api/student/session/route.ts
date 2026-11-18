import { NextResponse } from 'next/server';
import { getStudentFromSession } from '@/lib/student-data';
import { clearStudentSession } from '@/lib/student-session';

/** Recupera las credenciales si la sesión del estudiante sigue vigente (p. ej. al recargar). */
export async function GET() {
  try {
    const student = await getStudentFromSession();
    if (!student) return NextResponse.json({ student: null });
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, ...credenciales } = student;
    return NextResponse.json({ student: credenciales });
  } catch {
    return NextResponse.json({ student: null });
  }
}

/** Cerrar sesión del estudiante. */
export async function DELETE() {
  await clearStudentSession();
  return NextResponse.json({ ok: true });
}
