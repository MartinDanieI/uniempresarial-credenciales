# Credenciales Uniempresarial

Plataforma de automatización, autogestión y trazabilidad de credenciales institucionales de la
**Fundación Universitaria Empresarial de la Cámara de Comercio de Bogotá**. Reemplaza el flujo manual
Excel → combinación de correspondencia → ZIP → reenvío uno a uno.

| Módulo | Ruta | Quién |
|---|---|---|
| Portal del estudiante (cédula → OTP → manual interactivo + PDF) | `/` | Estudiantes |
| Panel de Tecnología (carga masiva Excel, alta/edición individual, lotes) | `/admin/ti` | TI (Diego Andrés) |
| Panel de Trazabilidad (KPIs, filtros, envíos, recordatorios, historial, CSV) | `/admin/bienestar` | Bienestar (Diana, Lady Tatiana) |
| Recordatorios automáticos cada día (48 h sin ingresar) | `/api/cron/reminders` | Vercel Cron |

Stack: Next.js 16 (App Router, `proxy.ts`), TypeScript, Tailwind CSS 4, Supabase (Postgres + Auth),
Microsoft Graph, `@react-pdf/renderer`, `qrcode.react`, SheetJS.

## Árbol del proyecto

```
├── app/
│   ├── page.tsx                         Portal público del estudiante
│   ├── admin/
│   │   ├── page.tsx                     Redirige según rol
│   │   ├── login/page.tsx               Ingreso del personal (Supabase Auth)
│   │   ├── ti/page.tsx                  Panel TI
│   │   └── bienestar/page.tsx           Panel Bienestar
│   └── api/
│       ├── student/
│       │   ├── request-otp/route.ts     Envía código OTP (límites por IP y documento)
│       │   ├── verify-otp/route.ts      Valida OTP, marca ingreso, abre sesión (cookie firmada)
│       │   ├── session/route.ts         GET restaurar sesión / DELETE salir
│       │   ├── manual-pdf/route.tsx     Manual personalizado en PDF con QR
│       │   └── change-password/route.ts Restablece clave en Microsoft 365 vía Graph
│       ├── ti/
│       │   ├── upload-excel/route.ts    Previsualizar / confirmar carga masiva
│       │   ├── students/route.ts        Buscar / crear / editar individual
│       │   └── batches/route.ts         Lotes recientes
│       ├── bienestar/
│       │   ├── students/route.ts        Tabla paginada + KPIs
│       │   ├── students/[id]/logs/      Historial de accesos
│       │   ├── send-welcome/route.ts    Bienvenida masiva por tandas
│       │   ├── reminder/route.ts        Reenvío individual
│       │   └── export/route.ts          CSV filtrado (sin contraseñas)
│       └── cron/reminders/route.ts      Recordatorios automáticos
├── components/                          UI (estudiante/, admin/ti, admin/bienestar, ui.tsx)
├── lib/
│   ├── supabase*.ts                     Clientes (service role, SSR, navegador)
│   ├── auth.ts                          Sesión y roles del personal
│   ├── student-session.ts               JWT httpOnly del estudiante (20 min)
│   ├── mailer.ts                        Envío (Graph / SMTP / consola) + plantillas
│   ├── microsoft-graph.ts               Token app-only, reset de contraseña, sendMail
│   ├── excel.ts                         Lectura y validación del Excel
│   ├── notificaciones.ts                Envío + trazabilidad
│   ├── pdf/ManualPdf.tsx                Documento PDF
│   └── institucional.ts                 Enlaces y datos oficiales
├── supabase/schema.sql                  Tablas, triggers, RLS, función de KPIs
├── proxy.ts                             Protege /admin
└── vercel.json                          Cron diario
```

## Puesta en marcha

1. **Supabase**: crea el proyecto y ejecuta `supabase/schema.sql` en el SQL Editor.
2. **Personal**: en *Authentication → Users* crea los usuarios (correo + contraseña) y regístralos:
   ```sql
   insert into public.staff_users (user_id, nombre, rol) values
     ('<uuid>', 'Diego Andrés', 'ti'),
     ('<uuid>', 'Diana', 'bienestar'),
     ('<uuid>', 'Lady Tatiana', 'bienestar');
   ```
   Roles: `ti`, `bienestar`, `admin` (ve todo). Desactiva el registro público en *Authentication → Providers → Email*.
3. **Entra ID (Azure)**: App Registration con secreto y permisos de aplicación (con consentimiento de
   administrador) `Mail.Send`, `User.ReadWrite.All`, `User-PasswordProfile.ReadWrite.All`. Asigna a la
   entidad de servicio el rol **Administrador de autenticación** (o de usuarios) para poder restablecer
   contraseñas. Recomendado: limitar `Mail.Send` al buzón de Bienestar con una *Application Access Policy*.
4. **Variables**: copia `.env.example` a `.env.local` y complétalas.
5. `npm install` y `npm run dev` → http://localhost:3000

En desarrollo, `MAIL_DRIVER=console` imprime los correos y OTP en la terminal, y `/?demo=1` muestra el
manual con datos ficticios sin base de datos.

## Despliegue (Vercel)

Configura las mismas variables, incluido `CRON_SECRET`. `vercel.json` ejecuta los recordatorios todos
los días a las 8:00 a. m. (hora Colombia). Con otro proveedor, programa un `GET` a
`/api/cron/reminders` con el encabezado `Authorization: Bearer <CRON_SECRET>`.

## Formato del Excel

Se usa la plantilla oficial **PLANTILLA PLATAFORMA.xlsx** (se descarga desde el panel TI, `public/plantilla-plataforma.xlsx`):
`FECHA | NOMBRE | DOCUMENTO | CORREO PERSONAL | PROGRAMA | Usuario Ue | USUARIO CORREO UE | CONTRASEÑA CORREO UE | FIRMA RECIBIDO`.

- FECHA: fecha de Excel o texto día/mes/año → `fecha_registro`.
- Usuario Ue: opcional; si viene, debe ser lo que va antes de la @ del correo institucional (si no coincide, la fila se marca con error). El sistema lo calcula igual.
- FIRMA RECIBIDO: opcional (`firma_recibido`). En Bienestar y en el Excel exportado se completa con la constancia digital: fecha y hora en que el estudiante abrió sus credenciales.
- MODALIDAD no está en la plantilla: es opcional y por defecto queda "Presencial".
- Se ignoran las filas vacías. Recargar un estudiante actualiza sus datos sin borrar su trazabilidad.
- Excel de prueba en este formato: `node scripts/generar-excel-300.mjs <cantidad> pruebas/archivo.xlsx`.

## Seguridad

- RLS activo sin políticas públicas: todo pasa por rutas del servidor con la service role key.
- OTP de 6 dígitos con `crypto.randomInt`, guardado como hash SHA‑256, 10 min de vigencia, 5 intentos,
  3 solicitudes por documento y 10 por IP cada 15 min; los códigos previos se invalidan.
- Tras el OTP, cookie httpOnly firmada (HS256, 20 min) para PDF y cambio de contraseña.
- Bienestar nunca recibe contraseñas; el CSV neutraliza inyección de fórmulas.
- **Pendiente institucional**: `password_inicial` se guarda en texto plano (requisito del flujo actual).
  Se recomienda forzar el cambio en el primer ingreso (ya ocurre en Office) y depurar la columna al
  terminar el periodo de admisiones.

## Notas

- Microsoft retiró la autenticación básica de SMTP AUTH en Exchange Online; por eso el modo
  recomendado es `MAIL_DRIVER=graph`. El modo `smtp` sigue disponible para otros servidores.
- Si las cuentas se sincronizan desde un Directorio Activo local (Entra Connect), Graph solo puede
  cambiar la contraseña con *password writeback* habilitado; si no, el portal indica acudir a GLPI.
- El enlace del SIGA se configura con `NEXT_PUBLIC_SIGA_URL`.
