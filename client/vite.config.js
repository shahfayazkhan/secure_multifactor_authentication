import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';

/** Read only PORT from server/.env (loadEnv would also leak its NODE_ENV into the build). */
function readServerPort() {
  try {
    const raw = fs.readFileSync(path.resolve(__dirname, '../server/.env'), 'utf8');
    const m = raw.match(/^\s*PORT\s*=\s*["']?(\d+)/m);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}

// The dev server proxies /api to Express so the session cookie is first-party.
// The API port is read from server/.env (PORT) so the two can never drift apart.
// Override with VITE_API_TARGET=http://host:port if the API runs elsewhere.
export default defineConfig(({ mode }) => {
  const clientEnv = loadEnv(mode, process.cwd(), 'VITE_');
  const target =
    process.env.VITE_API_TARGET ||
    clientEnv.VITE_API_TARGET ||
    `http://localhost:${readServerPort() || 5050}`;

  console.log(`\n  ➜  API proxy: /api → ${target}\n`);

  return {
    plugins: [react()],
    server: {
      port: 5173,
      strictPort: true, // CLIENT_ORIGIN in server/.env expects this exact port
      proxy: {
        '/api': {
          target,
          changeOrigin: false,
          configure: (proxy) => {
            proxy.on('error', (err, req, res) => {
              console.error(`[proxy] ${req.method} ${req.url} → ${target} failed: ${err.code || err.message}`);
              if (!res.headersSent) {
                res.writeHead(502, { 'Content-Type': 'application/json' });
              }
              res.end(
                JSON.stringify({
                  error: {
                    code: 'API_UNREACHABLE',
                    message: `Can't reach the API at ${target}. Is the server running (npm run dev:server)?`,
                  },
                })
              );
            });
          },
        },
      },
    },
  };
});
