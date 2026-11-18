'use client';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { Alerta, Boton, Campo } from '../ui';

export function FormLogin() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  const entrar = async (e: React.FormEvent) => {
    e.preventDefault();
    setCargando(true);
    setError('');
    const { error } = await supabaseBrowser().auth.signInWithPassword({ email: email.trim(), password });
    if (error) {
      setError('Correo o contraseña incorrectos.');
      setCargando(false);
      return;
    }
    const next = params.get('next');
    router.replace(next && next.startsWith('/admin') ? next : '/admin');
    router.refresh();
  };

  return (
    <form onSubmit={entrar} className="mt-6 space-y-4">
      {params.has('sin_rol') && (
        <Alerta tipo="aviso">Tu usuario no tiene un rol asignado en el panel. Pide a TI que te registre en staff_users.</Alerta>
      )}
      <Campo etiqueta="Correo institucional" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
      <Campo etiqueta="Contraseña" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      {error && <Alerta>{error}</Alerta>}
      <Boton type="submit" cargando={cargando} className="w-full">
        Ingresar
      </Boton>
    </form>
  );
}
