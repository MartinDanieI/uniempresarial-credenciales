'use client';
import { useEffect, useState } from 'react';
import { STUDENT_DEMO } from '@/lib/demo';
import type { StudentCredenciales } from '@/lib/types';
import { IconoCuadro, Spinner } from '../ui';
import { PasoCedula } from './PasoCedula';
import { PasoOtp } from './PasoOtp';
import { ManualCredenciales } from './ManualCredenciales';

type Paso = 'cargando' | 'cedula' | 'otp' | 'manual';

const PASOS = [
  { id: 'cedula', titulo: 'Documento' },
  { id: 'otp', titulo: 'Verificación' },
  { id: 'manual', titulo: 'Credenciales' },
] as const;

const PLATAFORMAS = [
  { sigla: '@', nombre: 'Correo Microsoft 365' },
  { sigla: 'M', nombre: 'Campus Virtual' },
  { sigla: 'G', nombre: 'Mesa de Servicios' },
  { sigla: 'S', nombre: 'Gestión Académica' },
];

export function PortalEstudiante({ demo }: { demo: boolean }) {
  const [paso, setPaso] = useState<Paso>(demo ? 'manual' : 'cargando');
  const [documento, setDocumento] = useState('');
  const [correoEnmascarado, setCorreoEnmascarado] = useState('');
  const [student, setStudent] = useState<StudentCredenciales | null>(demo ? STUDENT_DEMO : null);

  // Si la sesión del estudiante sigue vigente (recargó la página) vuelve al manual
  useEffect(() => {
    if (demo) return;
    let activo = true;
    fetch('/api/student/session')
      .then((r) => r.json())
      .then((d: { student: StudentCredenciales | null }) => {
        if (!activo) return;
        if (d.student) {
          setStudent(d.student);
          setPaso('manual');
        } else setPaso('cedula');
      })
      .catch(() => activo && setPaso('cedula'));
    return () => {
      activo = false;
    };
  }, [demo]);

  const salir = async () => {
    if (!demo) await fetch('/api/student/session', { method: 'DELETE' }).catch(() => undefined);
    setStudent(null);
    setDocumento('');
    setPaso('cedula');
  };

  if (paso === 'cargando') {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-azul">
        <Spinner className="h-7 w-7" />
      </div>
    );
  }

  if (paso === 'manual' && student) {
    return <ManualCredenciales student={student} demo={demo} onActualizar={setStudent} onSalir={salir} />;
  }

  const indice = PASOS.findIndex((p) => p.id === paso);

  return (
    <>
      <section className="bg-azul text-white">
        <div className="grid gap-8 px-4 py-5 sm:px-8 sm:py-10 lg:grid-cols-[1.15fr_1fr] lg:items-center lg:gap-14 lg:py-16">
          {/* En celular el formulario va primero; el texto de presentación queda debajo */}
          <div className="order-2 lg:order-1">
            <p className="rotulo text-[11px] text-white/75">Portal de autogestión · Admitidos</p>
            <h1 className="titulo mt-4 text-[2.1rem] leading-[1.05] sm:text-display">
              Consulta tus credenciales institucionales
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-white/85">
              Accede de forma segura a tu correo institucional, el Campus Virtual y la Mesa de Servicios. Solo necesitas tu
              número de documento y el código que enviaremos a tu correo personal.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {PLATAFORMAS.map((p) => (
                <span key={p.nombre} className="inline-flex items-center gap-2.5 rounded-pill bg-white py-1.5 pl-1.5 pr-4 text-sm text-tinta">
                  <IconoCuadro>{p.sigla}</IconoCuadro>
                  {p.nombre}
                </span>
              ))}
            </div>
          </div>

          <div className="order-1 rounded-2xl border-2 border-azul-hondo bg-white p-5 text-tinta sm:p-8 lg:order-2">
            <ol className="mb-8 flex items-center gap-2" aria-label="Progreso">
              {PASOS.map((p, i) => (
                <li key={p.id} className="flex flex-1 items-center gap-2">
                  <span
                    className={`font-poppins flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                      i < indice ? 'bg-ue text-white' : i === indice ? 'bg-azul text-white' : 'bg-fondo text-gris'
                    }`}
                    aria-current={i === indice ? 'step' : undefined}
                  >
                    {i < indice ? '✓' : i + 1}
                  </span>
                  <span className={`font-poppins hidden text-xs font-medium sm:inline ${i <= indice ? 'text-tinta' : 'text-gris'}`}>
                    {p.titulo}
                  </span>
                  {i < PASOS.length - 1 && <span className={`h-px flex-1 ${i < indice ? 'bg-ue' : 'bg-linea'}`} />}
                </li>
              ))}
            </ol>

            {paso === 'cedula' && (
              <PasoCedula
                documentoInicial={documento}
                onEnviado={(doc, correo) => {
                  setDocumento(doc);
                  setCorreoEnmascarado(correo);
                  setPaso('otp');
                }}
              />
            )}
            {paso === 'otp' && (
              <PasoOtp
                documento={documento}
                correoEnmascarado={correoEnmascarado}
                onReenviado={setCorreoEnmascarado}
                onVolver={() => setPaso('cedula')}
                onVerificado={(s) => {
                  setStudent(s);
                  setPaso('manual');
                  window.scrollTo({ top: 0 });
                }}
              />
            )}
          </div>
        </div>
      </section>

      <section className="px-4 py-12 sm:px-8">
        <p className="rotulo text-center text-sm text-ue">¿Cómo funciona?</p>
        <div className="mx-auto mt-6 grid max-w-5xl gap-4 md:grid-cols-3">
          {[
            ['Ingresa tu documento', 'El mismo número con el que realizaste tu proceso de admisión.'],
            ['Valida el código', 'Te llega a tu correo personal y vence en 10 minutos.'],
            ['Consulta y descarga', 'Tus credenciales, el manual en PDF y los accesos directos con QR.'],
          ].map(([t, d], i) => (
            <div key={t} className="flex gap-4 rounded-xl border border-linea p-5">
              <IconoCuadro color={i === 1 ? 'rojo' : 'azul'}>{i + 1}</IconoCuadro>
              <div>
                <p className="font-poppins font-semibold text-azul-hondo">{t}</p>
                <p className="mt-1 text-sm text-gris">{d}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
