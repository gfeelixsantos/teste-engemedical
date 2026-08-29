import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { JWT } from "@/lib/jwt/jwt";
import { BlobExplorerService } from "@/lib/blob/blob-explorer.service";
import { resolveAuthProxyContextFromTokens } from "../../_authContext.mjs";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SasUrlResponse {
  sasUrl: string;
  expiresAt: string; // ISO 8601, now + 60 min
}

// ---------------------------------------------------------------------------
// Auth helper
// ---------------------------------------------------------------------------

async function resolveAuthContext(): Promise<{
  bearerToken?: string;
  authUser?: Record<string, unknown>;
}> {
  const ck = await cookies();
  const authToken = ck.get("auth_token")?.value;
  const refreshToken = ck.get("refresh_token")?.value;

  return resolveAuthProxyContextFromTokens({
    authToken,
    refreshToken,
    verifyJwt: JWT.verifyJwt,
  });
}

// ---------------------------------------------------------------------------
// GET /api/blob-explorer/sas
// ---------------------------------------------------------------------------

/**
 * Generates a SAS URL for a blob, valid for 60 minutes.
 *
 * Query params:
 *   blobName  (string, required) — full blob path within the container
 *   container (string, optional) — container name; defaults to "documents"
 *
 * Responses:
 *   200 { sasUrl, expiresAt }
 *   400 { message } — blobName missing
 *   401 { message } — not authenticated
 *   500 { message } — Azure error
 */
export async function GET(request: Request): Promise<NextResponse> {
  // 1. Authentication check
  const { bearerToken, authUser } = await resolveAuthContext();

  if (!bearerToken || !authUser) {
    return NextResponse.json(
      { message: "Não autenticado." },
      { status: 401 },
    );
  }

  // 2. Parameter validation
  const { searchParams } = new URL(request.url);
  const blobName = searchParams.get("blobName");
  const container = searchParams.get("container") ?? undefined;

  if (!blobName) {
    return NextResponse.json(
      { message: "O parâmetro 'blobName' é obrigatório." },
      { status: 400 },
    );
  }

  // 3. Generate SAS URL
  try {
    const sasUrl = BlobExplorerService.generateSasUrl(blobName, container);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    const body: SasUrlResponse = { sasUrl, expiresAt };

    return NextResponse.json(body, { status: 200 });
  } catch (error) {
    console.error("[BFF:blob-explorer/sas]", error);

    return NextResponse.json(
      { message: "Erro ao acessar o armazenamento." },
      { status: 500 },
    );
  }
}
