import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { generateKeyPairSync, sign } from 'node:crypto';
import { once } from 'node:events';
import express from 'express';
import { WaffoPancake } from '@waffo/pancake-ts';
import { mountBilling } from '../billing/http.mjs';
import { BillingStore } from '../billing/store.mjs';
import { paidPeriod, createBilling } from '../billing/service.mjs';
import { countWords, plans } from '../billing/plans.mjs';

async function fixture(t) {
  const db=new DatabaseSync(':memory:');t.after(()=>db.close());
  const store=new BillingStore(db,true,'test');await store.migrate();return store;
}
async function active(store, user='alice',plan='basic',id='sub') {
  await store.query(`INSERT INTO billing_orders(id,user_id,plan,mode,product_id,provider_id,state,period_start,valid_until,period_key,created)
    VALUES($1,$2,$3,'test','product',$4,'active',$5,$6,'period1',$7) RETURNING id`,[id,user,plan,`provider-${id}`,Date.now()-1000,Date.now()+86400000,Date.now()]);
}
const payment=(amount='9.99',periodNumber=1)=>({status:'succeeded',refundStatus:'none',isFullyRefunded:false,periodNumber,amount:{display:amount,currency:'USD'},snapshotAmountDetails:{currency:'USD',total:amount,taxAmount:'0.00'}});
const period=()=>({status:'active',billingPeriod:'monthly',isInTrial:false,currentPeriodNumber:1,currentPeriodStart:new Date(Date.now()-60000).toISOString(),currentPeriodEnd:new Date(Date.now()+86400000).toISOString(),payments:[payment()]});

test('approved monthly amounts/quotas and Japanese word segmentation',()=>{
  assert.deepEqual([plans.basic.amount,plans.basic.firstAmount,plans.basic.words],['9.99','4.99',60000]);
  assert.deepEqual([plans.pro.amount,plans.pro.firstAmount,plans.pro.words],['29.99','14.99',260000]);
  assert.equal(countWords('Hello, world!'),2);assert.equal(countWords(' 。\n😀 '),0);
  assert.ok(countWords('私は日本語の文章を書きます。')>1);
  assert.equal(countWords('日本語\n文章'),countWords('日本語 文章'));
});
test('paid introductory and renewal periods require exact matching payment and reject refunded/trial abuse',()=>{
  const row={plan:'basic',introductory:1};assert.ok(paidPeriod(period(),row));
  const intro={...period(),status:'trialing',isInTrial:true,currentPeriodNumber:1,payments:[payment('4.99',1)]};
  assert.ok(paidPeriod(intro,row));assert.equal(paidPeriod(intro,{...row,introductory:0}),null);
  for(const change of [o=>o.payments=[],o=>o.payments[0].amount.display='4.99',o=>o.payments[0].periodNumber=2,
    o=>o.payments[0].amount.currency='JPY',o=>o.payments[0].refundStatus='pending',o=>o.payments[0].isFullyRefunded=true,
    o=>o.status='past_due',o=>o.billingPeriod='yearly',o=>o.currentPeriodEnd='2020-01-01',o=>o.currentPeriodNumber=0,
    o=>delete o.payments[0].snapshotAmountDetails,o=>o.payments[0].snapshotAmountDetails.taxAmount='-1']) {
    const order=period();change(order);assert.equal(paidPeriod(order,row),null);
  }
  assert.ok(paidPeriod({...period(),status:'canceling'},row));
  const taxed=period();taxed.payments[0].amount.display='10.99';taxed.payments[0].snapshotAmountDetails.total='10.99';taxed.payments[0].snapshotAmountDetails.taxAmount='1.00';
  assert.ok(paidPeriod(taxed,row),'tax-inclusive successful charges still unlock the correct net-price plan');
  taxed.payments[0].amount.display='9.99';assert.equal(paidPeriod(taxed,row),null,'underpayment cannot unlock a taxed order');
});
test('concurrent quota reservations cannot overspend; failed attempts release and identities/modes stay isolated',async t=>{
  const store=await fixture(t);await active(store);
  const outcomes=await Promise.allSettled(['one','two','three'].map(id=>store.reserve('alice',id,30000)));
  assert.equal(outcomes.filter(r=>r.status==='fulfilled').length,2);
  assert.equal((await store.status('alice')).remainingWords,0);
  await store.settle('one',false);assert.equal((await store.status('alice')).remainingWords,30000);
  await store.reserve('alice','retry',30000);await store.settle('retry',true);await store.settle('retry',false);
  assert.equal((await store.status('alice')).remainingWords,0);
  await assert.rejects(()=>store.reserve('alice','retry',1),{status:409});
  await assert.rejects(()=>store.reserve('bob','bob',1),{status:402});
  await assert.rejects(()=>new BillingStore(store.database,true,'prod').reserve('alice','prod',1),{status:402});
  for(const words of [-1,0,NaN,1.5])await assert.rejects(()=>store.reserve('alice',`bad-${words}`,words),{status:400});
});
test('renewal resets words by provider period and cancellation/refund closes access',async t=>{
  const store=await fixture(t);await active(store);await store.reserve('alice','first',5000);await store.settle('first',true);
  await store.query("UPDATE billing_orders SET period_key='period2' WHERE id='sub' RETURNING id");
  assert.equal((await store.status('alice')).remainingWords,60000);
  await store.query("UPDATE billing_orders SET state='canceling' WHERE id='sub' RETURNING id");
  assert.equal((await store.status('alice')).fullReport,true);
  await store.query("UPDATE billing_orders SET valid_until=0 WHERE id='sub' RETURNING id");
  await assert.rejects(()=>store.reserve('alice','expired',1),{status:402});
});
test('crashed reservations recover after five minutes and Pro has the approved larger allowance',async t=>{
  const store=await fixture(t);await active(store,'alice','pro');await store.reserve('alice','crashed',260000);
  await store.query('UPDATE billing_usage SET created=$1 WHERE id=$2 RETURNING id',[Date.now()-360000,'crashed']);
  await store.reserve('alice','next',1000);assert.equal((await store.status('alice')).remainingWords,259000);
});
const privateKey=generateKeyPairSync('rsa',{modulusLength:2048}).privateKey.export({type:'pkcs8',format:'pem'});
const env={WAFFO_MERCHANT_ID:'merchant',WAFFO_PRIVATE_KEY:privateKey,WAFFO_STORE_ID:'store',WAFFO_BASIC_PRODUCT_ID:'basic-product',WAFFO_PRO_PRODUCT_ID:'pro-product'};
function provider() {
  const orders=new Map(),calls=[];
  return {orders,calls,graphql:{query:async({variables})=>({data:{subscriptionOrders:orders.has(variables.ref)?[orders.get(variables.ref)]:[]}})},
    checkout:{authenticated:{create:async(params,options)=>{calls.push({params,options});return{checkoutUrl:'https://pancake.waffo.ai/checkout',expiresAt:new Date(Date.now()+3600000).toISOString()};}}},
    auth:{createCustomerPortalLink:async()=>({portalUrl:'https://pancake.waffo.ai/portal'})}};
}

test('public checkout stays closed until production mode is explicitly enabled',async t=>{
  const store=await fixture(t),client=provider();
  for(const flags of [{VERCEL:'1'}, {VERCEL:'1',WAFFO_CHECKOUT_ENABLED:'true'}, {WAFFO_CHECKOUT_ENABLED:'false'}]) {
    const billing=createBilling({database:store.database},{local:true,origin:'https://aibunsho.com'},{...env,...flags},{store,client});
    await assert.rejects(()=>billing.checkout({id:'alice',email:'alice@example.test'},'basic'),{status:503});
  }
  assert.equal(client.calls.length,0);
});
test('checkout reuses pending order; callback is scoped and annual/arbitrary plans are rejected',async t=>{
  const store=await fixture(t),client=provider();const billing=createBilling({database:store.database},{local:true,origin:'https://aibunsho.com'},env,{store,client});
  const user={id:'alice',email:'alice@example.test'};
  const a=await billing.checkout(user,'basic'),b=await billing.checkout(user,'basic');assert.equal(a.orderId,b.orderId);assert.equal(client.calls.length,1);
  assert.equal(client.calls[0].params.withTrial,true);assert.equal(client.calls[0].params.buyerIdentity,'alice');
  assert.match(client.calls[0].params.successUrl,/https:\/\/aibunsho.com\/\?payment=/);
  await assert.rejects(()=>billing.checkout(user,'annual'));await assert.rejects(()=>billing.checkout(user,'constructor'));
  await assert.rejects(()=>billing.checkout(user,'pro'),{status:409});
});
test('reconciliation verifies identity and trial price, revokes refunds and never renews on redirect alone',async t=>{
  const store=await fixture(t),client=provider(),billing=createBilling({database:store.database},{local:true,origin:'https://aibunsho.com'},env,{store,client});
  const checkout=await billing.checkout({id:'alice',email:'alice@example.test'},'basic');
  const [row]=await store.query('SELECT * FROM billing_orders WHERE id=$1',[checkout.orderId]);
  assert.equal((await store.status('alice')).fullReport,false);
  const order={...period(),id:'provider',storeId:'store',currency:'USD',testMode:true,merchantProvidedBuyerIdentity:'alice',orderMerchantExternalId:row.id,productVersion:{productId:'basic-product'}};
  client.orders.set(row.id,order);await billing.reconcile(row);assert.equal((await store.status('alice')).fullReport,true);
  order.merchantProvidedBuyerIdentity='bob';await assert.rejects(()=>billing.reconcile(row),/identity/);order.merchantProvidedBuyerIdentity='alice';
  order.testMode=false;await assert.rejects(()=>billing.reconcile(row),/identity/);order.testMode=true;
  order.payments[0].isFullyRefunded=true;await billing.reconcile(row);assert.equal((await store.status('alice')).fullReport,false);
});
test('billing HTTP enforces verified sessions, same-origin consent, order ownership and signed durable webhooks',async t=>{
  const store=await fixture(t),client=provider(),keys=generateKeyPairSync('rsa',{modulusLength:2048});
  client.webhooks=new WaffoPancake({merchantId:'MER_5EMEWfhBB53tdi21MkTuMM',privateKey,environment:'test',webhookPublicKey:keys.publicKey.export({type:'spki',format:'pem'})}).webhooks;
  const billing=createBilling({database:store.database},{local:true,origin:'https://aibunsho.com'},env,{store,client});
  const accounts={auth:{api:{getSession:async({headers})=>headers.get('cookie')==='alice'?{user:{id:'alice',email:'alice@example.test',emailVerified:true}}:null}}};
  const app=express();mountBilling(app,accounts,{origin:'https://aibunsho.com'},billing);
  const server=app.listen(0,'127.0.0.1');await once(server,'listening');t.after(()=>new Promise(r=>server.close(r)));
  const base=`http://127.0.0.1:${server.address().port}/api/billing`;
  const headers={cookie:'alice',origin:'https://aibunsho.com','content-type':'application/json'};
  const post=(route,body,h=headers)=>fetch(`${base}/${route}`,{method:'POST',headers:h,body:JSON.stringify(body)});
  assert.equal((await fetch(`${base}/status`)).status,401);
  assert.equal((await post('checkout',{plan:'basic',agreed:false})).status,400);
  assert.equal((await post('checkout',{plan:'basic',agreed:true},{...headers,origin:'https://evil.example'})).status,403);
  assert.equal((await post('checkout',{plan:'annual',agreed:true})).status,400);
  const checkout=await post('checkout',{plan:'basic',agreed:true});assert.equal(checkout.status,200);const {orderId}=await checkout.json();
  assert.equal((await post('reconcile',{orderId:'b'.repeat(32)})).status,404);
  const [row]=await store.query('SELECT * FROM billing_orders WHERE id=$1',[orderId]);
  client.orders.set(orderId,{...period(),id:'provider',storeId:'store',currency:'USD',testMode:true,merchantProvidedBuyerIdentity:'alice',orderMerchantExternalId:row.id,productVersion:{productId:'basic-product'}});
  const event={id:'event',eventId:'event',timestamp:new Date().toISOString(),eventType:'subscription.activated',storeId:'store',mode:'test',data:{orderId:'provider',orderMerchantExternalId:orderId}};
  const notify=(e,valid=true,ts=Date.now())=>{const body=JSON.stringify(e);const sig=valid?sign('sha256',Buffer.from(`${ts}.${body}`),keys.privateKey).toString('base64'):'forged';return fetch(`${base}/webhook`,{method:'POST',headers:{'content-type':'application/json','x-waffo-signature':`t=${ts},v1=${sig}`},body});};
  assert.equal((await notify(event,false)).status,401);
  assert.equal((await notify({...event,mode:'prod'})).status,401);
  assert.equal((await notify({...event,storeId:'other'})).status,401);
  assert.equal((await notify(event,true,Date.now()-3600000)).status,401);
  assert.equal((await notify(event)).status,200);assert.equal((await notify(event)).status,200);
  await billing.processEvents();assert.equal((await store.status('alice')).fullReport,true);
  assert.equal((await store.query('SELECT * FROM billing_events')).length,1);
});
