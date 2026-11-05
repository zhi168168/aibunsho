import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { handleDetection } from './api/detect';
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return { appType: 'mpa', plugins: [react(), { name: 'detection-api', configureServer(server) { server.middlewares.use('/api/detect', (req, res) => { void handleDetection(req, res, env); }); }, configurePreviewServer(server) { server.middlewares.use('/api/detect', (req, res) => { void handleDetection(req, res, env); }); } }] };
});
