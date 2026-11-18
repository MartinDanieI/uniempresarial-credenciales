'use client';
import { useEffect, useState } from 'react';
import type { StudentCredenciales } from '@/lib/types';
import { Alerta, Boton } from '../ui';
import { solicitarOtp } from './PasoCedula';

const ESPERA_REENVIO = 60;

export function PasoOtp({
  documento,
  correoEnmascarado,
  onVerificado,
  onReenviado,
  onVolver,
}: {
  documento: string;
  correoEnmascarado: string;
  onVerificado: (s: StudentCredenciales) => void;
  onReenviado: (correo: string) => void;
  onVolver: () => void;
}) {
  const [codigo, setCodigo] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [espera, setEspera] = useState(ESPERA_REENVIO);

  useEffect(() => {
    if (espera <= 0) return;
    const t = setTimeout(() => setEspera((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [espera]);

  const verificar = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (codigo.length !== 6) {
      setError('El código tiene 6 dígitos.');
      return;
    }
    setCargando(true);
    setError('');
    try {
      const res = await fetch('/api/student/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documento_identidad: documento, codigo_otp: codigo }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; student?: StudentCredenciales };
      if (!res.ok || !data.student) throw new Error(data.error || 'No pudimos validar el código.');
      onVerificado(data.student);
    } catch (err) {
      setError((err as Error).message);
      setCodigo('');
    } finally {
      setCargando(false);
    }
  };

  const reenviar = async () => {
    setError('');
    setAviso('');
    try {
      onReenviado(await solicitarOtp(documento));
      setAviso('Te enviamos un código nuevo. El anterior ya no es válido.');
      setEspera(ESPERA_REENVIO);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <form onSubmit={verificar} className="space-y-6" noValidate>
      <div>
        <h2 className="titulo text-2xl text-azul-hondo">Revisa tu correo personal</h2>
        <p className="mt-1.5 text-sm text-gris">
          Enviamos un código de 6 dígitos a <span className="font-medium text-tinta">{correoEnmascarado}</span>. Vence en 10 minutos.
        </p>
      </div>

      <label className="block">
        <span className="font-poppins mb-1.5 block pl-2 text-xs font-medium text-tinta">Código de verificación</span>
        <input
          className="w-full rounded-pill border border-linea-media bg-white py-3 text-center font-mono text-3xl tracking-[0.5em] text-azul-hondo outline-none placeholder:text-linea-media focus:border-azul focus:ring-2 focus:ring-azul/15"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          placeholder="······"
          value={codigo}
          onChange={(e) => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 6))}
          autoFocus
          aria-describedby="ayuda-otp"
        />
      </label>

      {error && <Alerta>{error}</Alerta>}
      {aviso && <Alerta tipo="exito">{aviso}</Alerta>}

      <Boton type="submit" cargando={cargando} className="w-full" disabled={codigo.length !== 6}>
        Validar y ver mis credenciales
      </Boton>

      <div id="ayuda-otp" className="flex flex-wrap items-center justify-between gap-3">
        <Boton type="button" variante="fantasma" tam="sm" onClick={onVolver}>
          ← Cambiar documento
        </Boton>
        <Boton type="button" variante="fantasma" tam="sm" onClick={reenviar} disabled={espera > 0}>
          {espera > 0 ? `Reenviar en ${espera}s` : 'Reenviar código'}
        </Boton>
      </div>
      <p className="text-xs text-gris">¿No llega? Revisa las carpetas de spam o correo no deseado.</p>
    </form>
  );
}
