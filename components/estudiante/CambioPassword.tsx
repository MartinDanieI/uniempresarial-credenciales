'use client';
import { useEffect, useRef, useState } from 'react';
import { LINKS } from '@/lib/institucional';
import { Alerta, Boton, BotonCopiar } from '../ui';

export function CambioPassword({
  demo,
  onCerrar,
  onCambiada,
}: {
  demo: boolean;
  onCerrar: () => void;
  onCambiada: (password: string) => void;
}) {
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [nueva, setNueva] = useState('');
  const dialogo = useRef<HTMLDivElement>(null);

  useEffect(() => {
    dialogo.current?.focus();
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onCerrar();
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [onCerrar]);

  const confirmar = async () => {
    setCargando(true);
    setError('');
    try {
      if (demo) {
        await new Promise((r) => setTimeout(r, 700));
        setNueva('Demo#7kQ2mPx');
        onCambiada('Demo#7kQ2mPx');
        return;
      }
      const res = await fetch('/api/student/change-password', { method: 'POST' });
      const data = (await res.json().catch(() => ({}))) as { error?: string; password?: string };
      if (!res.ok || !data.password) throw new Error(data.error || 'No fue posible restablecer la contraseña.');
      setNueva(data.password);
      onCambiada(data.password);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="no-print fixed inset-0 z-50 flex items-center justify-center bg-azul-hondo/60 p-4" onClick={onCerrar}>
      <div
        ref={dialogo}
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-cambio"
        tabIndex={-1}
        className="w-full max-w-md rounded-2xl border-2 border-azul-hondo bg-white p-7 outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="rotulo text-[11px] text-ue">Seguridad</p>
        <h3 id="titulo-cambio" className="titulo mt-2 text-2xl text-azul-hondo">
          Restablecer contraseña
        </h3>

        {!nueva ? (
          <>
            <p className="mt-4 text-sm leading-relaxed text-gris">
              Generaremos una contraseña temporal nueva para tu cuenta de Microsoft 365 (correo, Teams y Campus Virtual). La
              anterior dejará de funcionar y al ingresar Office te pedirá crear una personal.
            </p>
            {error && (
              <div className="mt-5">
                <Alerta>{error}</Alerta>
              </div>
            )}
            <div className="mt-8 flex items-center justify-end gap-5">
              <Boton variante="fantasma" onClick={onCerrar}>
                Cancelar
              </Boton>
              <Boton onClick={confirmar} cargando={cargando}>
                Generar contraseña
              </Boton>
            </div>
          </>
        ) : (
          <>
            <div className="mt-6">
              <Alerta tipo="exito">Listo. Tu contraseña temporal es:</Alerta>
            </div>
            <div className="mt-4 flex items-center gap-3 rounded-pill border border-linea-media py-2 pl-5 pr-2">
              <code className="flex-1 font-mono text-lg font-semibold text-azul-hondo">{nueva}</code>
              <BotonCopiar texto={nueva} />
            </div>
            <p className="mt-4 text-sm text-gris">
              Ingresa ya a{' '}
              <a href={LINKS.m365} target="_blank" rel="noreferrer" className="font-medium text-azul hover:underline">
                Microsoft 365
              </a>{' '}
              y define tu contraseña personal. El cambio puede tardar uno o dos minutos.
            </p>
            <div className="mt-8 flex justify-end">
              <Boton onClick={onCerrar}>Entendido</Boton>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
