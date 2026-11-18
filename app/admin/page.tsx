import { redirect } from 'next/navigation';
import { getStaff } from '@/lib/auth';

/** Redirige al panel según el rol del usuario. */
export default async function AdminIndex() {
  const staff = await getStaff();
  if (!staff) redirect('/admin/login?sin_rol=1');
  redirect(staff.rol === 'ti' ? '/admin/ti' : '/admin/bienestar');
}
