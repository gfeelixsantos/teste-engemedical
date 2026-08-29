export function resolveWorkerBaseUrl(): string {
  const internalUrl = process.env.WORKER_INTERNAL_BASE_URL?.trim();
  let url = 'http://127.0.0.1:3334';

  if (internalUrl) {
    url = internalUrl;
  } else {
    const prodUrl = (
      process.env.WORKER_BASE_URL_PROD || 'https://cmso360-worker.fly.dev'
    ).trim();

    const lifecycleEvent = (process.env.npm_lifecycle_event || '').toLowerCase();
    const isHosted = !!(
      process.env.DYNO ||
      process.env.FLY_APP_NAME ||
      process.env.RAILWAY_ENVIRONMENT
    );

    if (lifecycleEvent === 'start:dev') url = 'http://127.0.0.1:3334';
    else if (lifecycleEvent === 'start' || lifecycleEvent === 'start:prod') url = prodUrl;
    else if (isHosted) url = prodUrl;
    else if (process.env.NODE_ENV === 'production') url = prodUrl;
  }

  return url.replace(/\/+$/, '');
}
