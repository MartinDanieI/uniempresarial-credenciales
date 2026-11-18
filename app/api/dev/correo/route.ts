import { NextResponse } from 'next/server';
import { getOtpEmailHtml, getWelcomeEmailHtml } from '@/lib/mailer';
import { appUrl } from '@/lib/utils';

/** Vista previa de las plantillas de correo. Solo existe en desarrollo. */
export function GET(req: Request) {
  if (process.env.NODE_ENV !== 'development') return new NextResponse('No encontrado', { status: 404 });
  const tipo = new URL(req.url).searchParams.get('tipo');
  const html =
    tipo === 'otp'
      ? getOtpEmailHtml('Laura Gómez', '482913', 10)
      : getWelcomeEmailHtml('Laura Gómez', appUrl(), tipo === 'recordatorio');
  return new NextResponse(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}
