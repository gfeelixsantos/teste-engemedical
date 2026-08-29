import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { NEST_URL } from "@/config/constants";
import { JWT } from "@/lib/jwt/jwt";
import { resolveAuthProxyContextFromTokens } from "../../_authContext.mjs";

function isBlobStorageUrl(url: string): boolean {
  return url.includes("blob.core.windows.net");
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const urlParam = req.nextUrl.searchParams.get("url");
    const filenameParam = req.nextUrl.searchParams.get("filename");
    if (!urlParam || !urlParam.trim()) {
      return NextResponse.json(
        { message: "Parâmetro 'url' é obrigatório" },
        { status: 400 },
      );
    }

    const ck = await cookies();
    const authToken = ck.get("auth_token")?.value;
    const refreshToken = ck.get("refresh_token")?.value;
    const { bearerToken, authUser } = await resolveAuthProxyContextFromTokens({
      authToken,
      refreshToken,
      verifyJwt: JWT.verifyJwt,
    });

    const proxyHeaders = new Headers();
    if (bearerToken) {
      proxyHeaders.set("Authorization", `Bearer ${bearerToken}`);
    }
    if (authUser) {
      proxyHeaders.set("x-auth-user", JSON.stringify(authUser));
    }

    const targetUrl = urlParam.trim();

    if (isBlobStorageUrl(targetUrl)) {
      let nestUrl = `${NEST_URL}blob/proxy?url=${encodeURIComponent(targetUrl)}`;
      if (filenameParam) {
        nestUrl += `&filename=${encodeURIComponent(filenameParam)}`;
      }
      const response = await fetch(nestUrl, {
        headers: proxyHeaders,
        signal: AbortSignal.timeout(30000),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        return NextResponse.json(
          { message: text || "Erro ao acessar documento" },
          { status: response.status },
        );
      }

      const contentType =
        response.headers.get("content-type") || "application/octet-stream";
      const contentDisposition =
        response.headers.get("content-disposition") || "inline";

      if (response.body) {
        return new NextResponse(response.body, {
          status: 200,
          headers: {
            "Content-Type": contentType,
            "Content-Disposition": contentDisposition,
            "Cache-Control": "public, max-age=300, immutable",
          },
        });
      }

      const arrayBuffer = await response.arrayBuffer();
      return new NextResponse(arrayBuffer, {
        status: 200,
        headers: {
          "Content-Type": contentType,
          "Content-Disposition": contentDisposition,
          "Content-Length": String(arrayBuffer.byteLength),
          "Cache-Control": "public, max-age=300, immutable",
        },
      });
    }

    const response = await fetch(targetUrl, {
      headers: proxyHeaders,
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      return NextResponse.json(
        { message: text || "Erro ao acessar documento" },
        { status: response.status },
      );
    }

    const contentType =
      response.headers.get("content-type") || "application/octet-stream";
    const contentDisposition =
      response.headers.get("content-disposition") || "inline";

    if (response.body) {
      return new NextResponse(response.body, {
        status: 200,
        headers: {
          "Content-Type": contentType,
          "Content-Disposition": contentDisposition,
          "Cache-Control": "public, max-age=300, immutable",
        },
      });
    }

    const arrayBuffer = await response.arrayBuffer();
    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": contentDisposition,
        "Content-Length": String(arrayBuffer.byteLength),
        "Cache-Control": "public, max-age=300, immutable",
      },
    });
  } catch (error) {
    console.error("[BFF:blob:proxy]", error);
    return NextResponse.json(
      { message: "Falha ao acessar documento." },
      { status: 500 },
    );
  }
}
