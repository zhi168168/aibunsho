import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync } from 'node:crypto';
import { safetyChunks, generatedContent, createContentSafety } from '../server/content-safety.mjs';

const {privateKey}=generateKeyPairSync('ed25519');
const env={CONTENT_SAFETY_ENABLED:'true',WAFFO_MERCHANT_ID:'test',WAFFO_PRIVATE_KEY:privateKey.export({type:'pkcs8',format:'pem'}),WAFFO_STORE_ID:'store',WAFFO_BASIC_PRODUCT_ID:'basic',WAFFO_PRO_PRODUCT_ID:'pro'};
test('moderation chunks preserve unicode and cover long content within provider limit',()=>{
  const text='日本語😀'.repeat(5000),chunks=safetyChunks(text);
  assert.ok(chunks.length>1);
  assert.ok(chunks.every(c=>c.length<=9000 && !/^[\uDC00-\uDFFF]|[\uD800-\uDBFF]$/u.test(c)));
  assert.equal(chunks[0],text.slice(0,chunks[0].length));
  let restored=chunks[0];
  for(const chunk of chunks.slice(1)) {
    let overlap=Math.min(256,restored.length);
    while(overlap && !chunk.startsWith(restored.slice(-overlap))) overlap--;
    restored+=chunk.slice(overlap);
  }
  assert.equal(restored,text);
});
test('generated moderation content includes explanations and rewrites without duplicating original text',()=>{
  assert.equal(generatedContent({sourceText:'private original',scanId:'id',summary:'summary',sections:[{quote:'original',rewrite:'new text',explanation:'reason'}]}).includes('original'),false);
  assert.match(generatedContent({summary:'summary',rewrite:'new text'}),/new text/);
});
test('moderation fails closed on block, review, unknown and provider failure, logging hashes only',async()=>{
  for(const action of ['allow','block','review','unknown','unavailable']) {
    const records=[];
    const ledger={query:async(sql,args)=>{records.push({sql,args});return [];}};
    const client={contentSafety:{scanPrompt:async()=>{if(action==='unavailable')throw new Error('network');return {action,reasonCode:'test',requestId:'provider'};}}};
    const check=createContentSafety(env,ledger,client);
    if(action==='allow') await check('private original','input','request');
    else await assert.rejects(()=>check('private original','output','request'),{status:action==='block'?422:503});
    assert.equal(JSON.stringify(records).includes('private original'),false);
    assert.match(records[0].args[3],/^[a-f0-9]{64}$/);
  }
});
test('enabled moderation rejects empty content and disabled mode sends nothing',async()=>{
  assert.equal(createContentSafety({},null),null);
  const check=createContentSafety(env,{query:async()=>[]},{contentSafety:{scanPrompt:async()=>{throw new Error('unexpected');}}});
  await assert.rejects(()=>check('  ','output','request'),{status:503});
});
