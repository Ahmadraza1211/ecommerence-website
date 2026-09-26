import { env } from './config/env';
import { connectDB } from './config/db';
import app from './app';

async function main() {
  await connectDB();

  app.listen(env.PORT, () => {
    console.log(`[Server] listening on http://localhost:${env.PORT}`);
    console.log(`[Server] CORS origin: ${env.CLIENT_URL}`);
  });
}

main().catch((err) => {
  console.error('Fatal startup error', err);
  process.exit(1);
});

