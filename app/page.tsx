import { Marca } from '@/components/Marca';
import { PieInstitucional } from '@/components/PieInstitucional';
import { PortalEstudiante } from '@/components/estudiante/PortalEstudiante';

export default async function Home({ searchParams }: PageProps<'/'>) {
  const params = await searchParams;
  const demo = process.env.NODE_ENV === 'development' && params.demo !== undefined;

  return (
    <>
      <Marca />
      <main className="flex-1">
        <PortalEstudiante demo={demo} />
      </main>
      <div className="no-print">
        <PieInstitucional />
      </div>
    </>
  );
}
