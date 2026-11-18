'use client';
import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { CONTACTO, LINKS, M365_APPS, QRS } from '@/lib/institucional';
import type { StudentCredenciales } from '@/lib/types';
import { Alerta, Boton, BotonCopiar, IconoCuadro } from '../ui';
import { CambioPassword } from './CambioPassword';

/** Tarjeta de sección con borde de color e icono, como las tarjetas de programas del sitio. */
function Seccion({
  numero,
  titulo,
  color = 'azul',
  children,
}: {
  numero: string;
  titulo: string;
  color?: 'azul' | 'rojo';
  children: React.ReactNode;
}) {
  return (
    <section
      className={`print-break-avoid rounded-xl border bg-white p-5 sm:p-7 ${color === 'rojo' ? 'border-ue/50' : 'border-azul/30'}`}
    >
      <div className="flex items-center gap-3">
        <IconoCuadro color={color}>{numero}</IconoCuadro>
        <h2 className="titulo text-xl text-azul-hondo sm:text-2xl">{titulo}</h2>
      </div>
      <div className="mt-5 space-y-4 text-[15px] leading-relaxed text-tinta">{children}</div>
    </section>
  );
}

function Dato({ etiqueta, valor, secreto }: { etiqueta: string; valor: string; secreto?: boolean }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="flex flex-col gap-2 rounded-xl bg-fondo px-4 py-3 sm:flex-row sm:items-center sm:gap-4">
      <span className="rotulo w-44 shrink-0 text-[10px] text-gris">{etiqueta}</span>
      <code className="flex-1 break-all font-mono text-[15px] font-semibold text-azul-hondo">
        {secreto ? (
          <>
            <span className="print:hidden">{visible ? valor : '•'.repeat(Math.max(8, valor.length))}</span>
            <span className="hidden print:inline">{valor}</span>
          </>
        ) : (
          valor
        )}
      </code>
      <div className="flex gap-2">
        {secreto && (
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            className="no-print font-poppins rounded-pill border border-linea-media bg-white px-3.5 py-1.5 text-xs font-medium hover:border-azul hover:text-azul"
          >
            {visible ? 'Ocultar' : 'Mostrar'}
          </button>
        )}
        <BotonCopiar texto={valor} />
      </div>
    </div>
  );
}

function Enlace({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="break-all font-medium text-azul hover:underline">
      {children}
    </a>
  );
}

function BotonEnlace({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="no-print font-poppins inline-flex items-center gap-2 rounded-pill bg-azul px-5 py-2.5 text-sm font-medium text-white hover:bg-azul-hondo"
    >
      {children} →
    </a>
  );
}

export function ManualCredenciales({
  student,
  demo,
  onActualizar,
  onSalir,
}: {
  student: StudentCredenciales;
  demo: boolean;
  onActualizar: (s: StudentCredenciales) => void;
  onSalir: () => void;
}) {
  const [descargando, setDescargando] = useState(false);
  const [imprimiendo, setImprimiendo] = useState(false);
  const [error, setError] = useState('');
  const [modal, setModal] = useState(false);

  const obtenerPdf = async (imprimir: boolean): Promise<Blob> => {
    const params = new URLSearchParams();
    if (demo) params.set('demo', '1');
    if (imprimir) params.set('imprimir', '1');
    const res = await fetch(`/api/student/manual-pdf${params.size ? `?${params}` : ''}`);
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(data.error || 'No pudimos generar el PDF.');
    }
    return res.blob();
  };

  const descargarPdf = async () => {
    setDescargando(true);
    setError('');
    try {
      const url = URL.createObjectURL(await obtenerPdf(false));
      const a = document.createElement('a');
      a.href = url;
      a.download = `Credenciales-Uniempresarial-${student.documento_identidad}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setDescargando(false);
    }
  };

  /** Imprime exactamente el mismo PDF de una página que se descarga, no la página web. */
  const imprimirPdf = async () => {
    setImprimiendo(true);
    setError('');
    try {
      const url = URL.createObjectURL(await obtenerPdf(true));
      const marco = document.createElement('iframe');
      marco.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden';
      marco.src = url;
      marco.onload = () => {
        try {
          marco.contentWindow?.focus();
          marco.contentWindow?.print();
        } catch {
          // Navegadores que no imprimen PDF incrustados (Safari, celulares): se abre el PDF para imprimirlo desde ahí
          window.open(url, '_blank');
        }
        setTimeout(() => {
          marco.remove();
          URL.revokeObjectURL(url);
        }, 60_000);
      };
      document.body.appendChild(marco);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setImprimiendo(false);
    }
  };

  const primerNombre = student.nombre_completo.split(' ')[0];

  return (
    <div className="print:p-0">
      {/* Portada en banda azul */}
      <header className="bg-azul text-white">
        <div className="px-4 py-10 sm:px-8 sm:py-12">
          <div className="no-print mb-8 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-white/80">
              Sesión segura · <span className="font-medium text-white">{student.documento_identidad}</span>
              {demo && <span className="font-poppins ml-2 rounded-pill bg-white/15 px-2 py-0.5 text-[11px]">Demo</span>}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={descargarPdf}
                disabled={descargando}
                className="font-poppins inline-flex items-center gap-2 rounded-pill bg-ue px-5 py-2.5 text-sm font-medium text-white hover:bg-ue-dark disabled:opacity-60"
              >
                {descargando ? 'Generando…' : 'Descargar manual PDF'}
              </button>
              <button
                onClick={imprimirPdf}
                disabled={imprimiendo}
                className="font-poppins rounded-pill border border-white/60 px-5 py-2.5 text-sm font-medium hover:bg-white hover:text-azul disabled:opacity-60"
              >
                {imprimiendo ? 'Preparando…' : 'Imprimir'}
              </button>
              <button onClick={onSalir} className="font-poppins px-3 py-2.5 text-sm font-medium text-white/85 hover:text-white hover:underline">
                Salir
              </button>
            </div>
          </div>

          <p className="rotulo text-[11px] text-white/75">Manual de ingreso a plataformas institucionales</p>
          <h1 className="titulo mt-3 text-[2.1rem] leading-[1.05] sm:text-display">¡Bienvenido(a), {primerNombre}!</h1>
          <p className="mt-4 max-w-2xl text-white/85">
            La Fundación Universitaria Empresarial de la Cámara de Comercio de Bogotá te da la bienvenida. Nos alegra
            acompañarte en este nuevo reto de formación profesional.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <span className="rounded-pill bg-white px-4 py-1.5 text-sm text-tinta">
              <span className="text-gris">Estudiante:</span> <span className="font-semibold">{student.nombre_completo}</span>
            </span>
            <span className="rounded-pill bg-white px-4 py-1.5 text-sm text-tinta">
              <span className="text-gris">Programa:</span> <span className="font-semibold text-ue">{student.programa_academico}</span>
            </span>
            {student.modalidad && (
              <span className="rounded-pill bg-white px-4 py-1.5 text-sm text-tinta">
                <span className="text-gris">Modalidad:</span> <span className="font-semibold">{student.modalidad}</span>
              </span>
            )}
          </div>
        </div>
      </header>

      {error && (
        <div className="no-print px-4 pt-6 sm:px-8">
          <Alerta>{error}</Alerta>
        </div>
      )}

      <article className="print-plain mx-auto max-w-5xl space-y-5 px-4 py-10 sm:px-8">
        <p className="rotulo text-center text-sm text-ue">Tus credenciales de acceso</p>
        <p className="mx-auto max-w-2xl text-center text-sm text-gris">
          Guárdalas en un lugar seguro y no las compartas con nadie: la Universidad nunca te pedirá tu contraseña por correo o
          teléfono.
        </p>

        <Seccion numero="1" titulo="¿Cómo ingresar a tu correo electrónico?">
          <p>
            Ingresa a <Enlace href={LINKS.m365}>Microsoft 365</Enlace> con estos datos:
          </p>
          <div className="space-y-2">
            <Dato etiqueta="Correo institucional" valor={student.correo_institucional} />
            <Dato etiqueta="Contraseña asignada" valor={student.password_inicial} secreto />
          </div>
          <p className="text-sm text-gris">
            En tu primer ingreso Office te pedirá cambiar la contraseña por una personal. Desde ese momento úsala en todas las
            plataformas.
          </p>
          <BotonEnlace href={LINKS.m365}>Abrir Microsoft 365</BotonEnlace>
        </Seccion>

        <Seccion numero="2" titulo="¿Cómo ingresar a tu campus virtual?">
          <p>
            Ingresa a <Enlace href={LINKS.campus}>{LINKS.campus}</Enlace> con tu correo institucional{' '}
            <span className="font-semibold">{student.correo_institucional}</span> y la contraseña asignada.
          </p>
          <p>
            Paso a paso en video: <Enlace href={LINKS.tutorialMoodle}>{LINKS.tutorialMoodle}</Enlace>
          </p>
          <BotonEnlace href={LINKS.campus}>Abrir Campus Virtual</BotonEnlace>
        </Seccion>

        <Seccion numero="3" titulo="¿Cómo ingresar a la mesa de servicios GLPI?" color="rojo">
          <p>
            Ingresa a <Enlace href={LINKS.glpi}>{LINKS.glpi}</Enlace> para reportar incidentes o solicitar soporte técnico.
          </p>
          <div className="rounded-xl border border-ue/30 bg-ue-soft p-4">
            <p className="rotulo text-[11px] text-ue">Importante · tu usuario no lleva dominio</p>
            <p className="mt-1.5">
              Escribe únicamente <span className="font-mono font-semibold text-azul-hondo">{student.usuario_glpi}</span>, sin{' '}
              <span className="font-mono">@uniempresarial.edu.co</span>. Con el correo completo el inicio de sesión falla y la
              cuenta puede bloquearse.
            </p>
          </div>
          <Dato etiqueta="Usuario GLPI" valor={student.usuario_glpi} />
        </Seccion>

        <Seccion numero="i" titulo="¿Qué es Microsoft 365?">
          <p>
            Es la suite de herramientas en la nube que la Universidad pone a tu disposición con tu cuenta institucional. Úsala
            desde el navegador, el computador o el celular.
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {M365_APPS.map((app) => (
              <div key={app.nombre} className="rounded-xl border border-linea p-4">
                <p className="font-poppins font-semibold text-azul">{app.nombre}</p>
                <p className="mt-1 text-sm text-gris">{app.desc}</p>
              </div>
            ))}
          </div>
        </Seccion>

        <Seccion numero="QR" titulo="Accesos rápidos">
          <p>Escanea con la cámara de tu celular para abrir cada plataforma.</p>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {QRS.map((q) => (
              <a
                key={q.titulo}
                href={q.url}
                target="_blank"
                rel="noreferrer"
                className="group flex flex-col items-center rounded-xl border border-linea p-4 text-center hover:border-azul"
              >
                <QRCodeSVG value={q.url} size={140} marginSize={0} fgColor="#1a2340" bgColor="#ffffff" className="h-auto w-full max-w-[140px]" />
                <span className="font-poppins mt-3 text-xs font-semibold text-azul-hondo group-hover:text-azul">{q.titulo}</span>
              </a>
            ))}
          </div>
        </Seccion>

        <Seccion numero="?" titulo="¿Problemas con tu contraseña?" color="rojo">
          <p>
            Si Office no te deja cambiarla o la olvidaste, genera aquí una contraseña temporal nueva. Se actualiza en Microsoft
            365 y en este portal.
          </p>
          <div className="no-print">
            <Boton variante="secundario" onClick={() => setModal(true)}>
              ¿No puedes cambiar tu contraseña o la olvidaste?
            </Boton>
          </div>
          <p className="text-sm text-gris">
            ¿Necesitas más ayuda? Escribe a <Enlace href={`mailto:${CONTACTO.bienestar}`}>{CONTACTO.bienestar}</Enlace> o abre
            un caso en la Mesa de Servicios.
          </p>
        </Seccion>

        <div className="pt-4 text-center">
          <p className="titulo text-xl text-azul-hondo">¡Te deseamos muchos éxitos en esta nueva etapa!</p>
          <p className="mt-1 text-sm text-gris">Bienestar Universitario · Uniempresarial</p>
        </div>

        <div className="hidden border-t border-linea pt-4 text-center text-[10px] text-gris print:block">
          {CONTACTO.institucion} · Sede principal: {CONTACTO.sedePrincipal} · Sede Administrativa:{' '}
          {CONTACTO.sedeAdministrativa} · Tel. {CONTACTO.telefono} · {CONTACTO.web}
        </div>
      </article>

      {modal && (
        <CambioPassword
          demo={demo}
          onCerrar={() => setModal(false)}
          onCambiada={(password) => onActualizar({ ...student, password_inicial: password })}
        />
      )}
    </div>
  );
}
