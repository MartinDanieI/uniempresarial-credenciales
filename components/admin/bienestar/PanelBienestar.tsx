'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { EstadoCorreo, ResumenBienestar, StudentTrazabilidad } from '@/lib/types';
import { Alerta, Badge, Boton, formatoFecha } from '../../ui';
import { Historial } from './Historial';

interface Respuesta {
  students: StudentTrazabilidad[];
  total: number;
  page: number;
  pageSize: number;
  resumen: ResumenBienestar;
  error?: string;
}

const ESTADOS: Record<EstadoCorreo, { texto: string; color: 'gris' | 'verde' | 'azul' | 'rojo' }> = {
  pendiente: { texto: 'Pendiente', color: 'gris' },
  enviado: { texto: 'Enviado', color: 'verde' },
  recordatorio_enviado: { texto: 'Recordatorio', color: 'azul' },
  error: { texto: 'Error', color: 'rojo' },
};

function Kpi({ titulo, valor, detalle, acento }: { titulo: string; valor: number; detalle?: string; acento: string }) {
  return (
    <div className="rounded-xl border border-linea bg-superficie p-5">
      <p className="text-xs font-medium rotulo text-gris">{titulo}</p>
      <p className={`titulo mt-3 text-[2.75rem] leading-none tabular-nums ${acento}`}>{valor.toLocaleString('es-CO')}</p>
      {detalle && <p className="mt-1 text-xs text-gris">{detalle}</p>}
    </div>
  );
}

/** FECHA de la plantilla (AAAA-MM-DD) → día/mes/año. */
const fechaCorta = (iso: string | null) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : '—');

const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)} % del total` : '—');

export function PanelBienestar() {
  const [q, setQ] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [programa, setPrograma] = useState('');
  const [modalidad, setModalidad] = useState('');
  const [ingreso, setIngreso] = useState('');
  const [estado, setEstado] = useState('');
  const [page, setPage] = useState(1);
  const [datos, setDatos] = useState<Respuesta | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [envioMasivo, setEnvioMasivo] = useState<{ enviados: number; restantes: number } | null>(null);
  const [reenviando, setReenviando] = useState<string | null>(null);
  const [historial, setHistorial] = useState<StudentTrazabilidad | null>(null);

  // Búsqueda con pequeño retardo
  useEffect(() => {
    const t = setTimeout(() => {
      setBusqueda(q.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [q]);

  const filtros = useMemo(() => {
    const p = new URLSearchParams();
    if (busqueda) p.set('q', busqueda);
    if (programa) p.set('programa', programa);
    if (modalidad) p.set('modalidad', modalidad);
    if (ingreso) p.set('ingreso', ingreso);
    if (estado) p.set('estado', estado);
    return p;
  }, [busqueda, programa, modalidad, ingreso, estado]);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      const p = new URLSearchParams(filtros);
      p.set('page', String(page));
      p.set('pageSize', '25');
      const res = await fetch(`/api/bienestar/students?${p}`, { cache: 'no-store' });
      const data = (await res.json()) as Respuesta;
      if (!res.ok) throw new Error(data.error);
      setDatos(data);
    } catch (err) {
      setError((err as Error).message || 'No se pudo cargar la información.');
    } finally {
      setCargando(false);
    }
  }, [filtros, page]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void cargar();
  }, [cargar]);

  const enviarBienvenidaMasiva = async () => {
    const pendientes = datos?.resumen.pendientes_envio ?? 0;
    if (!pendientes) return;
    if (!confirm(`Se enviará el correo de bienvenida a ${pendientes} estudiantes en estado pendiente. ¿Continuar?`)) return;

    setAviso('');
    setError('');
    let enviados = 0;
    let fallidos = 0;
    setEnvioMasivo({ enviados: 0, restantes: pendientes });
    try {
      for (let vuelta = 0; vuelta < 500; vuelta++) {
        const res = await fetch('/api/bienestar/send-welcome', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: '{}',
        });
        const data = (await res.json()) as { enviados: number; errores: unknown[]; restantes: number; error?: string };
        if (!res.ok) throw new Error(data.error);
        enviados += data.enviados;
        fallidos += data.errores.length;
        setEnvioMasivo({ enviados, restantes: data.restantes });
        if (!data.restantes || data.enviados + data.errores.length === 0) break;
      }
      setAviso(`Envío completado: ${enviados} correos enviados${fallidos ? `, ${fallidos} con error (filtra por estado “Error”)` : ''}.`);
    } catch (err) {
      setError(`El envío se detuvo: ${(err as Error).message}. Enviados hasta ahora: ${enviados}.`);
    } finally {
      setEnvioMasivo(null);
      void cargar();
    }
  };

  const reenviar = async (s: StudentTrazabilidad) => {
    setReenviando(s.id);
    setAviso('');
    setError('');
    try {
      const res = await fetch('/api/bienestar/reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: s.id }),
      });
      const data = (await res.json()) as { error?: string; tipo?: string };
      if (!res.ok) throw new Error(data.error);
      setAviso(`${data.tipo === 'recordatorio' ? 'Recordatorio' : 'Bienvenida'} enviado a ${s.nombre_completo}.`);
      void cargar();
    } catch (err) {
      setError((err as Error).message || 'No se pudo enviar.');
    } finally {
      setReenviando(null);
    }
  };

  const r = datos?.resumen;
  const totalPaginas = datos ? Math.max(1, Math.ceil(datos.total / datos.pageSize)) : 1;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="rotulo text-[11px] text-ue">Bienestar Universitario</p>
          <h1 className="titulo text-azul-hondo mt-3 text-[2.5rem]">Trazabilidad de credenciales</h1>
          <p className="text-sm text-gris">
            Seguimiento de envíos y consultas. Los recordatorios automáticos salen cada día a quienes no han ingresado tras 48 h.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href={`/api/bienestar/export?${filtros}`}
            className="font-poppins inline-flex items-center rounded-pill border border-linea-media bg-white px-5 py-2.5 text-sm font-medium text-tinta hover:border-azul hover:text-azul"
          >
            Exportar a Excel
          </a>
          <Boton onClick={enviarBienvenidaMasiva} cargando={!!envioMasivo} disabled={!r?.pendientes_envio}>
            ✉ Enviar bienvenida a pendientes ({r?.pendientes_envio ?? 0})
          </Boton>
        </div>
      </div>

      {envioMasivo && (
        <Alerta tipo="info">
          Enviando correos… {envioMasivo.enviados} enviados, {envioMasivo.restantes} pendientes. No cierres esta pestaña.
        </Alerta>
      )}
      {aviso && <Alerta tipo="exito">{aviso}</Alerta>}
      {error && <Alerta>{error}</Alerta>}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi titulo="Total admitidos" valor={r?.total ?? 0} acento="text-tinta" detalle={`${r?.errores ?? 0} con error de envío`} />
        <Kpi titulo="Bienvenidas enviadas" valor={r?.enviados ?? 0} acento="text-azul-claro" detalle={pct(r?.enviados ?? 0, r?.total ?? 0)} />
        <Kpi titulo="Ya abrieron credenciales" valor={r?.ingresaron ?? 0} acento="text-emerald-700" detalle={pct(r?.ingresaron ?? 0, r?.total ?? 0)} />
        <Kpi titulo="Pendientes por ingresar" valor={r?.sin_ingresar ?? 0} acento="text-ue" detalle={pct(r?.sin_ingresar ?? 0, r?.total ?? 0)} />
      </div>

      <section className="rounded-xl border border-linea bg-superficie">
        <div className="grid gap-3 border-b border-linea p-4 md:grid-cols-[2fr_1.4fr_1fr_1fr_1fr]">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por cédula, nombre o correo…"
            className="rounded-pill border border-linea-media bg-white px-4 py-2.5 text-sm text-tinta outline-none placeholder:text-gris/70 focus:border-azul focus:ring-2 focus:ring-azul/15"
            aria-label="Buscar"
          />
          {[
            { v: programa, s: setPrograma, l: 'Todos los programas', o: r?.programas ?? [] },
            { v: modalidad, s: setModalidad, l: 'Toda modalidad', o: r?.modalidades ?? [] },
          ].map((f) => (
            <select
              key={f.l}
              value={f.v}
              onChange={(e) => {
                f.s(e.target.value);
                setPage(1);
              }}
              className="rounded-pill border border-linea-media bg-white px-4 py-2.5 text-sm text-tinta outline-none placeholder:text-gris/70 focus:border-azul focus:ring-2 focus:ring-azul/15"
              aria-label={f.l}
            >
              <option value="">{f.l}</option>
              {f.o.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          ))}
          <select
            value={ingreso}
            onChange={(e) => {
              setIngreso(e.target.value);
              setPage(1);
            }}
            className="rounded-pill border border-linea-media bg-white px-4 py-2.5 text-sm text-tinta outline-none placeholder:text-gris/70 focus:border-azul focus:ring-2 focus:ring-azul/15"
            aria-label="Estado de lectura"
          >
            <option value="">¿Ingresó? Todos</option>
            <option value="si">Sí ingresó</option>
            <option value="no">No ha ingresado</option>
          </select>
          <select
            value={estado}
            onChange={(e) => {
              setEstado(e.target.value);
              setPage(1);
            }}
            className="rounded-pill border border-linea-media bg-white px-4 py-2.5 text-sm text-tinta outline-none placeholder:text-gris/70 focus:border-azul focus:ring-2 focus:ring-azul/15"
            aria-label="Estado de envío"
          >
            <option value="">Envío: todos</option>
            {Object.entries(ESTADOS).map(([k, v]) => (
              <option key={k} value={k}>
                {v.texto}
              </option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1200px] text-left text-sm">
            <thead className="bg-fondo text-[11px] rotulo text-gris">
              <tr>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Documento</th>
                <th className="px-4 py-3">Programa</th>
                <th className="px-4 py-3">Usuario Ue</th>
                <th className="px-4 py-3">Usuario correo UE</th>
                <th className="px-4 py-3">Estado de envío</th>
                <th className="px-4 py-3">Firma recibido</th>
                <th className="px-4 py-3">Último acceso</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className={cargando ? 'opacity-50' : ''}>
              {datos?.students.map((s) => {
                const est = ESTADOS[s.estado_correo] ?? ESTADOS.pendiente;
                return (
                  <tr key={s.id} className="border-t border-linea align-top hover:bg-fondo/60">
                    <td className="px-4 py-3 text-xs whitespace-nowrap">{fechaCorta(s.fecha_registro)}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium">{s.nombre_completo}</p>
                      <p className="text-xs text-gris">{s.correo_personal}</p>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{s.documento_identidad}</td>
                    <td className="px-4 py-3 text-xs">
                      {s.programa_academico}
                      <p className="text-[11px] text-gris">{s.modalidad}</p>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{s.usuario_glpi}</td>
                    <td className="px-4 py-3 text-xs">{s.correo_institucional}</td>
                    <td className="px-4 py-3">
                      <Badge color={est.color}>{est.texto}</Badge>
                      {s.fecha_envio_correo && <p className="mt-1 text-[11px] text-gris">{formatoFecha(s.fecha_envio_correo)}</p>}
                      {s.cantidad_recordatorios > 0 && (
                        <p className="text-[11px] text-gris">{s.cantidad_recordatorios} recordatorio(s)</p>
                      )}
                      {s.estado_correo === 'error' && s.ultimo_error_correo && (
                        <p className="mt-1 max-w-[200px] truncate text-[11px] text-ue" title={s.ultimo_error_correo}>
                          {s.ultimo_error_correo}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {s.ha_ingresado ? (
                        <>
                          <Badge color="verde">Recibido</Badge>
                          <p className="mt-1 text-[11px] whitespace-nowrap text-gris">{formatoFecha(s.fecha_primer_ingreso)}</p>
                        </>
                      ) : s.firma_recibido ? (
                        <>
                          <Badge color="azul">Firmado</Badge>
                          <p className="mt-1 max-w-[160px] truncate text-[11px] text-gris" title={s.firma_recibido}>
                            {s.firma_recibido}
                          </p>
                        </>
                      ) : (
                        <Badge color="rojo">Pendiente</Badge>
                      )}
                      {s.ha_cambiado_password && <p className="mt-1 text-[11px] text-gris">Restableció clave</p>}
                    </td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap">{formatoFecha(s.fecha_ultimo_ingreso)}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Boton tam="sm" variante="secundario" onClick={() => setHistorial(s)}>
                          Historial
                        </Boton>
                        <Boton tam="sm" variante="fantasma" onClick={() => reenviar(s)} cargando={reenviando === s.id}>
                          {s.fecha_envio_correo ? 'Reenviar recordatorio' : 'Enviar bienvenida'}
                        </Boton>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {datos && !datos.students.length && (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-gris">
                    No hay estudiantes con estos filtros.
                  </td>
                </tr>
              )}
              {!datos && cargando && (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-gris">
                    Cargando…
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-linea px-4 py-3 text-sm">
          <span className="text-gris">{datos ? `${datos.total.toLocaleString('es-CO')} resultados` : ''}</span>
          <div className="flex items-center gap-2">
            <Boton tam="sm" variante="secundario" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              ← Anterior
            </Boton>
            <span className="tabular-nums">
              {page} / {totalPaginas}
            </span>
            <Boton tam="sm" variante="secundario" disabled={page >= totalPaginas} onClick={() => setPage((p) => p + 1)}>
              Siguiente →
            </Boton>
          </div>
        </div>
      </section>

      {historial && <Historial student={historial} onCerrar={() => setHistorial(null)} />}
    </div>
  );
}
