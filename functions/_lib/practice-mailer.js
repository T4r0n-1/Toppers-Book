import { practicePapers } from '../../assets/practice-papers.js';
const reply = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store, private', 'Referrer-Policy': 'no-referrer' } });
const prefsSQL = 'CREATE TABLE IF NOT EXISTS practice_email_preferences (uid TEXT PRIMARY KEY, email TEXT NOT NULL, enabled INTEGER NOT NULL DEFAULT 0 CHECK (enabled IN (0,1)), updated_at INTEGER NOT NULL)';
export async function mailSchema(env) {
  if (!env.DB) throw new Error('Mail storage unavailable');
  for (const sql of [prefsSQL,
    'CREATE TABLE IF NOT EXISTS practice_mail_subscribers (uid TEXT PRIMARY KEY, email TEXT NOT NULL, verified_at INTEGER NOT NULL, unsubscribe_token TEXT NOT NULL UNIQUE)',
    "CREATE TABLE IF NOT EXISTS practice_mail_deliveries (id TEXT PRIMARY KEY, paper_id TEXT NOT NULL, uid TEXT NOT NULL, email TEXT NOT NULL, status TEXT NOT NULL CHECK(status IN ('queued','reserved','sent','failed')), updated_at INTEGER NOT NULL, UNIQUE(paper_id,email))"
  ]) await env.DB.prepare(sql).run();
}
export async function recordVerifiedSubscriber(env, user) {
  if (!user.emailVerified) return;
  await mailSchema(env);
  const token = crypto.randomUUID().replaceAll('-', '') + crypto.randomUUID().replaceAll('-', '');
  await env.DB.prepare('INSERT INTO practice_mail_subscribers (uid,email,verified_at,unsubscribe_token) VALUES (?,?,?,?) ON CONFLICT(uid) DO UPDATE SET email = excluded.email, verified_at = CASE WHEN practice_mail_subscribers.email = excluded.email THEN practice_mail_subscribers.verified_at ELSE excluded.verified_at END, unsubscribe_token = CASE WHEN practice_mail_subscribers.email = excluded.email THEN practice_mail_subscribers.unsubscribe_token ELSE excluded.unsubscribe_token END').bind(user.uid, user.email, Math.floor(Date.now() / 1000), token).run();
}
async function authorised(request, env) {
  if (!env.PRACTICE_MAILER_SECRET || env.PRACTICE_MAILER_SECRET.length < 32) return false;
  const bearer = request.headers.get('Authorization') || '';
  const digest = value => crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  const [a, b] = await Promise.all([digest(bearer), digest('Bearer ' + env.PRACTICE_MAILER_SECRET)]);
  const x = new Uint8Array(a), y = new Uint8Array(b); let different = 0;
  for (let i = 0; i < x.length; i++) different |= x[i] ^ y[i];
  return different === 0;
}
export function publishedPapers(now = Math.floor(Date.now() / 1000)) {
  return practicePapers.filter(p => /^[a-z0-9-]{1,80}$/.test(p.id) && typeof p.title === 'string' && p.title.length > 0 && p.title.length <= 150 && /^\/practice(?:[/.?]|$)/.test(p.path) && !p.path.includes('\\') && Number.isInteger(p.publishedAt) && p.publishedAt <= now);
}
export async function practiceMailer(request, env) {
  if (request.method !== 'POST') return reply({ error: 'Method not allowed' }, 405);
  if (!await authorised(request, env)) return reply({ error: 'Mailer connection is not authorised' }, 401);
  const raw = await request.text(); if (raw.length > 4096) return reply({ error: 'Request too large' }, 413);
  let body; try { body = JSON.parse(raw); } catch { return reply({ error: 'Invalid JSON' }, 400); }
  if (!body || !['status','next','ack'].includes(body.action)) return reply({ error: 'Invalid action' }, 400);
  await mailSchema(env);
  if (body.action === 'status') return reply({ connected: true, sender: 'codetoppers@gmail.com', paperCount: publishedPapers().length });
  const now = Math.floor(Date.now() / 1000);
  if (body.action === 'ack') {
    if (typeof body.id !== 'string' || !/^[a-f0-9]{32}$/.test(body.id) || !['sent','failed'].includes(body.status)) return reply({ error: 'Invalid acknowledgement' }, 400);
    await env.DB.prepare("UPDATE practice_mail_deliveries SET status = ?, updated_at = ? WHERE id = ? AND status = 'reserved'").bind(body.status, now, body.id).run();
    return reply({ saved: true });
  }
  const papers = publishedPapers();
  for (const paper of papers) {
    await env.DB.prepare("INSERT OR IGNORE INTO practice_mail_deliveries (id,paper_id,uid,email,status,updated_at) SELECT lower(hex(randomblob(16))),?,p.uid,p.email,'queued',? FROM practice_email_preferences p JOIN practice_mail_subscribers s ON s.uid = p.uid AND s.email = p.email WHERE p.enabled = 1 AND p.updated_at <= ? AND s.verified_at <= ?").bind(paper.id, now, paper.publishedAt, paper.publishedAt).run();
  }
  const rows = (await env.DB.prepare("SELECT d.id,d.paper_id,d.email,s.unsubscribe_token FROM practice_mail_deliveries d JOIN practice_email_preferences p ON p.uid=d.uid AND p.email=d.email AND p.enabled=1 JOIN practice_mail_subscribers s ON s.uid=d.uid AND s.email=d.email WHERE d.status='queued' ORDER BY d.updated_at,d.id LIMIT 10").all()).results || [];
  const jobs = [], limit = Math.min(5, Math.max(1, Math.trunc(Number(body.limit)) || 1)), origin = new URL(request.url).origin;
  for (const row of rows) {
    const paper = papers.find(p => p.id === row.paper_id); if (!paper) continue;
    const claimed = await env.DB.prepare("UPDATE practice_mail_deliveries SET status='reserved',updated_at=? WHERE id=? AND status='queued'").bind(now, row.id).run();
    if (claimed.meta?.changes !== 1) continue;
    jobs.push({ id: row.id, email: row.email, title: paper.title, url: new URL(paper.path, origin).href, unsubscribe: origin + '/api/practice-unsubscribe?token=' + row.unsubscribe_token });
    if (jobs.length >= limit) break;
  }
  return reply({ jobs });
}
export async function practiceUnsubscribe(request, env) {
  if (!['GET','POST'].includes(request.method)) return reply({ error: 'Method not allowed' }, 405);
  const url = new URL(request.url);
  let token = url.searchParams.get('token');
  if (request.method === 'POST') {
    const text = await request.text(); if (text.length > 512) return reply({ error: 'Request too large' }, 413);
    token = new URLSearchParams(text).get('token');
  }
  if (!/^[a-f0-9]{64}$/.test(token || '')) return reply({ error: 'Invalid unsubscribe link' }, 400);
  await mailSchema(env);
  const subscriber = await env.DB.prepare('SELECT uid,email FROM practice_mail_subscribers WHERE unsubscribe_token=?').bind(token).first();
  if (!subscriber) return reply({ error: 'This unsubscribe link is no longer valid. You can also turn alerts off in Edit profile.' }, 404);
  const off = request.method === 'POST';
  if (off) await env.DB.prepare('UPDATE practice_email_preferences SET enabled=0,updated_at=? WHERE uid=? AND email=?').bind(Math.floor(Date.now()/1000), subscriber.uid, subscriber.email).run();
  const html = '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Practice email alerts | Toppers Books</title><link rel="stylesheet" href="/assets/style.css"><main class="section wrap" style="max-width:620px"><h1 style="font-size:36px">' + (off ? 'Practice alerts are off.' : 'Turn off practice emails?') + '</h1><p>' + (off ? 'You will no longer receive new-paper email alerts. You can turn them back on in Edit profile.' : 'Confirm below to stop email alerts for new practice papers. Your book access stays active.') + '</p>' + (off ? '' : '<form method="post"><input type="hidden" name="token" value="' + token + '"><button class="button" type="submit">Unsubscribe from practice emails</button></form>') + '<p><a href="/">Back to Toppers Books →</a></p></main></html>';
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store, private', 'Referrer-Policy': 'no-referrer', 'X-Robots-Tag': 'noindex' } });
}
