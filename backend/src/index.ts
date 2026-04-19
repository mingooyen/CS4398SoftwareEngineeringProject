import { createApp } from './app.js';
import { getEnv } from './config/env.js';

const app = createApp();
const env = getEnv();
const port = env.PORT ?? 3000;

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
