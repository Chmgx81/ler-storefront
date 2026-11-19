// The Hono app is bundled by `npm run build` so this function has no local TS imports.
import { app } from '../dist-server/api-function.js';

export default {
  fetch(request: Request) {
    return app.fetch(request);
  },
};
