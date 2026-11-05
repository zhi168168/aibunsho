import { loadEnv } from 'vite';
import { WaffoPancake } from '@waffo/pancake-ts';
import { billingConfig } from './config.mjs';
import { plans } from './plans.mjs';
import { writeFile } from 'node:fs/promises';

const env={...loadEnv('development',process.cwd(),''),...process.env};
const specifications=Object.entries(plans).map(([id,plan])=>({
  storeId:env.WAFFO_STORE_ID,name:`AIチェッカー — ${plan.name}`,billingPeriod:'monthly',
  prices:{USD:{amount:plan.amount,trialAmount:plan.firstAmount,taxCategory:'saas'}},
  metadata:{app:'aibunsho',plan:id,trialDays:30,monthlyWords:plan.words},
  description:`Complete Japanese writing reports. ${plan.words} words per billing period. First 30 days $${plan.firstAmount}, then $${plan.amount}/month. Automatically renews until canceled.`,
}));
if (!process.argv.includes('--create-test-products')) {
  console.log(JSON.stringify({mode:'dry-run',products:specifications},null,2));
} else {
  const config=billingConfig({...env,WAFFO_BASIC_PRODUCT_ID:'setup',WAFFO_PRO_PRODUCT_ID:'setup'});
  if(!config || config.environment!=='test') throw new Error('Configure an independent store and test merchant credentials; this script never publishes live products.');
  const client=new WaffoPancake(config);
  const ids=[];
  for(const [i,spec] of specifications.entries()) {
    const {product}=await client.subscriptionProducts.create(spec,{idempotencyKey:`${config.merchantId}-aibunsho-${Object.keys(plans)[i]}-monthly-v1`});
    ids.push(product.id);
  }
  const {group}=await client.subscriptionProductGroups.create({storeId:config.storeId,name:'AIチェッカー monthly plans',productIds:ids,
    rules:{sharedTrial:true,selfServicePlanChange:false}},{idempotencyKey:`${config.merchantId}-aibunsho-monthly-group-v1`});
  await writeFile('.env.billing.generated',`WAFFO_BASIC_PRODUCT_ID=${ids[0]}\nWAFFO_PRO_PRODUCT_ID=${ids[1]}\nWAFFO_PRODUCT_GROUP_ID=${group.id}\n`,{mode:0o600});
  console.log('Test products created. Public product references saved to .env.billing.generated. Configure webhook and validate paid trial/renewal before production publication.');
}
