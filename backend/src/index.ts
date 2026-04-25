import 'dotenv/config';
import { createApp } from './app.js';
import { getEnv } from './config/env.js';
import { initPresenceStore } from './services/presence-store.js';

initPresenceStore();

const app = createApp();
const env = getEnv();
const port = env.PORT ?? 3000;

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
