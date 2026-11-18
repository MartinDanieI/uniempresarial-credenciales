import 'server-only';
import nodemailer, { type Transporter } from 'nodemailer';
import { sendMailGraph } from './microsoft-graph';
import { CONTACTO, LINKS } from './institucional';
import { appUrl, escapeHtml } from './utils';

/**
 * Dos formas de enviar correo:
 *  - MAIL_DRIVER=graph (recomendado): Microsoft Graph /sendMail con Mail.Send.
 *    Microsoft retiró la autenticación básica de SMTP AUTH en Exchange Online,
 *    por lo que Graph es la vía estable para buzones de Microsoft 365.
 *  - MAIL_DRIVER=smtp: nodemailer (Office 365 con SMTP AUTH habilitado, o cualquier SMTP).
 *  - MAIL_DRIVER=console: solo imprime en consola (desarrollo).
 */
type Driver = 'graph' | 'smtp' | 'console';

const driver = (): Driver => (process.env.MAIL_DRIVER as Driver) || 'smtp';
const remitente = () => process.env.MAIL_FROM || process.env.SMTP_USER || CONTACTO.bienestar;

let smtp: Transporter | null = null;
function getTransporter(): Transporter {
  if (!smtp) {
    smtp = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.office365.com',
      port: Number(process.env.SMTP_PORT) || 587,
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      pool: true,
      maxConnections: 2,
      // Office 365 limita ~30 mensajes/minuto por buzón
      rateDelta: 60_000,
      rateLimit: Number(process.env.SMTP_RATE_PER_MINUTE) || 25,
    });
  }
  return smtp;
}

export async function sendMail(to: string, subject: string, html: string): Promise<void> {
  const from = remitente();
  switch (driver()) {
    case 'graph':
      await sendMailGraph({ from, to, subject, html, replyTo: CONTACTO.bienestar });
      return;
    case 'console':
      console.log(`\n[MAIL → ${to}] ${subject}\n${html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 600)}\n`);
      return;
    default:
      await getTransporter().sendMail({
        from: `"Bienestar Uniempresarial" <${from}>`,
        to,
        subject,
        html,
        replyTo: CONTACTO.bienestar,
      });
  }
}

// ---------------------------------------------------------------------
// Plantillas (HTML de correo: tablas y estilos en línea para Gmail/Outlook)
// Diseño de uniempresarial.edu.co: logo sobre blanco, línea roja y azul,
// banda azul, botón en píldora, tarjetas con cuadro de icono y pie azul.
// ---------------------------------------------------------------------

const AZUL = '#0132af';
const AZUL_NOCHE = '#1a2340';
const AZUL_PIE = '#2f4494';
const ROJO = '#c8102e';
const TEXTO = '#22323d';
const GRIS = '#5b6883';
const FUENTE = `'Poppins','Inter','Segoe UI',Arial,sans-serif`;

/** Logo oficial: el del portal publicado o, en local, el que aloja la universidad. */
function logoUrl(): string {
  const base = appUrl();
  return base.startsWith('https://')
    ? `${base}/logo-uniempresarial.png`
    : 'https://uniempresarial.edu.co/wp-content/uploads/2026/02/UE_Lg-con-filial-CCb-y-vigiilada-Mineducacion-768x124-1.png';
}

function boton(href: string, texto: string, color = ROJO): string {
  return `
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto">
    <tr>
      <td align="center" bgcolor="${color}" style="border-radius:50px">
        <a href="${href}" target="_blank" style="display:inline-block;padding:15px 34px;font-family:${FUENTE};font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:50px">${texto}</a>
      </td>
    </tr>
  </table>`;
}

function tarjeta(sigla: string, color: string, titulo: string, texto: string): string {
  return `
  <tr>
    <td style="padding:0 0 10px 0">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #dfe3ea;border-radius:12px">
        <tr>
          <td width="44" valign="top" style="padding:16px 0 16px 16px">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
              <td width="36" height="36" align="center" valign="middle" bgcolor="${color}" style="border-radius:8px;font-family:${FUENTE};font-size:14px;font-weight:700;color:#ffffff">${sigla}</td>
            </tr></table>
          </td>
          <td valign="top" style="padding:14px 16px 14px 12px;font-family:${FUENTE}">
            <p style="margin:0;font-size:15px;font-weight:600;color:${AZUL_NOCHE}">${titulo}</p>
            <p style="margin:4px 0 0 0;font-size:13px;line-height:1.55;color:${GRIS}">${texto}</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>`;
}

function plantilla(opts: { preencabezado: string; etiqueta: string; titulo: string; bajada: string; cuerpo: string }): string {
  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta name="color-scheme" content="light" />
  <title>${opts.titulo}</title>
</head>
<body style="margin:0;padding:0;background:#f3f5f9">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0">${opts.preencabezado}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f3f5f9">
    <tr>
      <td align="center" style="padding:24px 12px">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden">
          <tr>
            <td style="padding:20px 28px 16px 28px;background:#ffffff">
              <img src="${logoUrl()}" alt="Uniempresarial · Fundación Universitaria Empresarial" width="280" style="display:block;width:280px;max-width:100%;height:auto;border:0" />
            </td>
          </tr>
          <tr><td height="3" bgcolor="${ROJO}" style="font-size:0;line-height:0">&nbsp;</td></tr>
          <tr><td height="3" bgcolor="${AZUL}" style="font-size:0;line-height:0">&nbsp;</td></tr>
          <tr>
            <td bgcolor="${AZUL}" style="padding:34px 28px 36px 28px;font-family:${FUENTE}">
              <p style="margin:0;font-size:11px;font-weight:600;letter-spacing:1.2px;text-transform:uppercase;color:#c7d3f5">${opts.etiqueta}</p>
              <h1 style="margin:10px 0 0 0;font-size:30px;line-height:1.15;font-weight:800;color:#ffffff">${opts.titulo}</h1>
              <p style="margin:12px 0 0 0;font-size:15px;line-height:1.6;color:#e3e9fb">${opts.bajada}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:30px 28px 8px 28px;font-family:${FUENTE};font-size:15px;line-height:1.65;color:${TEXTO}">
              ${opts.cuerpo}
            </td>
          </tr>
          <tr>
            <td style="padding:8px 28px 30px 28px;font-family:${FUENTE};font-size:14px;line-height:1.6;color:${TEXTO}">
              <p style="margin:0">Cordialmente,</p>
              <p style="margin:2px 0 0 0;font-weight:700;color:${AZUL_NOCHE}">Bienestar Universitario · Uniempresarial</p>
              <p style="margin:2px 0 0 0;font-size:13px"><a href="mailto:${CONTACTO.bienestar}" style="color:${AZUL};text-decoration:none">${CONTACTO.bienestar}</a></p>
            </td>
          </tr>
          <tr><td height="3" bgcolor="${ROJO}" style="font-size:0;line-height:0">&nbsp;</td></tr>
          <tr>
            <td bgcolor="${AZUL_PIE}" style="padding:22px 28px;font-family:${FUENTE};font-size:12px;line-height:1.6;color:#dfe5f7">
              <p style="margin:0;font-weight:700;color:#ffffff">${CONTACTO.institucion}</p>
              <p style="margin:6px 0 0 0">Sede principal: ${CONTACTO.sedePrincipal} · Sede Administrativa: ${CONTACTO.sedeAdministrativa}</p>
              <p style="margin:2px 0 0 0">Teléfono: ${CONTACTO.telefono} · <a href="${LINKS.web}" style="color:#ffffff;text-decoration:underline">${CONTACTO.web}</a></p>
            </td>
          </tr>
        </table>
        <p style="margin:14px 0 0 0;font-family:${FUENTE};font-size:11px;color:#8a94a8">Recibes este correo porque fuiste admitido(a) en Uniempresarial.</p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export const ASUNTO_BIENVENIDA = '¡Bienvenido a Uniempresarial! credenciales de acceso';
export const ASUNTO_RECORDATORIO = 'Recordatorio: consulta tus credenciales de acceso Uniempresarial';

export function getWelcomeEmailHtml(nombre: string, portalUrl: string, recordatorio = false): string {
  const n = escapeHtml(nombre);
  const primerNombre = escapeHtml(nombre.trim().split(/\s+/)[0] || nombre);

  const intro = recordatorio
    ? `<p style="margin:0 0 14px 0">Hola <strong>${n}</strong>, notamos que aún no has consultado tus credenciales de acceso a las plataformas institucionales. Son indispensables para iniciar tus actividades académicas, así que te invitamos a hacerlo hoy mismo.</p>`
    : `<p style="margin:0 0 14px 0">Hola <strong>${n}</strong>, nos alegra darte la bienvenida a Uniempresarial. Nos sentimos muy felices de que hagas parte de nuestra comunidad y de acompañarte en este nuevo reto de formación profesional.</p>`;

  const cuerpo = `
    ${intro}
    <p style="margin:0 0 22px 0">Para consultar y descargar tus credenciales, ingresa a nuestro portal seguro con tu <strong>número de documento</strong>. Te enviaremos un código de verificación a este correo.</p>
    ${boton(portalUrl, 'Consultar mis credenciales de acceso &rarr;')}
    <p style="margin:12px 0 26px 0;text-align:center;font-size:12px;color:${GRIS}">o copia este enlace: <a href="${portalUrl}" style="color:${AZUL}">${portalUrl.replace(/^https?:\/\//, '')}</a></p>

    <p style="margin:0 0 12px 0;font-size:11px;font-weight:600;letter-spacing:1.2px;text-transform:uppercase;color:${ROJO}">Tus plataformas institucionales</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      ${tarjeta('@', ROJO, 'Correo institucional', 'Canal oficial de comunicación con la Universidad, docentes y áreas administrativas (Microsoft 365: Outlook, Teams, OneDrive y más).')}
      ${tarjeta('M', AZUL, 'Campus Virtual (Moodle)', `Tus aulas, materiales, actividades y evaluaciones. <a href="${LINKS.tutorialMoodle}" style="color:${AZUL}">Mira cómo acceder &rarr;</a>`)}
      ${tarjeta('G', ROJO, 'Mesa de Servicios', `¿Necesitas acompañamiento técnico? <a href="${LINKS.glpi}" style="color:${AZUL}">Abre un caso aquí &rarr;</a>`)}
    </table>

    <p style="margin:18px 0 6px 0;font-size:16px;font-weight:700;color:${AZUL_NOCHE}">${
      recordatorio ? `¡Te esperamos, ${primerNombre}!` : `¡Bienvenido(a) a nuestra comunidad, ${primerNombre}!`
    }</p>
    <p style="margin:0 0 8px 0;color:${GRIS};font-size:14px">Te deseamos muchos éxitos en esta nueva etapa y esperamos que disfrutes al máximo tu experiencia en Uniempresarial.</p>`;

  return plantilla({
    preencabezado: recordatorio
      ? 'Aún no consultas tus credenciales institucionales. Hazlo hoy en el portal seguro.'
      : 'Tus credenciales de correo institucional, Campus Virtual y Mesa de Servicios te esperan.',
    etiqueta: recordatorio ? 'Recordatorio · Bienestar Universitario' : 'Bienestar Universitario',
    titulo: recordatorio ? `${primerNombre}, tus credenciales te esperan` : `¡Bienvenido(a), ${primerNombre}!`,
    bajada: recordatorio
      ? 'Consulta tu correo institucional y tus accesos para empezar tus clases sin contratiempos.'
      : 'Ya eres parte de la Fundación Universitaria Empresarial de la Cámara de Comercio de Bogotá.',
    cuerpo,
  });
}

export function getOtpEmailHtml(nombre: string, codigo: string, minutos: number): string {
  const cuerpo = `
    <p style="margin:0 0 18px 0">Hola <strong>${escapeHtml(nombre)}</strong>, usa este código para consultar tus credenciales institucionales:</p>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto">
      <tr>
        <td align="center" bgcolor="#e2e7f0" style="border-radius:16px;padding:18px 30px;font-family:'Courier New',monospace;font-size:36px;font-weight:700;letter-spacing:10px;color:${AZUL_NOCHE}">${codigo}</td>
      </tr>
    </table>
    <p style="margin:18px 0 10px 0;text-align:center;font-size:13px;color:${GRIS}">Vence en <strong style="color:${ROJO}">${minutos} minutos</strong> y solo se puede usar una vez.</p>
    <p style="margin:18px 0 8px 0;font-size:13px;color:${GRIS}">Si no solicitaste este código, ignora este mensaje: nadie podrá ver tus credenciales sin él.</p>`;

  return plantilla({
    preencabezado: `Tu código es ${codigo}. Vence en ${minutos} minutos.`,
    etiqueta: 'Verificación de seguridad',
    titulo: 'Tu código de verificación',
    bajada: 'Ingrésalo en el portal de credenciales para continuar.',
    cuerpo,
  });
}
