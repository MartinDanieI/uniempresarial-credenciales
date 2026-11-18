import { AdminShell } from '@/components/admin/AdminShell';
import { PanelTI } from '@/components/admin/ti/PanelTI';

export const metadata = { title: 'Panel TI · Credenciales Uniempresarial' };

export default function TIPage() {
  return (
    <AdminShell roles={['ti']} actual="/admin/ti">
      <PanelTI />
    </AdminShell>
  );
}
