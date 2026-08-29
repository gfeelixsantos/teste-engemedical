import { NextResponse } from "next/server";

import { NEST_URL } from "@/config/constants";

export async function GET(
  _request: Request,
  context: { params: Promise<{ requestId: string }> },
) {
  const { requestId } = await context.params;

  if (!requestId) {
    return new NextResponse("requestId ausente.", { status: 400 });
  }

  return NextResponse.redirect(`${NEST_URL}facial/evidencias/${requestId}`);
}
