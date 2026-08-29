import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { JWT } from "@/lib/jwt/jwt";
import {
  BlobExplorerService,
  type BlobItem,
} from "@/lib/blob/blob-explorer.service";
import { handleBlobExplorerList } from "./handler.mjs";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ListBlobsResponse {
  blobs: BlobItem[];
  prefix: string;
  container: string;
}

// ---------------------------------------------------------------------------
// GET /api/blob-explorer/list
// ---------------------------------------------------------------------------

export async function GET(req: Request): Promise<NextResponse> {
  try {
    // --- Authentication ---
    const ck = await cookies();
    const authToken = ck.get("auth_token")?.value;

    if (!authToken) {
      return NextResponse.json(
        { message: "Não autenticado." },
        { status: 401 },
      );
    }

    const payload = await JWT.verifyJwt(authToken);

    if (!payload) {
      return NextResponse.json(
        { message: "Não autenticado." },
        { status: 401 },
      );
    }

    // --- Query params ---
    const { searchParams } = new URL(req.url);
    const codigoEmpresa = searchParams.get("codigoEmpresa") ?? "";
    const ano = searchParams.get("ano") ?? "";
    const mes = searchParams.get("mes") ?? "";
    const prefix = searchParams.get("prefix") ?? "";
    const container = searchParams.get("container") ?? "documents";

    if (codigoEmpresa || ano || mes) {
      const response = await handleBlobExplorerList({
        ano,
        mes,
        codigoEmpresa,
        container,
        listBlobs: BlobExplorerService.listBlobs,
      });

      return new NextResponse(response.body, {
        status: response.status,
        headers: { "Content-Type": "application/json" },
      });
    }

    const blobs = await BlobExplorerService.listBlobs(prefix, container);

    const body: ListBlobsResponse = {
      blobs,
      prefix,
      container,
    };

    return NextResponse.json(body, { status: 200 });
  } catch (error) {
    console.error("[BFF:blob-explorer/list]", error);

    return NextResponse.json(
      { message: "Erro ao acessar o armazenamento." },
      { status: 500 },
    );
  }
}
