import { env } from './config/env';
import { connectDB } from './config/db';
import { createApp } from './app';

async function main() {
  await connectDB();
  const app = createApp();

  app.listen(env.PORT, () => {
    console.log(`[Server] listening on http://localhost:${env.PORT}`);
    console.log(`[Server] CORS origin: ${env.CLIENT_URL}`);
  });
}

main().catch((err) => {
  console.error('Fatal startup error', err);
  process.exit(1);
});

