import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import archiver from "archiver";
import { PassThrough } from "stream";

import { JWT } from "@/lib/jwt/jwt";
import { BlobExplorerService } from "@/lib/blob/blob-explorer.service";
import { resolveAuthProxyContextFromTokens } from "../../_authContext.mjs";

// ---------------------------------------------------------------------------
// Auth helper (same pattern as /sas route)
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
// POST /api/blob-explorer/download-zip
// ---------------------------------------------------------------------------

/**
 * Downloads multiple blobs and returns them as a ZIP archive.
 *
 * Body (JSON):
 *   blobNames  (string[], required) — list of blob paths to include in the ZIP
 *   container  (string, optional)   — container name; defaults to "documents"
 *
 * Responses:
 *   200  application/zip  — ZIP archive containing all successfully downloaded blobs
 *   400  { message }      — blobNames missing or empty
 *   401  { message }      — not authenticated
 *   500  { message }      — unexpected server error
 */
export async function POST(request: Request): Promise<Response> {
  // 1. Authentication check
  const { bearerToken, authUser } = await resolveAuthContext();

  if (!bearerToken || !authUser) {
    return NextResponse.json(
      { message: "Não autenticado." },
      { status: 401 },
    );
  }

  // 2. Parse and validate request body
  let blobNames: string[];
  let container: string | undefined;

  try {
    const body = await request.json();
    blobNames = body?.blobNames;
    container = body?.container ?? undefined;
  } catch {
    return NextResponse.json(
      { message: "Corpo da requisição inválido." },
      { status: 400 },
    );
  }

  if (!Array.isArray(blobNames) || blobNames.length === 0) {
    return NextResponse.json(
      { message: "O campo 'blobNames' é obrigatório e não pode ser vazio." },
      { status: 400 },
    );
  }

  // 3. Download each blob and build ZIP
  try {
    // Collect all buffers first (individual failures are logged and skipped)
    const entries: Array<{ name: string; buffer: Buffer }> = [];

    await Promise.all(
      blobNames.map(async (blobName) => {
        try {
          const buffer = await BlobExplorerService.downloadBlob(
            blobName,
            container,
          );
          // Use only the filename portion as the entry name inside the ZIP
          const entryName = blobName.split("/").pop() ?? blobName;
          entries.push({ name: entryName, buffer });
        } catch (err) {
          console.error(
            `[BFF:blob-explorer/download-zip] Failed to download blob "${blobName}":`,
            err,
          );
          // Individual failure: skip this blob, continue with the rest
        }
      }),
    );

    // 4. Compress all successfully downloaded buffers into a ZIP stream
    const passThrough = new PassThrough();
    const archive = archiver("zip", { zlib: { level: 6 } });

    archive.on("error", (err) => {
      console.error("[BFF:blob-explorer/download-zip] Archiver error:", err);
      passThrough.destroy(err);
    });

    archive.pipe(passThrough);

    for (const { name, buffer } of entries) {
      archive.append(buffer, { name });
    }

    archive.finalize();

    // Collect the ZIP into a single Buffer so we can return it via NextResponse
    const chunks: Uint8Array[] = [];

    await new Promise<void>((resolve, reject) => {
      passThrough.on("data", (chunk: Uint8Array) => chunks.push(chunk));
      passThrough.on("end", resolve);
      passThrough.on("error", reject);
    });

    const zipBuffer = Buffer.concat(chunks);

    // 5. Return ZIP with appropriate headers
    return new Response(zipBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": 'attachment; filename="download.zip"',
        "Content-Length": String(zipBuffer.byteLength),
      },
    });
  } catch (error) {
    console.error("[BFF:blob-explorer/download-zip]", error);

    return NextResponse.json(
      { message: "Erro ao gerar o arquivo ZIP." },
      { status: 500 },
    );
  }
}
