import 'server-only';

/**
 * Integración con Microsoft Graph (Entra ID / Microsoft 365) usando el flujo
 * client credentials de una App Registration.
 *
 * Permisos de aplicación requeridos (con consentimiento de administrador):
 *  - User.ReadWrite.All + User-PasswordProfile.ReadWrite.All → restablecer contraseñas
 *  - Mail.Send → enviar correos desde bienestar@ (MAIL_DRIVER=graph)
 * Además, para restablecer contraseñas, la entidad de servicio de la app debe
 * tener asignado el rol "Administrador de autenticación" o "Administrador de usuarios".
 *
 * Cuentas sincronizadas desde un Directorio Activo local: Graph no puede cambiar
 * su contraseña salvo que esté habilitada la escritura diferida (password writeback).
 */

interface TokenCache {
  token: string;
  expiresAt: number;
}

let cache: TokenCache | null = null;

export function graphConfigurado(): boolean {
  return Boolean(
    process.env.AZURE_TENANT_ID && process.env.AZURE_CLIENT_ID && process.env.AZURE_CLIENT_SECRET,
  );
}

async function getAppToken(): Promise<string> {
  if (cache && cache.expiresAt > Date.now() + 60_000) return cache.token;
  if (!graphConfigurado()) {
    throw new Error('Microsoft Graph no está configurado (AZURE_TENANT_ID / AZURE_CLIENT_ID / AZURE_CLIENT_SECRET).');
  }

  const body = new URLSearchParams({
    client_id: process.env.AZURE_CLIENT_ID!,
    client_secret: process.env.AZURE_CLIENT_SECRET!,
    scope: 'https://graph.microsoft.com/.default',
    grant_type: 'client_credentials',
  });

  const res = await fetch(
    `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/oauth2/v2.0/token`,
    { method: 'POST', body, cache: 'no-store' },
  );
  const json = (await res.json()) as { access_token?: string; expires_in?: number; error_description?: string };
  if (!res.ok || !json.access_token) {
    throw new Error(`No se pudo obtener token de Microsoft Graph: ${json.error_description || res.status}`);
  }
  cache = { token: json.access_token, expiresAt: Date.now() + (json.expires_in ?? 3600) * 1000 };
  return cache.token;
}

async function graphFetch(path: string, init: RequestInit): Promise<Response> {
  const token = await getAppToken();
  const res = await fetch(`https://graph.microsoft.com/v1.0${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
    cache: 'no-store',
  });
  if (!res.ok) {
    let detalle = `${res.status}`;
    try {
      const err = (await res.json()) as { error?: { code?: string; message?: string } };
      detalle = `${err.error?.code ?? res.status}: ${err.error?.message ?? ''}`;
    } catch {
      // respuesta sin cuerpo JSON
    }
    throw new Error(`Microsoft Graph ${path} → ${detalle}`);
  }
  return res;
}

/** Restablece la contraseña de un usuario de Microsoft 365 (passwordProfile). */
export async function resetUserPassword(
  correoInstitucional: string,
  nuevaPassword: string,
  forzarCambio = true,
): Promise<void> {
  await graphFetch(`/users/${encodeURIComponent(correoInstitucional)}`, {
    method: 'PATCH',
    body: JSON.stringify({
      passwordProfile: {
        password: nuevaPassword,
        forceChangePasswordNextSignIn: forzarCambio,
      },
    }),
  });
}

/** Envía un correo HTML desde el buzón indicado (por defecto bienestar@). */
export async function sendMailGraph(opts: {
  from: string;
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}): Promise<void> {
  await graphFetch(`/users/${encodeURIComponent(opts.from)}/sendMail`, {
    method: 'POST',
    body: JSON.stringify({
      message: {
        subject: opts.subject,
        body: { contentType: 'HTML', content: opts.html },
        toRecipients: [{ emailAddress: { address: opts.to } }],
        ...(opts.replyTo ? { replyTo: [{ emailAddress: { address: opts.replyTo } }] } : {}),
      },
      saveToSentItems: true,
    }),
  });
}
