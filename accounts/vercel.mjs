import { getRuntime } from './runtime.mjs';
import { capabilities } from './http.mjs';
export function createAccountHandler(env = process.env) {
  return async (req,res) => {
    res.setHeader('Cache-Control','no-store');
    try {
      const runtime = await getRuntime(env);
      if (runtime) return runtime.app(req,res);
      res.setHeader('Content-Type','application/json');
      if (req.url.split('?')[0] === '/api/auth/config') return res.end(JSON.stringify(capabilities(null)));
      res.statusCode=503;res.end(JSON.stringify({message:'現在アカウントサービスをご利用いただけません。時間をおいて再度お試しください。'}));
    } catch {
      res.statusCode=503;res.setHeader('Content-Type','application/json');res.end(JSON.stringify({message:'アカウントサービスに接続できません。'}));
    }
  };
}
export default createAccountHandler();
