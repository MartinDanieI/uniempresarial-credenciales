import { CONTACTO, LINKS } from '@/lib/institucional';

export function PieInstitucional() {
  return (
    <footer className="mt-auto bg-azul-pie text-white">
      <div className="h-[3px] bg-gradient-to-r from-ue to-azul" aria-hidden />
      <div className="grid gap-8 px-4 py-10 text-sm sm:grid-cols-[1.4fr_1fr_1fr] sm:px-8">
        <div>
          <p className="font-poppins text-lg font-bold">Uniempresarial</p>
          <p className="mt-2 max-w-sm text-white/80">
            {CONTACTO.institucion}. Formamos líderes empresariales en el entorno real de los negocios.
          </p>
        </div>
        <div className="space-y-1.5 text-white/85">
          <p className="rotulo text-[11px] text-white">Sedes</p>
          <p>Principal: {CONTACTO.sedePrincipal}</p>
          <p>Administrativa: {CONTACTO.sedeAdministrativa}</p>
        </div>
        <div className="space-y-1.5 text-white/85">
          <p className="rotulo text-[11px] text-white">Contacto</p>
          <p>{CONTACTO.telefono}</p>
          <p>
            <a href={LINKS.web} className="hover:underline" target="_blank" rel="noreferrer">
              {CONTACTO.web}
            </a>
          </p>
          <p>
            <a href={`mailto:${CONTACTO.bienestar}`} className="hover:underline">
              {CONTACTO.bienestar}
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
