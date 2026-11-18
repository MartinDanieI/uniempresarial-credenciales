'use client';
import { useState } from 'react';

export function Spinner({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity=".25" strokeWidth="3" />
      <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

type BotonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variante?: 'primario' | 'secundario' | 'fantasma' | 'peligro';
  cargando?: boolean;
  tam?: 'sm' | 'md';
};

/**
 * Botones en píldora como en uniempresarial.edu.co:
 * primario azul relleno, secundario blanco con borde gris, fantasma enlace azul, peligro rojo.
 */
export function Boton({ variante = 'primario', cargando, tam = 'md', className = '', children, disabled, ...rest }: BotonProps) {
  const base =
    'font-poppins inline-flex items-center justify-center gap-2 font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-azul disabled:cursor-not-allowed disabled:opacity-50';
  const caja = tam === 'sm' ? 'rounded-pill px-4 py-1.5 text-xs' : 'rounded-pill px-6 py-3 text-sm';
  const variantes = {
    primario: `${caja} bg-azul text-white hover:bg-azul-hondo`,
    secundario: `${caja} border border-linea-media bg-white text-tinta hover:border-azul hover:text-azul`,
    fantasma: `${tam === 'sm' ? 'text-xs' : 'text-sm'} px-1 py-1 text-azul hover:underline underline-offset-4`,
    peligro: `${caja} bg-ue text-white hover:bg-ue-dark`,
  };
  return (
    <button className={`${base} ${variantes[variante]} ${className}`} disabled={disabled || cargando} {...rest}>
      {cargando && <Spinner className="h-3.5 w-3.5" />}
      {children}
    </button>
  );
}

export function Alerta({ tipo = 'error', children }: { tipo?: 'error' | 'exito' | 'info' | 'aviso'; children: React.ReactNode }) {
  const estilos = {
    error: 'border-ue/30 bg-ue-soft text-ue-dark',
    exito: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    info: 'border-azul/20 bg-azul-suave/60 text-azul-hondo',
    aviso: 'border-amber-200 bg-amber-50 text-amber-900',
  };
  return (
    <div role={tipo === 'error' ? 'alert' : 'status'} className={`rounded-xl border px-4 py-3 text-sm ${estilos[tipo]}`}>
      {children}
    </div>
  );
}

const claseEntrada =
  'w-full rounded-pill border border-linea-media bg-white px-5 py-3 text-sm text-tinta outline-none placeholder:text-gris/60 focus:border-azul focus:ring-2 focus:ring-azul/15';

export function Campo({
  etiqueta,
  ayuda,
  className = '',
  ...rest
}: React.InputHTMLAttributes<HTMLInputElement> & { etiqueta: string; ayuda?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="font-poppins mb-1.5 block pl-2 text-xs font-medium text-tinta">{etiqueta}</span>
      <input className={claseEntrada} {...rest} />
      {ayuda && <span className="mt-1.5 block pl-2 text-xs text-gris">{ayuda}</span>}
    </label>
  );
}

export function Selector({
  etiqueta,
  opciones,
  className = '',
  ...rest
}: React.SelectHTMLAttributes<HTMLSelectElement> & { etiqueta: string; opciones: { valor: string; texto: string }[] }) {
  return (
    <label className={`block ${className}`}>
      <span className="font-poppins mb-1.5 block pl-2 text-xs font-medium text-tinta">{etiqueta}</span>
      <select className={`${claseEntrada} cursor-pointer`} {...rest}>
        {opciones.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.texto}
          </option>
        ))}
      </select>
    </label>
  );
}

/** Filtro compacto (selector o búsqueda) en píldora. */
export const claseFiltro =
  'w-full rounded-pill border border-linea-media bg-white px-4 py-2.5 text-sm text-tinta outline-none placeholder:text-gris/70 focus:border-azul focus:ring-2 focus:ring-azul/15';

/** Botón que copia un texto al portapapeles y confirma visualmente. */
export function BotonCopiar({ texto, etiqueta = 'Copiar' }: { texto: string; etiqueta?: string }) {
  const [copiado, setCopiado] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(texto);
        } catch {
          const area = document.createElement('textarea');
          area.value = texto;
          document.body.appendChild(area);
          area.select();
          document.execCommand('copy');
          area.remove();
        }
        setCopiado(true);
        setTimeout(() => setCopiado(false), 1800);
      }}
      className={`no-print font-poppins inline-flex shrink-0 items-center rounded-pill border px-3.5 py-1.5 text-xs font-medium ${
        copiado ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-linea-media bg-white text-tinta hover:border-azul hover:text-azul'
      }`}
      aria-label={`${etiqueta}: ${texto}`}
    >
      {copiado ? '✓ Copiado' : etiqueta}
    </button>
  );
}

export function Badge({ color, children }: { color: 'verde' | 'rojo' | 'gris' | 'ambar' | 'azul'; children: React.ReactNode }) {
  const c = {
    verde: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    rojo: 'bg-ue-soft text-ue ring-ue/25',
    gris: 'bg-fondo text-gris ring-linea',
    ambar: 'bg-amber-50 text-amber-800 ring-amber-200',
    azul: 'bg-azul-suave text-azul ring-azul/20',
  };
  return (
    <span className={`font-poppins inline-flex items-center rounded-pill px-2.5 py-0.5 text-[11px] font-medium ring-1 ${c[color]}`}>
      {children}
    </span>
  );
}

/** Cuadro de icono rojo redondeado, como los accesos rápidos del sitio. */
export function IconoCuadro({ children, color = 'rojo' }: { children: React.ReactNode; color?: 'rojo' | 'azul' }) {
  return (
    <span
      className={`font-poppins flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-semibold text-white ${
        color === 'rojo' ? 'bg-ue' : 'bg-azul'
      }`}
      aria-hidden
    >
      {children}
    </span>
  );
}

export const formatoFecha = (iso: string | null | undefined) =>
  iso
    ? new Date(iso).toLocaleString('es-CO', {
        timeZone: 'America/Bogota',
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : '—';
