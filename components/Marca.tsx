import Image from 'next/image';
import Link from 'next/link';

/** Línea degradada roja → azul bajo el encabezado, como en uniempresarial.edu.co. */
export function Franja() {
  return <div className="h-[3px] w-full bg-gradient-to-r from-ue via-ue to-azul" aria-hidden />;
}

/** Logo oficial (incluye "Una filial de Cámara de Comercio de Bogotá"). */
export function Logotipo({ className = 'h-9 sm:h-11' }: { className?: string }) {
  return (
    <Image
      src="/logo-uniempresarial.png"
      alt="Uniempresarial · Fundación Universitaria Empresarial, filial de la Cámara de Comercio de Bogotá"
      width={768}
      height={124}
      priority
      className={`w-auto ${className}`}
    />
  );
}

export function Marca({ subtitulo, children }: { subtitulo?: string; children?: React.ReactNode }) {
  return (
    <header className="no-print sticky top-0 z-30 bg-white">
      <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-8">
        <Link href="/" className="flex min-w-0 items-center gap-4" aria-label="Inicio">
          <Logotipo />
          {subtitulo && (
            <span className="font-poppins hidden border-l border-linea pl-4 text-xs font-medium text-gris lg:inline">{subtitulo}</span>
          )}
        </Link>
        {children}
      </div>
      <Franja />
    </header>
  );
}
