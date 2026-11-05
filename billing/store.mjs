import { plans } from './plans.mjs';
export class BillingStore {
  constructor(database, local = false, mode = 'test') { this.database = database; this.local = local; this.mode = mode; this.queue = Promise.resolve(); }
  async query(sql, values = [], db = this.database) {
    return this.local ? db.prepare(sql.replace(/\$\d+/g, '?')).all(...values) : (await db.query(sql, values)).rows;
  }
  async migrate() {
    for (const sql of [
      `CREATE TABLE IF NOT EXISTS billing_orders (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, plan TEXT NOT NULL,
        mode TEXT NOT NULL, product_id TEXT NOT NULL, provider_id TEXT, state TEXT NOT NULL DEFAULT 'pending',
        checkout_url TEXT, session_expires BIGINT NOT NULL DEFAULT 0, period_start BIGINT NOT NULL DEFAULT 0,
        valid_until BIGINT NOT NULL DEFAULT 0, period_key TEXT NOT NULL DEFAULT '', introductory INTEGER NOT NULL DEFAULT 1, created BIGINT NOT NULL)`,
      `CREATE INDEX IF NOT EXISTS billing_orders_user ON billing_orders(user_id,mode)`,
      `CREATE UNIQUE INDEX IF NOT EXISTS billing_orders_provider ON billing_orders(provider_id)`,
      `CREATE TABLE IF NOT EXISTS billing_usage (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, order_id TEXT NOT NULL,
        mode TEXT NOT NULL, period_key TEXT NOT NULL, words INTEGER NOT NULL, state TEXT NOT NULL, created BIGINT NOT NULL)`,
      `CREATE INDEX IF NOT EXISTS billing_usage_period ON billing_usage(order_id,mode,period_key,state)`,
      `CREATE TABLE IF NOT EXISTS billing_events (id TEXT PRIMARY KEY, mode TEXT NOT NULL, body TEXT NOT NULL, processed INTEGER NOT NULL DEFAULT 0, created BIGINT NOT NULL)`,
      `CREATE TABLE IF NOT EXISTS content_safety_events (id TEXT PRIMARY KEY, request_id TEXT NOT NULL, stage TEXT NOT NULL, content_hash TEXT NOT NULL, action TEXT NOT NULL, reason TEXT NOT NULL, provider_ref TEXT NOT NULL, created BIGINT NOT NULL)`,
      `CREATE INDEX IF NOT EXISTS content_safety_events_created ON content_safety_events(created)`,
    ]) { if (this.local) this.database.exec(sql); else await this.database.query(sql); }
  }
  async transaction(userId, action) {
    if (this.local) {
      const run = this.queue.then(async () => {
        this.database.exec('BEGIN IMMEDIATE');
        try { const result = await action((s,p) => this.query(s,p)); this.database.exec('COMMIT'); return result; }
        catch (e) { this.database.exec('ROLLBACK'); throw e; }
      });
      this.queue = run.catch(() => {}); return run;
    }
    const db = await this.database.connect();
    try {
      await db.query('BEGIN'); await db.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))',[userId]);
      const result = await action((s,p) => this.query(s,p,db)); await db.query('COMMIT'); return result;
    } catch(e) { await db.query('ROLLBACK'); throw e; } finally { db.release(); }
  }
  async entitlement(userId, query = (s,p) => this.query(s,p)) {
    const rows = await query('SELECT * FROM billing_orders WHERE user_id=$1 AND mode=$2 ORDER BY created DESC', [userId,this.mode]);
    const active = rows.filter(r => plans[r.plan] && ['active','trialing','canceling'].includes(r.state) && Number(r.period_start) <= Date.now() && Number(r.valid_until) > Date.now());
    return active.sort((a,b) => plans[b.plan].words - plans[a.plan].words)[0] || null;
  }
  async status(userId) {
    const row = await this.entitlement(userId);
    const rows = await this.query('SELECT * FROM billing_orders WHERE user_id=$1 AND mode=$2 ORDER BY created DESC',[userId,this.mode]);
    let used = 0;
    if (row) { const [usage] = await this.query("SELECT COALESCE(SUM(words),0) AS used FROM billing_usage WHERE order_id=$1 AND mode=$2 AND period_key=$3 AND state IN ('reserved','completed')",[row.id,this.mode,row.period_key]); used = Number(usage.used); }
    return { plan: row?.plan || 'free', fullReport: Boolean(row), words: row ? plans[row.plan].words : 0,
      usedWords: used, remainingWords: row ? Math.max(0,plans[row.plan].words-used) : 0,
      periodEnd: Number(row?.valid_until || 0), mode: this.mode,
      hasSubscription: rows.some(r => r.provider_id && ['active','trialing','canceling','past_due'].includes(r.state)),
      introductoryEligible: !rows.some(r => r.provider_id),
    };
  }
  async reserve(userId, id, words) {
    if (!Number.isSafeInteger(words) || words < 1) throw Object.assign(new Error('文章に単語が含まれていません。'),{status:400});
    return this.transaction(userId, async query => {
      // Recover reservations left behind by a terminated serverless instance (provider timeout is <60s).
      await query("UPDATE billing_usage SET state='released' WHERE user_id=$1 AND mode=$2 AND state='reserved' AND created<$3 RETURNING id",[userId,this.mode,Date.now()-300000]);
      const [existing] = await query('SELECT id FROM billing_usage WHERE id=$1',[id]);
      if (existing) throw Object.assign(new Error('このリクエストは既に処理されています。'),{status:409});
      const row = await this.entitlement(userId,query);
      if (!row) throw Object.assign(new Error('詳細レポートにはBasicまたはProが必要です。'),{status:402});
      const [usage] = await query("SELECT COALESCE(SUM(words),0) AS used FROM billing_usage WHERE order_id=$1 AND mode=$2 AND period_key=$3 AND state IN ('reserved','completed')",[row.id,this.mode,row.period_key]);
      if (Number(usage.used)+words > plans[row.plan].words) throw Object.assign(new Error('今月の単語数上限に達しました。次回更新後にご利用ください。'),{status:402});
      await query("INSERT INTO billing_usage(id,user_id,order_id,mode,period_key,words,state,created) VALUES($1,$2,$3,$4,$5,$6,'reserved',$7) RETURNING id",[id,userId,row.id,this.mode,row.period_key,words,Date.now()]);
      return id;
    });
  }
  async settle(id, success) {
    await this.query("UPDATE billing_usage SET state=$1 WHERE id=$2 AND mode=$3 AND state='reserved' RETURNING id",[success?'completed':'released',id,this.mode]);
  }
}
