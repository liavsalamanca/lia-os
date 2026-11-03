// Calendario de LIA OS para suscribirse desde Apple Calendar. Se despliega con --no-verify-jwt:
// Apple no envía sesión, así que el acceso lo da el enlace privado.
import { createClient } from 'npm:@supabase/supabase-js@2.118.0';
import { FEED_COLLECTIONS, handleFeed, SETTINGS_COLLECTION } from '../_shared/handlers.ts';

// La clave de servicio solo existe en el servidor de Supabase; nunca llega al navegador.
const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });

Deno.serve((request) =>
  handleFeed(request, {
    async userForTokenHash(hash) {
      const { data, error } = await admin.from('calendar_feeds').select('user_id').eq('token_hash', hash).maybeSingle();
      if (error) throw error;
      return data?.user_id ?? null;
    },
    async rowsFor(userId) {
      const { data, error } = await admin
        .from('records')
        .select('collection, id, data')
        .eq('user_id', userId)
        .eq('deleted', false)
        .in('collection', [...FEED_COLLECTIONS, SETTINGS_COLLECTION])
        .limit(5000);
      if (error) throw error;
      return data ?? [];
    },
  }),
);
