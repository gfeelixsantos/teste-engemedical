import { NextResponse } from "next/server";
import { NEST_URL } from "@/config/constants";

export const revalidate = 300; // cache por 5 minutos

export async function GET() {
  try {
    const response = await fetch(`${NEST_URL}mural/ativos`, {
      next: { revalidate: 300 },
    });

    if (!response.ok) {
      return NextResponse.json(
        { message: "Erro ao buscar murais ativos" },
        { status: response.status },
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { message: "Erro de conexão com o servidor" },
      { status: 502 },
    );
  }
}
