import { WaffoPancake } from '@waffo/pancake-ts';
import { createHash, randomUUID } from 'node:crypto';
import { billingConfig } from '../billing/config.mjs';

export function safetyChunks(text) {
  const chunks = []; let chunk = '';
  for (const character of text.replace(/\s+/gu, ' ').trim()) {
    if (chunk.length + character.length > 9000) {
      chunks.push(chunk); chunk = chunk.slice(-256);
      if (/^[\uDC00-\uDFFF]/u.test(chunk)) chunk = chunk.slice(1);
    }
    chunk += character;
  }
  if (chunk) chunks.push(chunk);
  return chunks;
}

// Source text and exact quotations were already checked before generation.
export function generatedContent(value) {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map(generatedContent).join('\n');
  if (!value || typeof value !== 'object') return '';
  return Object.entries(value).filter(([key]) => !['sourceText','text','quote','analysis','scanId','analyzedAt','modelVersion'].includes(key))
    .map(([,item]) => generatedContent(item)).join('\n');
}

export function createContentSafety(env, ledger, suppliedClient) {
  if (env.CONTENT_SAFETY_ENABLED !== 'true') return null;
  const config = billingConfig(env);
  if (!config) throw new Error('Content safety credentials are missing');
  const client = suppliedClient || new WaffoPancake({...config, fetch: (url, init) => fetch(url, {...init, signal: AbortSignal.any([AbortSignal.timeout(10000), ...(init?.signal ? [init.signal] : [])])})});
  return async (text, stage, requestId) => {
    const checks = await Promise.all(safetyChunks(text).map(async prompt => {
      let verdict;
      try { verdict = await client.contentSafety.scanPrompt({prompt,locale:'ja',semantic:'enforce'}); }
      catch { verdict = {action:'review',reasonCode:'service_unavailable',requestId:''}; }
      const action = ['allow','block','review'].includes(verdict.action) ? verdict.action : 'review';
      await ledger.query('INSERT INTO content_safety_events(id,request_id,stage,content_hash,action,reason,provider_ref,created) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id',
        [randomUUID(),requestId,stage,createHash('sha256').update(prompt).digest('hex'),action,String(verdict.reasonCode||'unknown').slice(0,100),String(verdict.requestId||'').slice(0,200),Date.now()]);
      return action;
    }));
    await ledger.query('DELETE FROM content_safety_events WHERE created<$1 RETURNING id',[Date.now()-30*86400000]);
    if (!checks.length || checks.some(action => action !== 'allow')) {
      const blocked = checks.includes('block');
      throw Object.assign(new Error(blocked ? 'この内容は利用規範によりモデル機能で処理できません。' : '内容確認を完了できませんでした。時間をおいて再度お試しください。'), {status:blocked?422:503});
    }
  };
}
