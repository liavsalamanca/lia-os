import type { SupabaseClient } from '@supabase/supabase-js';
import type { RemoteRow, RemoteStore } from './engine';
import { timeOf, type SyncItem } from './plan';

const PAGE = 1000;

type Row = { collection: string; id: string; data: unknown; deleted: boolean; modified_at: string; updated_at: string };

export class SupabaseRemote implements RemoteStore {
  constructor(
    private client: SupabaseClient,
    private userId: string,
  ) {}

  async pull(since: string | null): Promise<RemoteRow[]> {
    const rows: RemoteRow[] = [];
    for (let from = 0; ; from += PAGE) {
      let query = this.client.from('records').select('collection,id,data,deleted,modified_at,updated_at').order('updated_at').order('collection').order('id').range(from, from + PAGE - 1);
      if (since) query = query.gte('updated_at', since);
      const { data, error } = await query;
      if (error) throw new Error(error.message);
      const page = (data ?? []) as Row[];
      rows.push(...page.map((r) => ({ collection: r.collection, id: r.id, data: r.data, deleted: r.deleted, modifiedAt: timeOf(r.modified_at), updatedAt: r.updated_at })));
      if (page.length < PAGE) return rows;
    }
  }

  async push(items: SyncItem[]) {
    const rows = items.map((item) => ({
      user_id: this.userId,
      collection: item.collection,
      id: item.id,
      data: item.deleted ? {} : item.data,
      deleted: item.deleted,
      modified_at: new Date(item.modifiedAt).toISOString(),
    }));
    const { error } = await this.client.from('records').upsert(rows, { onConflict: 'user_id,collection,id' });
    if (error) throw new Error(error.message);
  }
}
