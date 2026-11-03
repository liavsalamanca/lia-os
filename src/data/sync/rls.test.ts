// @vitest-environment node
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { beforeAll, describe, expect, it } from 'vitest';

const A = '00000000-0000-0000-0000-00000000000a';
const B = '00000000-0000-0000-0000-00000000000b';
const T1 = '2026-01-01T00:00:00Z';
const T2 = '2026-01-02T00:00:00Z';

let db: PGlite;

/** Imita lo mínimo de Supabase: roles, auth.users y auth.uid(). */
const SUPABASE_STUB = `
  create role anon nologin;
  create role authenticated nologin;
  create schema auth;
  create table auth.users (id uuid primary key);
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema public, auth to anon, authenticated;
  grant execute on function auth.uid() to anon, authenticated;
  insert into auth.users values ('${A}'), ('${B}');
  create publication supabase_realtime;
`;

const REALTIME = 'supabase/migrations/20261103000000_records_realtime.sql';
const FEEDS = 'supabase/migrations/20261104000000_calendar_feeds.sql';

async function as<T>(role: 'anon' | 'authenticated', user: string, run: () => Promise<T>) {
  await db.exec(`set request.jwt.claim.sub = '${user}'; set role ${role};`);
  try {
    return await run();
  } finally {
    await db.exec(`reset role; set request.jwt.claim.sub = '';`);
  }
}

const insert = (owner: string, id: string, at = T1, value = 'privado') =>
  db.query(`insert into public.records (user_id, collection, id, data, modified_at) values ($1, 'tasks', $2, $3, $4)`, [owner, id, JSON.stringify({ title: value }), at]);
const rows = async () => (await db.query<{ id: string; user_id: string; data: { title: string } }>('select * from public.records order by id')).rows;

beforeAll(async () => {
  db = new PGlite();
  await db.exec(SUPABASE_STUB);
  await db.exec(await readFile('supabase/migrations/20261101000000_records.sql', 'utf8'));
  await db.exec(await readFile(REALTIME, 'utf8'));
  await db.exec(await readFile(FEEDS, 'utf8'));
  await insert(A, 'a1');
  await insert(B, 'b1');
});

describe('aislamiento entre usuarios', () => {
  it('cada persona ve solo sus registros', async () => {
    expect((await as('authenticated', A, rows)).map((r) => r.id)).toEqual(['a1']);
    expect((await as('authenticated', B, rows)).map((r) => r.id)).toEqual(['b1']);
  });

  it('sin sesión no se puede leer ni escribir', async () => {
    await expect(as('anon', '', rows)).rejects.toThrow(/permission denied/);
    await expect(as('anon', '', () => insert(A, 'x'))).rejects.toThrow(/permission denied/);
  });

  it('no se puede crear un registro a nombre de otra persona', async () => {
    await expect(as('authenticated', A, () => insert(B, 'robado'))).rejects.toThrow(/row-level security/);
  });

  it('no se puede modificar ni borrar lo ajeno', async () => {
    const update = await as('authenticated', A, () => db.query(`update public.records set data = '{}' where id = 'b1'`));
    const remove = await as('authenticated', A, () => db.query(`delete from public.records where id = 'b1'`));
    expect(update.affectedRows).toBe(0);
    expect(remove.affectedRows).toBe(0);
    expect((await as('authenticated', B, rows))[0]?.data.title).toBe('privado');
  });

  it('no se puede regalar un registro propio a otra persona', async () => {
    await expect(as('authenticated', A, () => db.query(`update public.records set user_id = '${B}' where id = 'a1'`))).rejects.toThrow(/row-level security/);
  });
});

describe('resolución de versiones en el servidor', () => {
  const upsert = (id: string, at: string, value: string) =>
    as('authenticated', A, () =>
      db.query(
        `insert into public.records (collection, id, data, modified_at) values ('tasks', $1, $2, $3)
         on conflict (user_id, collection, id) do update set data = excluded.data, modified_at = excluded.modified_at`,
        [id, JSON.stringify({ title: value }), at],
      ),
    );
  const title = async (id: string) => (await as('authenticated', A, rows)).find((r) => r.id === id)?.data.title;

  it('un cambio antiguo no pisa uno más reciente', async () => {
    await upsert('v1', T2, 'nuevo');
    await upsert('v1', T1, 'viejo');
    expect(await title('v1')).toBe('nuevo');
  });

  it('un cambio más reciente sí reemplaza', async () => {
    await upsert('v2', T1, 'viejo');
    await upsert('v2', T2, 'nuevo');
    expect(await title('v2')).toBe('nuevo');
  });

  it('el usuario se asigna solo desde la sesión', async () => {
    await upsert('v3', T1, 'x');
    expect((await as('authenticated', A, rows)).find((r) => r.id === 'v3')?.user_id).toBe(A);
  });
});

describe('tiempo real', () => {
  const published = async () =>
    (await db.query(`select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'records'`)).rows.length;

  it('la tabla queda publicada y repetir la migración no falla', async () => {
    expect(await published()).toBe(1);
    await db.exec(await readFile(REALTIME, 'utf8'));
    expect(await published()).toBe(1);
  });

  it('la reversión la quita sin borrar datos', async () => {
    const before = (await rows()).length;
    await db.exec(await readFile('supabase/rollback/20261103000000_records_realtime.down.sql', 'utf8'));
    expect(await published()).toBe(0);
    expect((await rows()).length).toBe(before);
    await db.exec(await readFile(REALTIME, 'utf8'));
  });
});

describe('enlaces de calendario', () => {
  const hashA = 'a'.repeat(64);
  const hashB = 'b'.repeat(64);
  const feeds = () => db.query<{ user_id: string; token_hash: string }>('select user_id, token_hash from public.calendar_feeds order by user_id');

  beforeAll(async () => {
    await as('authenticated', A, () => db.query('insert into public.calendar_feeds (token_hash) values ($1)', [hashA]));
    await as('authenticated', B, () => db.query('insert into public.calendar_feeds (token_hash) values ($1)', [hashB]));
  });

  it('cada persona ve y cambia solo su enlace', async () => {
    expect((await as('authenticated', A, feeds)).rows).toEqual([{ user_id: A, token_hash: hashA }]);
    await as('authenticated', A, () => db.query('update public.calendar_feeds set token_hash = $1', ['c'.repeat(64)]));
    expect((await feeds()).rows.map((r) => r.token_hash)).toEqual(['c'.repeat(64), hashB]);
    await as('authenticated', A, () => db.query('delete from public.calendar_feeds'));
    expect((await feeds()).rows.map((r) => r.user_id)).toEqual([B]);
    await as('authenticated', A, () => db.query('insert into public.calendar_feeds (token_hash) values ($1)', [hashA]));
  });

  it('nadie crea un enlace a nombre de otra persona', async () => {
    await expect(as('authenticated', A, () => db.query('insert into public.calendar_feeds (user_id, token_hash) values ($1, $2)', [B, 'd'.repeat(64)]))).rejects.toThrow();
  });

  it('sin sesión no se puede leer ni escribir', async () => {
    await expect(as('anon', '', feeds)).rejects.toThrow();
    await expect(as('anon', '', () => db.query('insert into public.calendar_feeds (token_hash) values ($1)', ['e'.repeat(64)]))).rejects.toThrow();
  });

  it('solo acepta un hash, nunca el enlace en claro', async () => {
    await expect(as('authenticated', A, () => db.query('update public.calendar_feeds set token_hash = $1', ['enlace-en-claro']))).rejects.toThrow();
  });

  it('repetir la migración no falla ni borra enlaces', async () => {
    await db.exec(await readFile(FEEDS, 'utf8'));
    expect((await feeds()).rows).toHaveLength(2);
  });
});
