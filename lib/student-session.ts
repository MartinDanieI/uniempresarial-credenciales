import 'server-only';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

/**
 * Sesión corta del estudiante tras validar el OTP. Se guarda en una cookie
 * httpOnly firmada: permite descargar el PDF y solicitar el cambio de
 * contraseña sin volver a pedir el código.
 */
export const STUDENT_COOKIE = 'ue_estudiante';
export const STUDENT_SESSION_MINUTES = 20;

function secret(): Uint8Array {
  const value = process.env.STUDENT_SESSION_SECRET;
  if (!value || value.length < 32) {
    throw new Error('STUDENT_SESSION_SECRET debe tener al menos 32 caracteres.');
  }
  return new TextEncoder().encode(value);
}

export async function createStudentSession(studentId: string): Promise<void> {
  const token = await new SignJWT({ sid: studentId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${STUDENT_SESSION_MINUTES}m`)
    .sign(secret());

  const store = await cookies();
  store.set(STUDENT_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: STUDENT_SESSION_MINUTES * 60,
  });
}

export async function getStudentSession(): Promise<string | null> {
  const store = await cookies();
  const token = store.get(STUDENT_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return typeof payload.sid === 'string' ? payload.sid : null;
  } catch {
    return null;
  }
}

export async function clearStudentSession(): Promise<void> {
  const store = await cookies();
  store.delete(STUDENT_COOKIE);
}
