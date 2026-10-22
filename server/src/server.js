const env = require('./config/env');
const connectDB = require('./config/db');
const createApp = require('./app');

async function start() {
  const connection = await connectDB();
  const app = createApp(connection.getClient());

  const server = app.listen(env.port, () => {
    console.log(`[server] API running on http://localhost:${env.port} (${env.nodeEnv})`);
    console.log(`[server] Accepting browser origins: ${env.clientOrigins.join(', ')}`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`[server] Port ${env.port} is already in use.`);
      console.error('[server] On macOS, port 5000 is used by AirPlay Receiver. Set another PORT in server/.env.');
    } else console.error('[server]', err);
    process.exit(1);
  });

  const shutdown = (signal) => {
    console.log(`[server] ${signal} received, shutting down…`);
    server.close(async () => {
      await connection.close();
      process.exit(0);
    });
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

start().catch((err) => {
  console.error('[server] Failed to start:', err);
  process.exit(1);
});
