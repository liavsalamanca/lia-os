// Lee el calendario público de iCloud que la persona pegó en Configuración.
// Se despliega con --no-verify-jwt y comprueba la sesión aquí, compatible con las claves nuevas de Supabase.
import { createClient } from 'npm:@supabase/supabase-js@2.118.0';
import { handleImport } from '../_shared/handlers.ts';

const auth = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { auth: { persistSession: false } });

Deno.serve((request) =>
  handleImport(request, {
    async userForJwt(jwt) {
      const { data, error } = await auth.auth.getUser(jwt);
      return error ? null : (data.user?.id ?? null);
    },
  }),
);
