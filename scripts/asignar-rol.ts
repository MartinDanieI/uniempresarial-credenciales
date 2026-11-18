// Da acceso al panel a un usuario ya creado en Supabase → Authentication → Users.
// Uso: npm run rol -- correo@uniempresarial.edu.co admin "Nombre"   (roles: ti | bienestar | admin)
import { supabaseAdmin } from '../lib/supabase';

async function main() {
  const [email, rol = 'admin', nombre] = process.argv.slice(2);
  if (!email || !['ti', 'bienestar', 'admin'].includes(rol)) {
    throw new Error('Uso: npm run rol -- correo rol(ti|bienestar|admin) "Nombre"');
  }
  const db = supabaseAdmin();
  for (let page = 1; ; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const user = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (user) {
      const { error: e } = await db
        .from('staff_users')
        .upsert({ user_id: user.id, rol, nombre: nombre || email.split('@')[0] });
      if (e) throw e;
      console.log(`✓ ${email} ahora tiene rol "${rol}"`);
      return;
    }
    if (data.users.length < 200) break;
  }
  throw new Error(`No existe ${email} en Authentication → Users. Créalo primero ahí.`);
}

main().catch((e) => {
  console.error('✗', e.message ?? e);
  process.exit(1);
});
