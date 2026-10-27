import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Local development helper: serves the /api/*.js serverless handlers from the
 * Vite dev server so `npm run dev` is all you need (no `vercel dev` required).
 * On Vercel, the same files run as real serverless functions.
 */
function localApi(env) {
  return {
    name: 'learnsphere-local-api',
    configureServer(server) {
      // Make .env values (including server-only ones) visible to the handlers.
      for (const [key, value] of Object.entries(env)) {
        if (process.env[key] === undefined) process.env[key] = value;
      }
      server.middlewares.use(async (req, res, next) => {
        const match = /^\/api\/([a-z]+)$/.exec(new URL(req.url, 'http://localhost').pathname);
        if (!match) return next();

        let raw = '';
        for await (const chunk of req) raw += chunk;
        try {
          req.body = raw ? JSON.parse(raw) : {};
        } catch {
          req.body = {};
        }
        res.status = (code) => {
          res.statusCode = code;
          return res;
        };
        res.json = (payload) => {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(payload));
          return res;
        };

        let mod;
        try {
          mod = await server.ssrLoadModule(`/api/${match[1]}.js`);
        } catch {
          return res.status(404).json({ ok: false, error: { code: 'not_found', message: 'Unknown API endpoint.' } });
        }
        try {
          await mod.default(req, res);
        } catch (err) {
          console.error('[local api]', err);
          res.status(500).json({ ok: false, error: { code: 'internal_error', message: 'Something went wrong on the server.' } });
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react(), localApi(env)],
    build: { chunkSizeWarningLimit: 900 },
  };
});
