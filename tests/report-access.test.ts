import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createServer } from 'node:http';
import { handleDetection } from '../api/detect';

test('direct advanced-report requests fail closed when accounts are absent, without a provider call',async t=>{
  const server=createServer((req,res)=>{void handleDetection(req,res,{DETECTION_ENABLED:'true',DEEPSEEK_API_KEY:'not-a-real-provider-key'});});
  server.listen(0,'127.0.0.1');await once(server,'listening');t.after(()=>new Promise<void>(r=>server.close(()=>r())));
  const address=server.address();assert.ok(address&&typeof address!=='string');
  const base=`http://127.0.0.1:${address.port}`;
  const response=await fetch(base,{method:'POST',headers:{origin:base,'content-type':'application/json'},body:JSON.stringify({text:'日本語の文章を確認します。'.repeat(20),report:'advanced'})});
  assert.equal(response.status,503);assert.match((await response.json()).error,/アカウント/);
  const csrf=await fetch(base,{method:'POST',headers:{origin:'https://evil.example','content-type':'application/json'},body:JSON.stringify({text:'日本語の文章を確認します。'.repeat(20),report:'advanced'})});
  assert.equal(csrf.status,403);
});
