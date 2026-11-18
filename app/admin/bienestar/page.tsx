import { AdminShell } from '@/components/admin/AdminShell';
import { PanelBienestar } from '@/components/admin/bienestar/PanelBienestar';

export const metadata = { title: 'Trazabilidad Bienestar · Credenciales Uniempresarial' };

export default function BienestarPage() {
  return (
    <AdminShell roles={['bienestar']} actual="/admin/bienestar">
      <PanelBienestar />
    </AdminShell>
  );
}
