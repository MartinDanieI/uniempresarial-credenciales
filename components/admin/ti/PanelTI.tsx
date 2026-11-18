'use client';
import { useCallback, useEffect, useState } from 'react';
import type { UploadBatch } from '@/lib/types';
import { Alerta, formatoFecha } from '../../ui';
import { CargaMasiva } from './CargaMasiva';
import { FormEstudiante } from './FormEstudiante';

export function PanelTI() {
  const [lotes, setLotes] = useState<UploadBatch[]>([]);
  const [error, setError] = useState('');

  const cargarLotes = useCallback(async () => {
    try {
      const res = await fetch('/api/ti/batches', { cache: 'no-store' });
      const data = (await res.json()) as { lotes?: UploadBatch[]; error?: string };
      if (!res.ok) throw new Error(data.error);
      setLotes(data.lotes ?? []);
    } catch (err) {
      setError((err as Error).message || 'No se pudieron cargar los lotes.');
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void cargarLotes();
  }, [cargarLotes]);

  return (
    <div className="space-y-8">
      <div>
        <p className="rotulo text-[11px] text-ue">Panel de Tecnología</p>
        <h1 className="titulo text-azul-hondo mt-3 text-[2.5rem]">Carga y sincronización</h1>
        <p className="mt-3 max-w-2xl text-sm text-gris">
          Carga el listado de admitidos con las cuentas creadas en el Directorio Activo / Microsoft 365. El usuario de GLPI se
          calcula automáticamente.
        </p>
      </div>

      <div className="grid gap-8 xl:grid-cols-[1.6fr_1fr]">
        <CargaMasiva onCargado={cargarLotes} />
        <FormEstudiante />
      </div>

      <section className="rounded-2xl border border-linea bg-white p-6">
        <h2 className="titulo text-azul-hondo text-lg">Lotes cargados recientemente</h2>
        {error && (
          <div className="mt-3">
            <Alerta>{error}</Alerta>
          </div>
        )}
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-linea text-xs rotulo text-gris">
              <tr>
                <th className="py-2 pr-4">Fecha</th>
                <th className="py-2 pr-4">Archivo</th>
                <th className="py-2 pr-4 text-right">Filas</th>
                <th className="py-2 pr-4 text-right">Nuevos</th>
                <th className="py-2 pr-4 text-right">Actualizados</th>
                <th className="py-2">Cargado por</th>
              </tr>
            </thead>
            <tbody>
              {lotes.map((l) => (
                <tr key={l.id} className="border-b border-linea/70 last:border-0">
                  <td className="py-2.5 pr-4 whitespace-nowrap">{formatoFecha(l.created_at)}</td>
                  <td className="py-2.5 pr-4 font-medium">{l.nombre_archivo}</td>
                  <td className="py-2.5 pr-4 text-right tabular-nums">{l.total_filas}</td>
                  <td className="py-2.5 pr-4 text-right tabular-nums text-emerald-700">{l.insertados}</td>
                  <td className="py-2.5 pr-4 text-right tabular-nums text-azul-claro">{l.actualizados}</td>
                  <td className="py-2.5">{l.cargado_por ?? '—'}</td>
                </tr>
              ))}
              {!lotes.length && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gris">
                    Aún no hay lotes cargados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
