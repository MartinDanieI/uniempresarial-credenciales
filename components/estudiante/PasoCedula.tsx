'use client';
import { useState } from 'react';
import { Alerta, Boton, Campo } from '../ui';

export async function solicitarOtp(documento: string): Promise<string> {
  const res = await fetch('/api/student/request-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ documento_identidad: documento }),
  });
  const data = (await res.json().catch(() => ({}))) as { error?: string; maskedEmail?: string };
  if (!res.ok) throw new Error(data.error || 'No pudimos enviar el código.');
  return data.maskedEmail ?? '';
}

export function PasoCedula({
  documentoInicial,
  onEnviado,
}: {
  documentoInicial: string;
  onEnviado: (documento: string, correoEnmascarado: string) => void;
}) {
  const [documento, setDocumento] = useState(documentoInicial);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    const doc = documento.replace(/[.\s-]/g, '');
    if (doc.length < 4) {
      setError('Ingresa tu número de documento completo, sin puntos ni espacios.');
      return;
    }
    setCargando(true);
    setError('');
    try {
      onEnviado(doc, await solicitarOtp(doc));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setCargando(false);
    }
  };

  return (
    <form onSubmit={enviar} className="space-y-6" noValidate>
      <div>
        <h2 className="titulo text-2xl text-azul-hondo">Ingresa tu documento</h2>
        <p className="mt-1.5 text-sm text-gris">Usa el mismo número con el que te inscribiste.</p>
      </div>
      <Campo
        etiqueta="Número de documento de identidad"
        name="documento"
        inputMode="numeric"
        autoComplete="off"
        placeholder="1012345678"
        value={documento}
        onChange={(e) => setDocumento(e.target.value)}
        className="[&_input]:text-lg [&_input]:tracking-wide"
        autoFocus
        required
      />
      {error && <Alerta>{error}</Alerta>}
      <Boton type="submit" cargando={cargando} className="w-full">
        Enviar código de verificación
      </Boton>
      <p className="text-xs leading-relaxed text-gris">
        Por tu seguridad, enviaremos un código de 6 dígitos al correo personal que registraste en tu proceso de admisión.
      </p>
    </form>
  );
}
