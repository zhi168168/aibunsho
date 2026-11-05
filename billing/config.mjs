import { createPrivateKey } from 'node:crypto';
export function billingConfig(env) {
  if (!env.WAFFO_MERCHANT_ID || !env.WAFFO_PRIVATE_KEY || !env.WAFFO_STORE_ID || !env.WAFFO_BASIC_PRODUCT_ID || !env.WAFFO_PRO_PRODUCT_ID) return null;
  const environment = { test: 'test', sandbox: 'test', prod: 'prod', production: 'prod' }[env.WAFFO_ENVIRONMENT || 'test'];
  if (!environment) throw new Error('Invalid Waffo environment');
  let privateKey = env.WAFFO_PRIVATE_KEY.replaceAll('\\n', '\n').trim();
  if (!privateKey.includes('BEGIN')) privateKey = createPrivateKey({ key: Buffer.from(privateKey, 'base64'), format: 'der', type: 'pkcs8' }).export({ type: 'pkcs8', format: 'pem' });
  return { merchantId: env.WAFFO_MERCHANT_ID, privateKey, environment, storeId: env.WAFFO_STORE_ID,
    products: { basic: env.WAFFO_BASIC_PRODUCT_ID, pro: env.WAFFO_PRO_PRODUCT_ID } };
}
