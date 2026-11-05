import express from 'express';
import { accountConfig } from './config.mjs';
import { createAccounts } from './auth.mjs';
import { mountAccounts } from './http.mjs';
import { createBilling } from '../billing/service.mjs';
import { mountBilling } from '../billing/http.mjs';
const runtimes = new WeakMap();
export async function getRuntime(env = process.env) {
  if (!runtimes.has(env)) {
    const pending = (async () => {
      const config = accountConfig(env);
      if (!config) return null;
      if (env.VERCEL && config.local) throw new Error('Local authentication is forbidden on Vercel');
      const accounts = await createAccounts(config);
      try {
        await accounts.auth.$context;
        const billing = createBilling(accounts,config,env);
        if (config.local && billing) await billing.store.migrate();
        const app = express();
        mountAccounts(app,config,accounts,{vercel:env.VERCEL==='1'});
        mountBilling(app,accounts,config,billing);
        return {app,accounts,billing,config};
      } catch(e) { await accounts.close(); throw e; }
    })().catch(e => {runtimes.delete(env);throw e;});
    runtimes.set(env,pending);
  }
  return runtimes.get(env);
}
