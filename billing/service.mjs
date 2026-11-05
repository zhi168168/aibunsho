import { WaffoPancake } from '@waffo/pancake-ts';
import { randomUUID } from 'node:crypto';
import { billingConfig } from './config.mjs';
import { BillingStore } from './store.mjs';
import { plans } from './plans.mjs';

export function checkoutURL(value) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password) throw new Error('Invalid checkout URL');
  return url.href;
}
function cents(value) {
  if (typeof value !== 'string' || !/^\d+(?:\.\d{1,2})?$/.test(value)) return NaN;
  const number = Math.round(Number(value) * 100);
  return Number.isSafeInteger(number) ? number : NaN;
}
export function paidPeriod(order, row, now = Date.now()) {
  const plan = plans[row.plan];
  const start = Date.parse(order.currentPeriodStart), end = Date.parse(order.currentPeriodEnd);
  const number = order.currentPeriodNumber;
  if (!plan || !['active','trialing','canceling'].includes(order.status) || order.billingPeriod !== 'monthly' ||
    !Number.isInteger(number) || number < 1 || !(start <= now && end > now)) return null;
  // A paid introductory trial is a real paid period, never grant a free trial.
  const amount = order.isInTrial ? (row.introductory === 1 ? plan.firstAmount : null) : plan.amount;
  if (!amount || !order.payments?.some(p => {
    const snapshot = p.snapshotAmountDetails;
    const total = cents(snapshot?.total), tax = cents(snapshot?.taxAmount);
    return p.periodNumber === number && p.status === 'succeeded' && !p.isFullyRefunded &&
      ['none','failed'].includes(p.refundStatus) && p.amount?.currency === 'USD' && snapshot?.currency === 'USD' &&
      tax >= 0 && total - tax === cents(amount) && cents(p.amount.display) === total;
  })) return null;
  return { start, end, key: `${number}:${start}` };
}
export const orderQuery = `query($storeId:String!, $ref:String!) { subscriptionOrders(storeId:$storeId,filter:{orderMerchantExternalId:{eq:$ref}},limit:2) {
  id storeId status currency testMode merchantProvidedBuyerIdentity orderMerchantExternalId
  productVersion { productId } billingPeriod isInTrial currentPeriodStart currentPeriodEnd currentPeriodNumber
  payments { id status periodNumber refundStatus isFullyRefunded amount { display currency }
    snapshotAmountDetails { currency total taxAmount } }
} }`;

export function createBilling(accounts, settings, env, options = {}) {
  const config = billingConfig(env);
  if (!config || !accounts) return null;
  const client = options.client || new WaffoPancake(config);
  const store = options.store || new BillingStore(accounts.database,settings.local,config.environment);
  const service = { config, client, store,
    async reconcile(row) {
      if (row.mode !== config.environment) throw new Error('Payment environment mismatch');
      return store.transaction(row.user_id, async query => {
        const result = await client.graphql.query({query:orderQuery,variables:{storeId:config.storeId,ref:row.id}});
        if (result.errors?.length || !Array.isArray(result.data?.subscriptionOrders)) throw new Error('Payment query failed');
        const orders = result.data.subscriptionOrders;
        if (!orders.length) return null;
        if (orders.length !== 1) throw new Error('Ambiguous payment reference');
        const o = orders[0];
        if (o.storeId !== config.storeId || o.testMode !== (config.environment === 'test') ||
          o.merchantProvidedBuyerIdentity !== row.user_id || o.orderMerchantExternalId !== row.id ||
          o.productVersion?.productId !== row.product_id || o.currency !== 'USD') throw new Error('Payment identity mismatch');
        const period = paidPeriod(o,row);
        await query('UPDATE billing_orders SET provider_id=$1,state=$2,period_start=$3,valid_until=$4,period_key=$5 WHERE id=$6 RETURNING id',
          [o.id,o.status,period?.start||0,period?.end||0,period?.key||'',row.id]);
        return o;
      });
    },
    async refresh(userId) {
      const rows = await store.query("SELECT * FROM billing_orders WHERE user_id=$1 AND mode=$2 AND state NOT IN ('failed','expired') ORDER BY created DESC",[userId,config.environment]);
      for (const row of rows) await service.reconcile(row);
    },
    async checkout(user, plan) {
      if (env.WAFFO_CHECKOUT_ENABLED === 'false' || (env.VERCEL && (config.environment !== 'prod' || env.WAFFO_CHECKOUT_ENABLED !== 'true')))
        throw Object.assign(new Error('購入受付は準備中です。公開後にご利用ください。'), {status:503});
      if (!Object.hasOwn(plans,plan)) throw new Error('Invalid plan');
      await service.refresh(user.id);
      const order = await store.transaction(user.id, async query => {
        const rows = await query('SELECT * FROM billing_orders WHERE user_id=$1 AND mode=$2 ORDER BY created DESC',[user.id,config.environment]);
        if (rows.some(r => r.provider_id && ['active','trialing','canceling','past_due','pending'].includes(r.state)))
          throw Object.assign(new Error('既存の契約を管理してください。重複した定期購入はできません。'),{status:409});
        let row = rows.find(r => r.state === 'pending' && (Number(r.session_expires)>Date.now() || !r.checkout_url));
        if (row && row.plan !== plan) throw Object.assign(new Error('別のプランの決済が進行中です。決済の有効期限後に再度お試しください。'),{status:409});
        if (row?.checkout_url) return {url:checkoutURL(row.checkout_url),orderId:row.id};
        if (!row) {
          row = {id:randomUUID().replaceAll('-',''),introductory:rows.some(r=>r.provider_id)?0:1};
          await query('INSERT INTO billing_orders(id,user_id,plan,mode,product_id,introductory,created) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id',
            [row.id,user.id,plan,config.environment,config.products[plan],row.introductory,Date.now()]);
        }
        return {orderId:row.id,introductory:row.introductory===1};
      });
      if (order.url) return order;
      const result = await client.checkout.authenticated.create({productId:config.products[plan],currency:'USD',
        buyerIdentity:user.id,buyerEmail:user.email,withTrial:order.introductory,
        orderMerchantExternalId:order.orderId,metadata:{app:'aibunsho',plan,internalOrderId:order.orderId},
        successUrl:`${settings.origin}/?payment=${order.orderId}#account`,expiresInSeconds:3600},
        {idempotencyKey:`${config.merchantId}-aibunsho-${order.orderId}`});
      const url = checkoutURL(result.checkoutUrl);
      const expires = Date.parse(result.expiresAt);
      if (!Number.isFinite(expires)) throw new Error('Invalid checkout expiry');
      await store.query('UPDATE billing_orders SET checkout_url=$1,session_expires=$2 WHERE id=$3 RETURNING id',[url,expires,order.orderId]);
      return {url,orderId:order.orderId};
    },
    async processEvents() {
      const events = await store.query('SELECT * FROM billing_events WHERE processed=0 AND mode=$1 ORDER BY created LIMIT 30',[config.environment]);
      for (const saved of events) {
        const event = JSON.parse(saved.body);
        const ref = event.data?.orderMerchantExternalId || event.data?.orderMetadata?.internalOrderId || '';
        const rows = await store.query('SELECT * FROM billing_orders WHERE mode=$1 AND (id=$2 OR provider_id=$3)',[config.environment,ref,event.data?.orderId||'']);
        // A checkout webhook can arrive before local checkout URL persistence; keep unknown references retryable.
        if (!rows.length) continue;
        for (const row of rows) await service.reconcile(row);
        await store.query('UPDATE billing_events SET processed=1 WHERE id=$1 RETURNING id',[saved.id]);
      }
    },
    async manage(userId) {
      const result = await client.auth.createCustomerPortalLink({storeId:config.storeId,buyerIdentity:userId});
      return {url:checkoutURL(result.portalUrl)};
    },
  };
  return service;
}
