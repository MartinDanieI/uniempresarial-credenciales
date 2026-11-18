'use client';
import { useRef, useState } from 'react';
import { Alerta, Badge, Boton } from '../../ui';

interface FilaPrevia {
  fila: number;
  errores: string[];
  existe: boolean;
  datos: Record<string, string | undefined>;
}

interface Previsualizacion {
  hoja: string;
  nombreArchivo: string;
  columnasArchivo: string[];
  mapeo: Record<string, string | null>;
  totalFilas: number;
  validas: number;
  nuevos: number;
  actualizar: number;
  conErrores: number;
  filas: FilaPrevia[];
  procesados?: number;
}

const CAMPOS: [string, string][] = [
  ['fecha_registro', 'FECHA'],
  ['nombre_completo', 'NOMBRE'],
  ['documento_identidad', 'DOCUMENTO'],
  ['correo_personal', 'CORREO PERSONAL'],
  ['programa_academico', 'PROGRAMA'],
  ['usuario_ue', 'Usuario Ue'],
  ['correo_institucional', 'USUARIO CORREO UE'],
  ['password_inicial', 'CONTRASEÑA CORREO UE'],
  ['firma_recibido', 'FIRMA RECIBIDO'],
  ['modalidad', 'MODALIDAD'],
];

/** Columnas opcionales: si faltan se usa el valor por defecto o se calcula. */
const OPCIONALES: Record<string, string> = {
  fecha_registro: 'opcional',
  usuario_ue: 'se calcula del correo',
  firma_recibido: 'opcional',
  modalidad: 'Presencial por defecto',
};

/** Encabezados de la plantilla oficial "PLANTILLA PLATAFORMA.xlsx", en su orden. */
const ENCABEZADOS_PLANTILLA = [
  'FECHA',
  'NOMBRE',
  'DOCUMENTO',
  'CORREO PERSONAL',
  'PROGRAMA',
  'Usuario Ue',
  'USUARIO CORREO UE',
  'CONTRASEÑA CORREO UE',
  'FIRMA RECIBIDO',
];

const formatoFechaCorta = (iso?: string) =>
  iso && /^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : iso ?? '';

export function CargaMasiva({ onCargado }: { onCargado: () => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [previa, setPrevia] = useState<Previsualizacion | null>(null);
  const [cargando, setCargando] = useState<'previa' | 'confirmar' | null>(null);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');
  const [soloErrores, setSoloErrores] = useState(false);
  const [arrastrando, setArrastrando] = useState(false);

  const enviar = async (modo: 'previsualizar' | 'confirmar', file: File) => {
    setCargando(modo === 'confirmar' ? 'confirmar' : 'previa');
    setError('');
    setExito('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('modo', modo);
      const res = await fetch('/api/ti/upload-excel', { method: 'POST', body: fd });
      const data = (await res.json()) as Previsualizacion & { error?: string };
      if (!res.ok) throw new Error(data.error || 'Error al procesar el archivo');
      if (modo === 'confirmar') {
        setExito(`Carga completada: ${data.procesados} estudiantes (${data.nuevos} nuevos, ${data.actualizar} actualizados).`);
        setPrevia(null);
        setArchivo(null);
        if (input.current) input.current.value = '';
        onCargado();
      } else {
        setPrevia(data);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setCargando(null);
    }
  };

  const elegir = (file: File | undefined) => {
    if (!file) return;
    setArchivo(file);
    setPrevia(null);
    void enviar('previsualizar', file);
  };

  const filas = previa ? (soloErrores ? previa.filas.filter((f) => f.errores.length) : previa.filas) : [];

  return (
    <section className="rounded-2xl border border-linea bg-white p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="titulo text-azul-hondo text-lg">Carga masiva desde Excel</h2>
          <p className="text-sm text-gris">Previsualiza y valida antes de confirmar. Formatos: .xlsx, .xls, .csv</p>
        </div>
        <a
          href="/plantilla-plataforma.xlsx"
          download="PLANTILLA PLATAFORMA.xlsx"
          className="font-poppins inline-flex items-center rounded-pill border border-linea-media bg-white px-4 py-1.5 text-xs font-medium text-tinta hover:border-azul hover:text-azul"
        >
          Descargar plantilla oficial
        </a>
      </div>

      <label
        onDragOver={(e) => {
          e.preventDefault();
          setArrastrando(true);
        }}
        onDragLeave={() => setArrastrando(false)}
        onDrop={(e) => {
          e.preventDefault();
          setArrastrando(false);
          elegir(e.dataTransfer.files[0]);
        }}
        className={`mt-5 flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed px-6 py-10 text-center ${
          arrastrando ? 'border-azul bg-azul-suave/50' : 'border-linea-media hover:border-azul'
        }`}
      >
        <span className="font-poppins flex h-11 w-11 items-center justify-center rounded-xl bg-ue text-2xl font-semibold text-white" aria-hidden>
          +
        </span>
        <span className="font-poppins mt-3 text-sm font-medium">
          {archivo ? archivo.name : 'Arrastra el archivo aquí o haz clic para seleccionarlo'}
        </span>
        <span className="mt-1 text-xs text-gris">Columnas: {ENCABEZADOS_PLANTILLA.join(' · ')}</span>
        <input
          ref={input}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="sr-only"
          onChange={(e) => elegir(e.target.files?.[0])}
        />
      </label>

      <div className="mt-4 space-y-3">
        {cargando === 'previa' && <Alerta tipo="info">Analizando archivo…</Alerta>}
        {error && <Alerta>{error}</Alerta>}
        {exito && <Alerta tipo="exito">{exito}</Alerta>}
      </div>

      {previa && (
        <div className="mt-6 space-y-5">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ['Filas', previa.totalFilas, 'text-tinta'],
              ['Nuevos', previa.nuevos, 'text-emerald-700'],
              ['Actualizar', previa.actualizar, 'text-azul-claro'],
              ['Con errores', previa.conErrores, 'text-ue'],
            ].map(([t, v, c]) => (
              <div key={t as string} className="rounded-xl bg-fondo p-3">
                <p className="text-xs font-medium text-gris">{t}</p>
                <p className={`titulo text-[2rem] leading-none tabular-nums ${c}`}>{v}</p>
              </div>
            ))}
          </div>

          <div>
            <h3 className="rotulo text-xs">Columnas detectadas (hoja “{previa.hoja}”)</h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {CAMPOS.map(([campo, texto]) => (
                <span
                  key={campo}
                  className={`rounded-full border px-3 py-1 text-xs ${
                    previa.mapeo[campo] ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-800'
                  }`}
                >
                  {texto} → <strong>{previa.mapeo[campo] ?? OPCIONALES[campo] ?? 'no encontrada'}</strong>
                </span>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={soloErrores} onChange={(e) => setSoloErrores(e.target.checked)} className="accent-ue" />
              Ver solo filas con errores
            </label>
            <span className="text-xs text-gris">Mostrando {Math.min(filas.length, 300)} de {filas.length}</span>
          </div>

          <div className="max-h-[420px] overflow-auto rounded-xl border border-linea">
            <table className="w-full min-w-[1100px] text-left text-xs">
              <thead className="sticky top-0 bg-fondo text-[11px] rotulo text-gris">
                <tr>
                  <th className="px-3 py-2">Fila</th>
                  <th className="px-3 py-2">Fecha</th>
                  <th className="px-3 py-2">Nombre</th>
                  <th className="px-3 py-2">Documento</th>
                  <th className="px-3 py-2">Correo personal</th>
                  <th className="px-3 py-2">Programa</th>
                  <th className="px-3 py-2">Usuario Ue</th>
                  <th className="px-3 py-2">Usuario correo UE</th>
                  <th className="px-3 py-2">Firma recibido</th>
                  <th className="px-3 py-2">Estado</th>
                </tr>
              </thead>
              <tbody>
                {filas.slice(0, 300).map((f) => (
                  <tr key={f.fila} className={`border-t border-linea ${f.errores.length ? 'bg-ue-soft' : ''}`}>
                    <td className="px-3 py-2 tabular-nums text-gris">{f.fila}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{formatoFechaCorta(f.datos.fecha_registro)}</td>
                    <td className="px-3 py-2">{f.datos.nombre_completo}</td>
                    <td className="px-3 py-2 font-mono">{f.datos.documento_identidad}</td>
                    <td className="px-3 py-2">{f.datos.correo_personal}</td>
                    <td className="px-3 py-2">{f.datos.programa_academico}</td>
                    <td className="px-3 py-2 font-mono">
                      {f.datos.usuario_ue ?? <span className="text-gris">{f.datos.correo_institucional?.split('@')[0]}</span>}
                    </td>
                    <td className="px-3 py-2">{f.datos.correo_institucional}</td>
                    <td className="px-3 py-2">{f.datos.firma_recibido}</td>
                    <td className="px-3 py-2">
                      {f.errores.length ? (
                        <ul className="space-y-0.5 text-ue">
                          {f.errores.map((e) => (
                            <li key={e}>• {e}</li>
                          ))}
                        </ul>
                      ) : f.existe ? (
                        <Badge color="azul">Actualizar</Badge>
                      ) : (
                        <Badge color="verde">Nuevo</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3">
            {previa.conErrores > 0 && (
              <p className="text-xs text-gris">Las filas con errores se omitirán. Corrígelas y vuelve a cargarlas.</p>
            )}
            <Boton
              variante="secundario"
              onClick={() => {
                setPrevia(null);
                setArchivo(null);
                if (input.current) input.current.value = '';
              }}
            >
              Cancelar
            </Boton>
            <Boton
              onClick={() => archivo && enviar('confirmar', archivo)}
              cargando={cargando === 'confirmar'}
              disabled={!previa.validas}
            >
              Confirmar carga de {previa.validas} estudiantes
            </Boton>
          </div>
        </div>
      )}
    </section>
  );
}
