'use client';
import { useState } from 'react';
import { MODALIDADES } from '@/lib/types';
import { Alerta, Badge, Boton, Campo, Selector } from '../../ui';

const VACIO = {
  fecha_registro: '',
  documento_identidad: '',
  nombre_completo: '',
  programa_academico: '',
  modalidad: 'Presencial',
  correo_personal: '',
  correo_institucional: '',
  password_inicial: '',
};

type Datos = typeof VACIO;

export function FormEstudiante() {
  const [datos, setDatos] = useState<Datos>(VACIO);
  const [buscar, setBuscar] = useState('');
  const [editando, setEditando] = useState(false);
  const [cargando, setCargando] = useState<'buscar' | 'guardar' | null>(null);
  const [mensaje, setMensaje] = useState<{ tipo: 'error' | 'exito'; texto: string } | null>(null);

  const set = (k: keyof Datos) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setDatos((d) => ({ ...d, [k]: e.target.value }));

  const cargar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!buscar.trim()) return;
    setCargando('buscar');
    setMensaje(null);
    try {
      const res = await fetch(`/api/ti/students?documento=${encodeURIComponent(buscar.trim())}`, { cache: 'no-store' });
      const data = (await res.json()) as { student?: Datos; error?: string };
      if (!res.ok || !data.student) throw new Error(data.error);
      const s = data.student;
      setDatos({
        fecha_registro: s.fecha_registro ?? '',
        documento_identidad: s.documento_identidad,
        nombre_completo: s.nombre_completo,
        programa_academico: s.programa_academico,
        modalidad: s.modalidad || 'Presencial',
        correo_personal: s.correo_personal,
        correo_institucional: s.correo_institucional,
        password_inicial: s.password_inicial,
      });
      setEditando(true);
    } catch (err) {
      setMensaje({ tipo: 'error', texto: (err as Error).message || 'No encontrado' });
    } finally {
      setCargando(null);
    }
  };

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    setCargando('guardar');
    setMensaje(null);
    try {
      const res = await fetch('/api/ti/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datos),
      });
      const data = (await res.json()) as { error?: string; student?: { nombre_completo: string; usuario_glpi: string } };
      if (!res.ok) throw new Error(data.error);
      setMensaje({
        tipo: 'exito',
        texto: `${editando ? 'Actualizado' : 'Creado'}: ${data.student?.nombre_completo} (GLPI: ${data.student?.usuario_glpi})`,
      });
      setDatos(VACIO);
      setEditando(false);
      setBuscar('');
    } catch (err) {
      setMensaje({ tipo: 'error', texto: (err as Error).message || 'No se pudo guardar' });
    } finally {
      setCargando(null);
    }
  };

  const glpi = datos.correo_institucional.split('@')[0];

  return (
    <section className="rounded-2xl border border-linea bg-white p-6">
      <div className="flex items-center justify-between gap-2">
        <h2 className="titulo text-azul-hondo text-lg">{editando ? 'Editar estudiante' : 'Agregar estudiante'}</h2>
        {editando && <Badge color="azul">Editando {datos.documento_identidad}</Badge>}
      </div>

      <form onSubmit={cargar} className="mt-4 flex gap-2">
        <input
          value={buscar}
          onChange={(e) => setBuscar(e.target.value)}
          placeholder="Buscar por documento para editar"
          className="flex-1 rounded-pill border border-linea-media bg-white px-4 py-2.5 text-sm text-tinta outline-none placeholder:text-gris/70 focus:border-azul focus:ring-2 focus:ring-azul/15"
        />
        <Boton type="submit" variante="secundario" tam="sm" cargando={cargando === 'buscar'}>
          Buscar
        </Boton>
      </form>

      <form onSubmit={guardar} className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
        <Campo etiqueta="Fecha" type="date" value={datos.fecha_registro} onChange={set('fecha_registro')} />
        <Campo etiqueta="Documento" value={datos.documento_identidad} onChange={set('documento_identidad')} readOnly={editando} required />
        <Campo etiqueta="Nombre completo" value={datos.nombre_completo} onChange={set('nombre_completo')} required />
        <Campo etiqueta="Programa académico" value={datos.programa_academico} onChange={set('programa_academico')} required />
        <Selector
          etiqueta="Modalidad"
          value={datos.modalidad}
          onChange={set('modalidad')}
          opciones={[...new Set([...MODALIDADES, datos.modalidad])].map((m) => ({ valor: m, texto: m }))}
        />
        <Campo etiqueta="Correo personal" type="email" value={datos.correo_personal} onChange={set('correo_personal')} required />
        <Campo
          etiqueta="Correo institucional"
          type="email"
          value={datos.correo_institucional}
          onChange={set('correo_institucional')}
          placeholder="usuario@uniempresarial.edu.co"
          ayuda={glpi ? `Usuario GLPI: ${glpi}` : undefined}
          required
        />
        <Campo etiqueta="Contraseña inicial" value={datos.password_inicial} onChange={set('password_inicial')} autoComplete="off" required />
        <div className="flex items-end gap-2">
          <Boton type="submit" cargando={cargando === 'guardar'} className="flex-1">
            {editando ? 'Guardar cambios' : 'Agregar estudiante'}
          </Boton>
          {editando && (
            <Boton
              type="button"
              variante="secundario"
              onClick={() => {
                setDatos(VACIO);
                setEditando(false);
              }}
            >
              Nuevo
            </Boton>
          )}
        </div>
      </form>

      {mensaje && (
        <div className="mt-4">
          <Alerta tipo={mensaje.tipo}>{mensaje.texto}</Alerta>
        </div>
      )}
    </section>
  );
}
