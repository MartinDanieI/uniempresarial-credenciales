import { createHash, randomInt } from 'node:crypto';

export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function maskEmail(email: string): string {
  const [user, domain] = email.split('@');
  if (!domain) return '***';
  return `${user.slice(0, 2)}***@${domain}`;
}

export function getClientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return req.headers.get('x-real-ip') || 'desconocida';
}

/**
 * Ciudad, región y país desde donde llega la petición. Vercel los calcula a partir de la IP
 * (encabezados x-vercel-ip-*); en local no existen y quedan en null. Con VPN se ve el país de la VPN.
 */
export function getUbicacion(req: Request): { ciudad: string | null; region: string | null; pais: string | null } {
  const leer = (h: string) => {
    const v = req.headers.get(h);
    if (!v) return null;
    try {
      return decodeURIComponent(v).slice(0, 80);
    } catch {
      return v.slice(0, 80);
    }
  };
  return {
    ciudad: leer('x-vercel-ip-city'),
    region: leer('x-vercel-ip-country-region'),
    pais: leer('x-vercel-ip-country'),
  };
}

export function getUserAgent(req: Request): string {
  return (req.headers.get('user-agent') || 'desconocido').slice(0, 400);
}

/** Código OTP de 6 dígitos con generador criptográfico. */
export function generateOtp(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, '0');
}

export function hashOtp(documento: string, codigo: string): string {
  const pepper = process.env.OTP_PEPPER || process.env.STUDENT_SESSION_SECRET || '';
  return createHash('sha256').update(`${documento}:${codigo}:${pepper}`).digest('hex');
}

/** Contraseña temporal que cumple la complejidad de Microsoft 365 (sin caracteres ambiguos). */
export function generatePassword(length = 12): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnpqrstuvwxyz';
  const digits = '23456789';
  const symbols = '#$%*+-?!';
  const all = upper + lower + digits;
  const chars = [
    upper[randomInt(upper.length)],
    lower[randomInt(lower.length)],
    digits[randomInt(digits.length)],
    symbols[randomInt(symbols.length)],
  ];
  while (chars.length < length) chars.push(all[randomInt(all.length)]);
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}

export function normalizeDocumento(value: unknown): string {
  return String(value ?? '').replace(/[.,\s-]/g, '').trim();
}

/** Quita caracteres que romperían un filtro `or()` de PostgREST. */
export function sanitizeSearch(value: string): string {
  return value.replace(/[,()*%\\]/g, ' ').trim().slice(0, 80);
}

export function appUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '');
}

export function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object' && 'message' in error) return String((error as { message: unknown }).message);
  return 'Error inesperado';
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
