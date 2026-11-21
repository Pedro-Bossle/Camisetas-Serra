// Guarda o estado do app (pedidos, produtos, configurações) no Neon Postgres.
// GET  /api/data            -> { data, version }
// PUT  /api/data {data, baseVersion} -> { version } | 409 { data, version }
import { neon } from '@neondatabase/serverless';
import { timingSafeEqual, createHash } from 'node:crypto';

const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
const sql = url ? neon(url) : null;
let ready = null;

function ensureTable() {
  ready ||= sql`CREATE TABLE IF NOT EXISTS app_state (
    id integer PRIMARY KEY,
    data jsonb NOT NULL,
    version integer NOT NULL DEFAULT 1,
    updated_at timestamptz NOT NULL DEFAULT now()
  )`.catch(e => { ready = null; throw e; });
  return ready;
}

function authorized(req) {
  const expected = process.env.APP_PASSWORD;
  if (!expected) return false; // sem senha configurada, nada é exposto
  const given = String(req.headers['x-senha'] || '');
  const h = s => createHash('sha256').update(s).digest();
  return timingSafeEqual(h(given), h(expected));
}

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') return JSON.parse(req.body);
  const chunks = [];
  for await (const c of req) chunks.push(c);
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!sql) return res.status(503).json({ error: 'DATABASE_URL não configurada (conecte o Neon ao projeto).' });
  if (!process.env.APP_PASSWORD) return res.status(503).json({ error: 'APP_PASSWORD não configurada.' });
  if (!authorized(req)) return res.status(401).json({ error: 'Senha incorreta.' });

  try {
    await ensureTable();
    if (req.method === 'GET') {
      const rows = await sql`SELECT data, version FROM app_state WHERE id = 1`;
      return res.status(200).json(rows[0] || { data: null, version: 0 });
    }
    if (req.method === 'PUT') {
      let body;
      try { body = await readBody(req); } catch { return res.status(400).json({ error: 'JSON inválido.' }); }
      const { data, baseVersion } = body || {};
      if (!data || !Array.isArray(data.orders) || !Array.isArray(data.products))
        return res.status(400).json({ error: 'Formato inválido.' });
      const base = Number(baseVersion) || 0;
      const json = JSON.stringify(data);
      let rows;
      if (base === 0) {
        rows = await sql`INSERT INTO app_state (id, data, version) VALUES (1, ${json}::jsonb, 1)
                         ON CONFLICT (id) DO NOTHING RETURNING version`;
      } else {
        rows = await sql`UPDATE app_state SET data = ${json}::jsonb, version = version + 1, updated_at = now()
                         WHERE id = 1 AND version = ${base} RETURNING version`;
      }
      if (rows.length) return res.status(200).json({ version: rows[0].version });
      const cur = await sql`SELECT data, version FROM app_state WHERE id = 1`;
      return res.status(409).json(cur[0] || { data: null, version: 0 });
    }
    res.setHeader('Allow', 'GET, PUT');
    return res.status(405).json({ error: 'Método não permitido.' });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Erro no banco de dados.' });
  }
}
