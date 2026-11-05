import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { handleDetection } from './api/detect';
import { createAccountHandler } from './accounts/vercel.mjs';
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const accounts = createAccountHandler(env);
  function mount(server: { middlewares: { use: (handler: (req: import('node:http').IncomingMessage, res: import('node:http').ServerResponse, next: () => void) => void) => void } }) {
    server.middlewares.use((req,res,next) => {
      if (req.url?.split('?')[0] === '/api/detect') { void handleDetection(req,res,env); return; }
      if (req.url?.startsWith('/api/auth/') || req.url?.startsWith('/api/billing/') || req.url?.startsWith('/api/dev/')) { void accounts(req,res); return; }
      next();
    });
  }
  return { appType: 'mpa', plugins: [react(), { name: 'site-api', configureServer: mount, configurePreviewServer: mount }] };
});
