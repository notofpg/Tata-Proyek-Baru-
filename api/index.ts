import type { IncomingMessage, ServerResponse } from 'http';

let loadedApp: any = null;

try {
  const serverModule = await import('./_server.cjs');
  loadedApp = serverModule.default ?? serverModule;
} catch (error) {
  console.warn('[Tata Vercel] Server bundle not ready yet. This is expected during build, but the function will return a clear error until npm run build generates api/_server.cjs.', error);
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (!loadedApp) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({
      error: 'Tata server bundle is not available yet. Run `npm run build` to generate api/_server.cjs before deployment.'
    }));
    return;
  }

  const app = loadedApp.default ?? loadedApp;

  if (typeof app === 'function') {
    return app(req, res);
  }

  if (app && typeof app.handle === 'function') {
    return app.handle(req, res);
  }

  res.statusCode = 500;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify({
    error: 'Tata server export is invalid for Vercel runtime.'
  }));
}
