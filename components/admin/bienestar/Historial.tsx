'use client';
import { useEffect, useMemo, useState } from 'react';
import {
  BellRing,
  Check,
  Download,
  KeyRound,
  LockOpen,
  Mail,
  MapPin,
  Monitor,
  Printer,
  Smartphone,
  X,
  type LucideIcon,
} from 'lucide-react';
import type { AccessLog, StudentTrazabilidad } from '@/lib/types';
import { describirDispositivo, describirUbicacion } from '@/lib/dispositivo';
import { Alerta, Boton, Spinner, formatoFecha } from '../../ui';

interface Accion {
  titulo: string;
  icono: LucideIcon;
  /** Clases del círculo del icono y del borde de la tarjeta (mismo color por tipo de acción). */
  circulo: string;
  borde: string;
}

const ACCIONES: Record<string, Accion> = {
  correo_bienvenida: { titulo: 'Correo de bienvenida enviado', icono: Mail, circulo: 'bg-azul text-white', borde: 'border-l-azul' },
  recordatorio: { titulo: 'Recordatorio enviado', icono: BellRing, circulo: 'bg-amber-500 text-white', borde: 'border-l-amber-500' },
  consulta_credenciales: { titulo: 'Consultó sus credenciales', icono: LockOpen, circulo: 'bg-emerald-600 text-white', borde: 'border-l-emerald-600' },
  descarga_pdf: { titulo: 'Descargó el manual PDF', icono: Download, circulo: 'bg-sky-600 text-white', borde: 'border-l-sky-600' },
  impresion_pdf: { titulo: 'Imprimió el manual', icono: Printer, circulo: 'bg-violet-600 text-white', borde: 'border-l-violet-600' },
  cambio_password: { titulo: 'Restableció su contraseña', icono: KeyRound, circulo: 'bg-ue text-white', borde: 'border-l-ue' },
};

const OTRA: Accion = { titulo: 'Actividad', icono: Check, circulo: 'bg-gris text-white', borde: 'border-l-linea-media' };

const hora = (iso: string) =>
  new Date(iso).toLocaleTimeString('es-CO', { timeZone: 'America/Bogota', hour: 'numeric', minute: '2-digit' });

const diaClave = (iso: string) => new Date(iso).toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });

function tituloDia(clave: string): string {
  const hoy = diaClave(new Date().toISOString());
  const ayer = diaClave(new Date(Date.now() - 864e5).toISOString());
  if (clave === hoy) return 'Hoy';
  if (clave === ayer) return 'Ayer';
  return new Date(`${clave}T12:00:00`).toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

/** Paso del recorrido del estudiante: hecho (color) o pendiente (gris). */
function Paso({
  hecho,
  icono: Icono,
  color,
  titulo,
  detalle,
  ultimo,
}: {
  hecho: boolean;
  icono: LucideIcon;
  color: string;
  titulo: string;
  detalle: string;
  ultimo?: boolean;
}) {
  return (
    <li className="relative flex gap-3 pb-5 last:pb-0">
      {!ultimo && (
        <span className={`absolute top-10 left-[19px] h-[calc(100%-2.5rem)] w-0.5 ${hecho ? 'bg-emerald-300' : 'bg-linea'}`} aria-hidden />
      )}
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${hecho ? color : 'border-2 border-dashed border-linea-media bg-white text-gris'}`}
      >
        <Icono className="h-[18px] w-[18px]" aria-hidden />
      </span>
      <div className="pt-0.5">
        <p className={`font-poppins text-sm font-semibold ${hecho ? 'text-azul-hondo' : 'text-gris'}`}>
          {titulo}
          {hecho && <Check className="ml-1.5 inline h-4 w-4 text-emerald-600" aria-label="hecho" />}
        </p>
        <p className="text-xs text-gris">{detalle}</p>
      </div>
    </li>
  );
}

/** Historial completo de un estudiante: su recorrido, un resumen y cada acción con lugar y dispositivo. */
export function Historial({ student, onCerrar }: { student: StudentTrazabilidad; onCerrar: () => void }) {
  const [logs, setLogs] = useState<AccessLog[] | null>(null);
  const [error, setError] = useState('');
  const [descargando, setDescargando] = useState(false);

  useEffect(() => {
    fetch(`/api/bienestar/students/${student.id}/logs`, { cache: 'no-store' })
      .then(async (r) => {
        const d = (await r.json()) as { logs?: AccessLog[]; error?: string };
        if (!r.ok) throw new Error(d.error);
        setLogs(d.logs ?? []);
      })
      .catch((e: Error) => setError(e.message || 'No se pudo cargar el historial'));
  }, [student.id]);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onCerrar();
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [onCerrar]);

  const cuenta = (accion: string) => logs?.filter((l) => l.accion === accion).length ?? 0;
  // Los registros llegan del más reciente al más antiguo; invertidos se toma la primera vez que ocurrió
  const primero = (...acciones: string[]) => [...(logs ?? [])].reverse().find((l) => acciones.includes(l.accion));

  const porDia = useMemo(() => {
    const grupos = new Map<string, AccessLog[]>();
    for (const l of logs ?? []) {
      const k = diaClave(l.created_at);
      grupos.set(k, [...(grupos.get(k) ?? []), l]);
    }
    return [...grupos.entries()];
  }, [logs]);

  const descargarHistorial = async () => {
    setDescargando(true);
    setError('');
    try {
      const res = await fetch(`/api/bienestar/students/${student.id}/historial-pdf`);
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(d.error || 'No se pudo generar el PDF del historial');
      }
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement('a');
      a.href = url;
      a.download = `Historial-${student.documento_identidad}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setDescargando(false);
    }
  };

  const manual = primero('descarga_pdf', 'impresion_pdf');
  const clave = primero('cambio_password');
  const ultimaUbicacion = logs?.find((l) => l.ciudad || l.pais);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-azul-hondo/60" onClick={onCerrar}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Historial de ${student.nombre_completo}`}
        className="flex h-full w-full max-w-4xl flex-col overflow-hidden bg-white sm:rounded-l-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Encabezado en banda azul, como el portal */}
        <header className="relative bg-azul px-6 py-6 text-white sm:px-8">
          <button
            onClick={onCerrar}
            className="absolute top-4 right-4 rounded-full p-2 text-white/80 hover:bg-white/15 hover:text-white"
            aria-label="Cerrar historial"
          >
            <X className="h-5 w-5" />
          </button>
          <p className="rotulo text-[11px] text-white/75">Historial del estudiante</p>
          <h3 className="titulo mt-2 pr-10 text-2xl sm:text-3xl">{student.nombre_completo}</h3>
          <div className="mt-4 flex flex-wrap gap-2 text-sm">
            <span className="rounded-pill bg-white/15 px-3 py-1">CC {student.documento_identidad}</span>
            <span className="rounded-pill bg-white/15 px-3 py-1">{student.correo_institucional}</span>
            <span className="rounded-pill bg-white/15 px-3 py-1">{student.programa_academico}</span>
          </div>
        </header>
        <div className="h-[3px] bg-gradient-to-r from-ue to-azul" aria-hidden />

        <div className="flex-1 overflow-y-auto lg:grid lg:grid-cols-[340px_1fr] lg:overflow-hidden">
          {/* Columna izquierda: recorrido y resumen */}
          <aside className="space-y-6 border-b border-linea bg-fondo/60 p-6 lg:overflow-y-auto lg:border-r lg:border-b-0">
            <section>
              <p className="rotulo text-[11px] text-ue">Recorrido</p>
              <ol className="mt-4">
                <Paso
                  hecho={!!student.fecha_envio_correo}
                  icono={Mail}
                  color="bg-azul text-white"
                  titulo="Recibió la bienvenida"
                  detalle={
                    student.fecha_envio_correo
                      ? `${formatoFecha(student.fecha_envio_correo)}${student.cantidad_recordatorios ? ` · ${student.cantidad_recordatorios} recordatorio(s)` : ''}`
                      : 'Aún no se le ha enviado'
                  }
                />
                <Paso
                  hecho={student.ha_ingresado}
                  icono={LockOpen}
                  color="bg-emerald-600 text-white"
                  titulo="Abrió sus credenciales"
                  detalle={student.ha_ingresado ? `Firma digital · ${formatoFecha(student.fecha_primer_ingreso)}` : 'Pendiente'}
                />
                <Paso
                  hecho={!!manual}
                  icono={Download}
                  color="bg-sky-600 text-white"
                  titulo="Descargó o imprimió el manual"
                  detalle={manual ? formatoFecha(manual.created_at) : 'Pendiente'}
                />
                <Paso
                  hecho={!!clave || student.ha_cambiado_password}
                  icono={KeyRound}
                  color="bg-ue text-white"
                  titulo="Restableció su contraseña"
                  detalle={clave ? formatoFecha(clave.created_at) : 'Opcional · solo si la olvidó'}
                  ultimo
                />
              </ol>
            </section>

            <section>
              <p className="rotulo text-[11px] text-ue">Resumen</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {[
                  ['Consultas', cuenta('consulta_credenciales'), 'text-emerald-700'],
                  ['Descargas', cuenta('descarga_pdf'), 'text-sky-700'],
                  ['Impresiones', cuenta('impresion_pdf'), 'text-violet-700'],
                  ['Recordatorios', cuenta('recordatorio'), 'text-amber-600'],
                ].map(([t, v, c]) => (
                  <div key={t as string} className="rounded-xl border border-linea bg-white p-3">
                    <p className={`titulo text-2xl leading-none ${c}`}>{logs ? v : '…'}</p>
                    <p className="mt-1 text-xs text-gris">{t}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="space-y-2 text-sm">
              <p className="rotulo text-[11px] text-ue">Datos de contacto</p>
              <p>
                <span className="text-gris">Correo personal</span>
                <br />
                <span className="font-medium break-all">{student.correo_personal}</span>
              </p>
              <p>
                <span className="text-gris">Último acceso</span>
                <br />
                <span className="font-medium">{formatoFecha(student.fecha_ultimo_ingreso)}</span>
              </p>
              {ultimaUbicacion && (
                <p>
                  <span className="text-gris">Última ubicación</span>
                  <br />
                  <span className="font-medium">{describirUbicacion(ultimaUbicacion.ciudad, ultimaUbicacion.region, ultimaUbicacion.pais)}</span>
                </p>
              )}
            </section>
          </aside>

          {/* Columna derecha: línea de tiempo */}
          <section className="p-6 lg:overflow-y-auto">
            <p className="rotulo text-[11px] text-ue">Actividad</p>
            {error && (
              <div className="mt-4">
                <Alerta>{error}</Alerta>
              </div>
            )}
            {!logs && !error && (
              <div className="flex justify-center py-16 text-azul">
                <Spinner className="h-7 w-7" />
              </div>
            )}
            {logs && !logs.length && <p className="py-16 text-center text-sm text-gris">Todavía no hay actividad registrada.</p>}

            {porDia.map(([dia, items]) => (
              <div key={dia} className="mt-5">
                <p className="font-poppins mb-3 text-sm font-semibold text-azul-hondo first-letter:uppercase">{tituloDia(dia)}</p>
                <ol className="relative space-y-3 before:absolute before:top-2 before:bottom-2 before:left-[19px] before:w-0.5 before:bg-linea">
                  {items.map((l) => {
                    const a = ACCIONES[l.accion] ?? OTRA;
                    const Icono = a.icono;
                    const lugar = describirUbicacion(l.ciudad, l.region, l.pais);
                    const disp = describirDispositivo(l.user_agent);
                    const DispIcono = disp?.movil ? Smartphone : Monitor;
                    const delSistema = l.accion === 'correo_bienvenida' || l.accion === 'recordatorio';
                    return (
                      <li key={l.id} className="relative flex gap-4">
                        <span className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ring-4 ring-white ${a.circulo}`}>
                          <Icono className="h-[18px] w-[18px]" aria-hidden />
                        </span>
                        <div className={`flex-1 rounded-xl border border-l-4 border-linea bg-white px-4 py-3 ${a.borde}`}>
                          <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                            <p className="font-poppins text-sm font-semibold text-azul-hondo">{a.titulo}</p>
                            <p className="text-xs text-gris">{hora(l.created_at)}</p>
                          </div>
                          {l.detalle && <p className="mt-1 text-sm text-tinta/80">{l.detalle}</p>}
                          {!delSistema && (
                            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gris">
                              <span className="inline-flex items-center gap-1">
                                <MapPin className="h-3.5 w-3.5" aria-hidden />
                                {lugar ?? 'Ubicación no registrada'}
                              </span>
                              {disp && (
                                <span className="inline-flex items-center gap-1">
                                  <DispIcono className="h-3.5 w-3.5" aria-hidden />
                                  {disp.texto}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </div>
            ))}
          </section>
        </div>

        <footer className="flex items-center justify-end gap-3 border-t border-linea px-6 py-3">
          <Boton tam="sm" onClick={descargarHistorial} cargando={descargando}>
            <Download className="h-4 w-4" aria-hidden />
            Descargar historial
          </Boton>
          <Boton variante="secundario" tam="sm" onClick={onCerrar}>
            Cerrar
          </Boton>
        </footer>
      </div>
    </div>
  );
}
