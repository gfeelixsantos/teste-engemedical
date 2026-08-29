export type BackendRuntimeMode = 'prod' | 'dev';

function getLifecycleEvent(): string {
  return String(process.env.npm_lifecycle_event || '')
    .trim()
    .toLowerCase();
}

function isHostedRuntime(): boolean {
  return (
    !!process.env.DYNO ||
    !!process.env.FLY_APP_NAME ||
    !!process.env.RAILWAY_ENVIRONMENT
  );
}

export function resolveBackendRuntimeMode(): BackendRuntimeMode {
  const explicitMode = String(process.env.BACKEND_INTERNAL_BASE_URL_MODE || '')
    .trim()
    .toLowerCase();

  if (explicitMode === 'prod' || explicitMode === 'production') {
    return 'prod';
  }

  if (explicitMode === 'dev' || explicitMode === 'development') {
    return 'dev';
  }

  const lifecycleEvent = getLifecycleEvent();

  if (lifecycleEvent === 'start:dev') {
    return 'dev';
  }

  if (lifecycleEvent === 'start' || lifecycleEvent === 'start:prod') {
    return 'prod';
  }

  return isHostedRuntime() ? 'prod' : 'dev';
}

export function resolveBackendBaseUrl(): string {
  const explicitUrl = String(
    process.env.BACKEND_INTERNAL_BASE_URL || '',
  ).trim();
  const prodUrl = String(
    process.env.BACKEND_INTERNAL_BASE_URL_PROD || '',
  ).trim();
  const devUrl = String(process.env.BACKEND_INTERNAL_BASE_URL_DEV || '').trim();

  const resolved =
    explicitUrl ||
    (resolveBackendRuntimeMode() === 'prod'
      ? prodUrl || devUrl
      : devUrl || prodUrl);

  return resolved.replace(/\/+$/, '');
}
