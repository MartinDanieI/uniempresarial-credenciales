-- =====================================================================
-- Uniempresarial · Sistema de autogestión y trazabilidad de credenciales
-- Ejecutar completo en Supabase → SQL Editor (es idempotente en lo posible).
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- 0. Lotes de carga masiva (Panel TI)
-- ---------------------------------------------------------------------
create table if not exists public.upload_batches (
  id            uuid primary key default gen_random_uuid(),
  nombre_archivo text not null,
  total_filas   int  not null default 0,
  insertados    int  not null default 0,
  actualizados  int  not null default 0,
  cargado_por   text,
  created_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 1. Credenciales de estudiantes
-- ---------------------------------------------------------------------
create table if not exists public.students_credentials (
  id uuid default gen_random_uuid() primary key,
  documento_identidad varchar(30) unique not null,
  nombre_completo     text not null,                 -- «NOMBRE»
  programa_academico  text not null,                 -- «PROGRAMA»
  modalidad           varchar(50) default 'Presencial',
  correo_personal     text not null,
  correo_institucional text unique not null,         -- «USUARIO_CORREO_UE»
  usuario_glpi        text not null,                 -- «Usuario_UE» (trigger)
  password_inicial    text not null,                 -- «CONTRASEÑA_CORREO_UE»
  fecha_registro      date,                          -- FECHA (plantilla oficial)
  firma_recibido      text,                          -- FIRMA RECIBIDO (plantilla oficial)

  -- Trazabilidad para Bienestar Universitario
  estado_correo varchar(30) default 'pendiente'
    check (estado_correo in ('pendiente', 'enviado', 'recordatorio_enviado', 'error')),
  fecha_envio_correo        timestamptz,
  fecha_ultimo_recordatorio timestamptz,
  cantidad_recordatorios    int default 0,
  ultimo_error_correo       text,
  ha_ingresado          boolean default false,
  fecha_primer_ingreso  timestamptz,
  fecha_ultimo_ingreso  timestamptz,
  ha_cambiado_password  boolean default false,

  lote_id    uuid references public.upload_batches(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Proyectos creados antes de la plantilla oficial
alter table public.students_credentials add column if not exists fecha_registro date;
alter table public.students_credentials add column if not exists firma_recibido text;

create index if not exists idx_students_cedula        on public.students_credentials(documento_identidad);
create index if not exists idx_students_trazabilidad  on public.students_credentials(ha_ingresado, estado_correo);
create index if not exists idx_students_programa      on public.students_credentials(programa_academico);

-- Usuario_UE para GLPI = parte antes del @ del correo institucional
create or replace function public.extract_glpi_username()
returns trigger as $$
begin
  new.usuario_glpi := split_part(new.correo_institucional, '@', 1);
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_extract_glpi_user on public.students_credentials;
create trigger trg_extract_glpi_user
before insert or update of correo_institucional on public.students_credentials
for each row execute function public.extract_glpi_username();

-- updated_at en cualquier modificación
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_students_updated_at on public.students_credentials;
create trigger trg_students_updated_at
before update on public.students_credentials
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 2. Códigos OTP (se guarda solo el hash SHA-256, nunca el código)
-- ---------------------------------------------------------------------
create table if not exists public.otp_verifications (
  id uuid default gen_random_uuid() primary key,
  documento_identidad varchar(30) not null
    references public.students_credentials(documento_identidad) on delete cascade on update cascade,
  codigo_hash text not null,
  intentos    int not null default 0,
  usado       boolean default false,
  ip_address  text,
  expires_at  timestamptz not null,
  created_at  timestamptz default now()
);
create index if not exists idx_otp_documento on public.otp_verifications(documento_identidad, created_at desc);
create index if not exists idx_otp_ip        on public.otp_verifications(ip_address, created_at desc);

-- ---------------------------------------------------------------------
-- 3. Auditoría de accesos (historial exacto para reclamos)
-- ---------------------------------------------------------------------
create table if not exists public.access_logs (
  id uuid default gen_random_uuid() primary key,
  student_id uuid not null references public.students_credentials(id) on delete cascade,
  accion varchar(50) not null,  -- consulta_credenciales | descarga_pdf | cambio_password | correo_bienvenida | recordatorio
  ip_address text,
  user_agent text,
  detalle    text,
  ciudad     text,  -- ubicación aproximada (Vercel, a partir de la IP); la IP no se muestra
  region     text,
  pais       text,
  created_at timestamptz default now()
);
alter table public.access_logs add column if not exists ciudad text;
alter table public.access_logs add column if not exists region text;
alter table public.access_logs add column if not exists pais text;
create index if not exists idx_logs_student on public.access_logs(student_id, created_at desc);

-- ---------------------------------------------------------------------
-- 4. Personal autorizado (TI / Bienestar). Los usuarios se crean en
--    Supabase → Authentication → Users y luego se registran aquí:
--    insert into public.staff_users (user_id, nombre, rol)
--    values ('<uuid del usuario>', 'Diego Andrés', 'ti');
-- ---------------------------------------------------------------------
create table if not exists public.staff_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  nombre  text not null,
  rol     text not null check (rol in ('ti', 'bienestar', 'admin')),
  created_at timestamptz default now()
);

-- ---------------------------------------------------------------------
-- 5. KPIs y catálogos para el panel de Bienestar
-- ---------------------------------------------------------------------
create or replace function public.bienestar_resumen()
returns json
language sql
stable
as $$
  select json_build_object(
    'total',      (select count(*) from public.students_credentials),
    'enviados',   (select count(*) from public.students_credentials where estado_correo in ('enviado','recordatorio_enviado')),
    'pendientes_envio', (select count(*) from public.students_credentials where estado_correo = 'pendiente'),
    'errores',    (select count(*) from public.students_credentials where estado_correo = 'error'),
    'ingresaron', (select count(*) from public.students_credentials where ha_ingresado),
    'sin_ingresar', (select count(*) from public.students_credentials where not ha_ingresado),
    'programas',  coalesce((select json_agg(p order by p) from (select distinct programa_academico p from public.students_credentials) x), '[]'::json),
    'modalidades', coalesce((select json_agg(m order by m) from (select distinct modalidad m from public.students_credentials where modalidad is not null) y), '[]'::json)
  );
$$;

-- ---------------------------------------------------------------------
-- 6. Seguridad: RLS activado SIN políticas públicas. Todo el acceso pasa
--    por las rutas API del servidor con la service_role key.
-- ---------------------------------------------------------------------
alter table public.students_credentials enable row level security;
alter table public.otp_verifications    enable row level security;
alter table public.access_logs          enable row level security;
alter table public.upload_batches       enable row level security;
alter table public.staff_users          enable row level security;

-- Cada miembro del personal puede leer su propia fila (para conocer su rol)
drop policy if exists staff_self_read on public.staff_users;
create policy staff_self_read on public.staff_users
  for select to authenticated using (user_id = auth.uid());

revoke all on function public.bienestar_resumen() from public, anon, authenticated;
grant execute on function public.bienestar_resumen() to service_role;
