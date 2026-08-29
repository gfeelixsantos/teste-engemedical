export type BackendRuntimeMode = "prod" | "dev";

function isHostedRuntime(): boolean {
  return (
    !!process.env.DYNO ||
    !!process.env.FLY_ALLOC_ID ||
    (!!process.env.RAILWAY_ENVIRONMENT && !!process.env.RAILWAY_PROJECT_ID)
  );
}

function getLifecycleEvent(): string {
  return String(process.env.npm_lifecycle_event || "").trim().toLowerCase();
}

export function resolveBackendRuntimeMode(): BackendRuntimeMode {
  const explicitMode = String(process.env.BACKEND_INTERNAL_BASE_URL_MODE || "")
    .trim()
    .toLowerCase();

  if (explicitMode === "prod" || explicitMode === "production") {
    return "prod";
  }

  if (explicitMode === "dev" || explicitMode === "development") {
    return "dev";
  }

  const lifecycleEvent = getLifecycleEvent();

  if (lifecycleEvent === "dev") {
    return "dev";
  }

  if (lifecycleEvent === "start") {
    return "prod";
  }

  return isHostedRuntime() ? "prod" : "dev";
}

export function resolveBackendBaseUrl(): {
  baseURL: string;
  environmentLabel: "DEV" | "PROD";
} {
  const explicitUrl = String(process.env.BACKEND_INTERNAL_BASE_URL || "").trim();
  const prodUrl = String(process.env.BACKEND_INTERNAL_BASE_URL_PROD || "").trim();
  const devUrl = String(process.env.BACKEND_INTERNAL_BASE_URL_DEV || "").trim();

  const runtimeMode = resolveBackendRuntimeMode();
  const resolvedUrl =
    explicitUrl || (runtimeMode === "prod" ? prodUrl || devUrl : devUrl || prodUrl);

  if (!resolvedUrl) {
    throw new Error("Nao foi possivel resolver a URL do backend.");
  }

  return {
    baseURL: resolvedUrl.replace(/\/+$/, ""),
    environmentLabel: runtimeMode === "prod" ? "PROD" : "DEV",
  };
}
